using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    public class WalletService : IWalletService
    {
        public const decimal MaxTopUp = 10_000m;
        private const decimal DefaultTeacherSharePercent = 70m;
        public static readonly TimeSpan RefundWindow = TimeSpan.FromDays(7);

        private readonly AppDbContext _context;
        private readonly IEnrollmentService _enrollmentService;

        public WalletService(AppDbContext context, IEnrollmentService enrollmentService)
        {
            _context = context;
            _enrollmentService = enrollmentService;
        }

        public async Task<IEnumerable<WalletTransaction>> GetTransactionsAsync(int userId, int take = 100)
        {
            // AsNoTracking: izlenen User'a bağlanıp parola hash'iyle birlikte JSON'a girmesin
            return await _context.WalletTransactions
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Take(take)
                .ToListAsync();
        }

        // reference: tekrar anahtarı (bkz. WalletTransaction.Reference). Aynı anahtar ikinci kez gelirse bakiye değişmez.
        public async Task<decimal> TopUpAsync(int userId, decimal amount, string? reference = null)
        {
            if (amount <= 0 || amount > MaxTopUp || decimal.Round(amount, 2) != amount)
                throw new ArgumentException($"Yükleme tutarı 0 ile {MaxTopUp:N0} TL arasında, en fazla 2 ondalıklı olmalı.");

            if (reference == null || !await _context.WalletTransactions.AnyAsync(t => t.UserId == userId && t.Reference == reference))
            {
                await using var tx = await _context.Database.BeginTransactionAsync();
                await _context.Users.Where(u => u.Id == userId)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.Balance, u => u.Balance + amount));
                var entry = new WalletTransaction { UserId = userId, Amount = amount, Type = "TopUp", Description = "Bakiye yükleme", Reference = reference };
                _context.WalletTransactions.Add(entry);
                try
                {
                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                }
                catch (DbUpdateException) when (reference != null)
                {
                    // aynı anahtarla eşzamanlı ikinci istek: benzersiz indeks reddetti, bakiye artışı geri alınır
                    await tx.RollbackAsync();
                    _context.Entry(entry).State = EntityState.Detached;
                }
            }

            return await _context.Users.Where(u => u.Id == userId).Select(u => u.Balance).FirstAsync();
        }

        public async Task<decimal> PurchaseCourseAsync(User buyer, int courseId)
        {
            var course = await _context.Courses.Include(c => c.Teacher).FirstOrDefaultAsync(c => c.Id == courseId)
                ?? throw new ArgumentException("Kurs bulunamadı.");
            if (course.Price <= 0)
                throw new ArgumentException("Bu kurs ücretsiz; doğrudan katılabilirsiniz.");
            if (course.Teacher?.UserId == buyer.Id)
                throw new ArgumentException("Kendi kursunuzu satın alamazsınız.");
            // satın alınmış veya bitirilmiş kurs tekrar satın alınmaz; ücretsiz yeniden katılım açık
            if (await OwnsCourseAsync(buyer.Id, courseId))
                throw new ArgumentException("Bu kursa zaten sahipsiniz. Kurs sayfasından ücretsiz olarak tekrar katılabilirsiniz.");

            var student = await _enrollmentService.GetOrCreateStudentForUserAsync(buyer)
                ?? throw new ArgumentException("Katılımcı profili bulunamadı.");
            // kayıt varken ödeme alınmaz (ör. ücretsizken katılınmış, sonra ücretlendirilmiş kurs)
            if (await _context.Enrollments.AnyAsync(e => e.StudentId == student.Id && e.CourseId == courseId))
                throw new ArgumentException("Bu kursa zaten kayıtlısınız.");

            var sharePercent = DefaultTeacherSharePercent;
            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == "TEACHER_SHARE_PERCENT");
            if (setting != null && decimal.TryParse(setting.SettingValue, out var parsed) && parsed >= 0 && parsed <= 100)
                sharePercent = parsed;
            var teacherShare = decimal.Round(course.Price * sharePercent / 100m, 2);

            await using var tx = await _context.Database.BeginTransactionAsync();

            // Atomik düşüm: bakiye yetersizse hiçbir satır güncellenmez (eşzamanlı isteklerde eksiye düşmez)
            var debited = await _context.Users
                .Where(u => u.Id == buyer.Id && u.Balance >= course.Price)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.Balance, u => u.Balance - course.Price));
            if (debited == 0)
                throw new ArgumentException("Yetersiz bakiye. Lütfen cüzdanınıza bakiye yükleyin.");

            // Kapasite ve mükerrer kayıt kontrolleri EnrollStudentAsync içinde; hata fırlarsa işlem geri alınır
            await _enrollmentService.EnrollStudentAsync(student.Id, courseId);

            var purchase = new WalletTransaction
            {
                UserId = buyer.Id, Amount = -course.Price, Type = "Purchase", CourseId = courseId, Description = course.Title
            };
            _context.WalletTransactions.Add(purchase);
            await _context.SaveChangesAsync();

            var teacherUserId = course.Teacher?.UserId;
            if (teacherUserId != null && teacherShare > 0)
            {
                await _context.Users.Where(u => u.Id == teacherUserId)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.Balance, u => u.Balance + teacherShare));
                _context.WalletTransactions.Add(new WalletTransaction
                {
                    UserId = teacherUserId.Value, Amount = teacherShare, Type = "Earning", CourseId = courseId,
                    Description = course.Title, RelatedTransactionId = purchase.Id
                });
            }

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return await _context.Users.Where(u => u.Id == buyer.Id).Select(u => u.Balance).FirstAsync();
        }

        // İade: son satın alma 7 gün içindeyse (kurs bitirilmiş olsa da) ücret öğrenciye döner, öğretmen payı geri alınır,
        // kayıt silinir. Bitirme kaydı (CourseCompletion) ve rozetler kalır; kurs başına yalnızca bir iade yapılır.
        public async Task<decimal> RefundCourseAsync(User buyer, int courseId)
        {
            var purchase = await _context.WalletTransactions
                .Where(t => t.UserId == buyer.Id && t.CourseId == courseId && t.Type == "Purchase")
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();
            if (purchase == null || !await HasActivePurchaseAsync(buyer.Id, courseId))
                throw new ArgumentException("Bu kurs için iade edilebilir bir satın alma yok.");
            if (DateTime.UtcNow - purchase.CreatedAt > RefundWindow)
                throw new ArgumentException($"İade süresi ({RefundWindow.TotalDays:0} gün) doldu.");
            // al-izle-iade döngüsünü kapatır: iade edilmiş bir kursu yeniden alan öğrenci ikinci kez iade edemez
            if (await RefundedCourseIdsQuery(buyer.Id).ContainsAsync(courseId))
                throw new ArgumentException("Bu kurs daha önce iade edildi; ikinci kez iade edilemez.");

            var earning = await _context.WalletTransactions
                .FirstOrDefaultAsync(t => t.Type == "Earning" && t.RelatedTransactionId == purchase.Id);
            var refundAmount = -purchase.Amount;

            await using var tx = await _context.Database.BeginTransactionAsync();

            await _context.Users.Where(u => u.Id == buyer.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.Balance, u => u.Balance + refundAmount));
            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = buyer.Id, Amount = refundAmount, Type = "Refund", CourseId = courseId,
                Description = purchase.Description, RelatedTransactionId = purchase.Id
            });

            if (earning != null)
            {
                // Öğretmen bakiyesi bu yüzden eksiye düşebilir; sonraki kazançlardan mahsup edilir
                await _context.Users.Where(u => u.Id == earning.UserId)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.Balance, u => u.Balance - earning.Amount));
                _context.WalletTransactions.Add(new WalletTransaction
                {
                    UserId = earning.UserId, Amount = -earning.Amount, Type = "EarningReversal", CourseId = courseId,
                    Description = purchase.Description, RelatedTransactionId = purchase.Id
                });
            }

            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == buyer.Id);
            if (student != null)
            {
                var enrollment = await _context.Enrollments.FirstOrDefaultAsync(e => e.StudentId == student.Id && e.CourseId == courseId);
                if (enrollment != null)
                {
                    enrollment.IsDeleted = true;
                    enrollment.DeletedAt = DateTime.UtcNow;
                }
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // aynı satın alma için eşzamanlı ikinci iade: benzersiz indeks reddetti, işlem geri alınır
                throw new ArgumentException("Bu kurs için iade edilebilir bir satın alma yok.");
            }
            await tx.CommitAsync();

            return await _context.Users.Where(u => u.Id == buyer.Id).Select(u => u.Balance).FirstAsync();
        }

        // İade edilmemiş satın alma var mı (satın alma sayısı iade sayısından fazla)
        public async Task<bool> HasActivePurchaseAsync(int userId, int courseId) =>
            (await GetActivePurchaseCourseIdsAsync(userId)).Contains(courseId);

        // Sahip olunan kurslar: iade edilmemiş satın almalar ve bitirilmiş kurslar. Bunlara tekrar ücretsiz katılınır,
        // bir daha satın alınamaz. Bitirilip iade edilen kursun parası döndüğü için sahipliği de biter (yeniden alınır).
        // Arayüz aynı listeyi /api/wallet/me'den alır.
        public async Task<List<int>> GetOwnedCourseIdsAsync(int userId)
        {
            var active = await GetActivePurchaseCourseIdsAsync(userId);
            var refunded = await RefundedCourseIdsQuery(userId).ToListAsync();
            return active.Union((await CompletedCourseIdsAsync(userId)).Except(refunded)).ToList();
        }

        public async Task<bool> OwnsCourseAsync(int userId, int courseId) =>
            (await GetOwnedCourseIdsAsync(userId)).Contains(courseId);

        // İade süresi içindeki, iade edilmemiş satın almalar; daha önce iade edilmiş kurs hariç (RefundCourseAsync'in kuralları)
        public async Task<List<int>> GetRefundableCourseIdsAsync(int userId) =>
            (await GetActivePurchasesAsync(userId))
                .Where(p => p.Refundable).Select(p => p.CourseId).ToList();

        // İade edilmemiş satın almalar: son satın alma anı, iade son günü ve iade edilebilir mi (arayüz nedenini gösterir)
        public async Task<List<ActivePurchase>> GetActivePurchasesAsync(int userId)
        {
            var active = await GetActivePurchaseCourseIdsAsync(userId);
            var refunded = await RefundedCourseIdsQuery(userId).ToListAsync();
            var latest = await _context.WalletTransactions
                .Where(t => t.UserId == userId && t.Type == "Purchase" && t.CourseId != null && active.Contains(t.CourseId.Value))
                .GroupBy(t => t.CourseId!.Value)
                .Select(g => new { CourseId = g.Key, At = g.Max(t => t.CreatedAt), Title = g.Max(t => t.Description) })
                .ToListAsync();
            var now = DateTime.UtcNow;
            return latest.Select(p => new ActivePurchase(p.CourseId, p.Title ?? "", p.At, p.At + RefundWindow,
                now - p.At <= RefundWindow && !refunded.Contains(p.CourseId), refunded.Contains(p.CourseId))).ToList();
        }

        private IQueryable<int> RefundedCourseIdsQuery(int userId) => _context.WalletTransactions
            .Where(t => t.UserId == userId && t.Type == "Refund" && t.CourseId != null)
            .Select(t => t.CourseId!.Value).Distinct();

        private async Task<List<int>> CompletedCourseIdsAsync(int userId)
        {
            var studentId = await _context.Students.Where(s => s.UserId == userId).Select(s => (int?)s.Id).FirstOrDefaultAsync();
            return studentId == null ? new() : await _enrollmentService.GetCompletedCourseIdsAsync(studentId.Value);
        }

        public async Task<List<int>> GetActivePurchaseCourseIdsAsync(int userId)
        {
            var counts = await _context.WalletTransactions
                .Where(t => t.UserId == userId && t.CourseId != null && (t.Type == "Purchase" || t.Type == "Refund"))
                .GroupBy(t => t.CourseId!.Value)
                .Select(g => new { CourseId = g.Key, Purchases = g.Count(t => t.Type == "Purchase"), Refunds = g.Count(t => t.Type == "Refund") })
                .ToListAsync();
            return counts.Where(c => c.Purchases > c.Refunds).Select(c => c.CourseId).ToList();
        }
    }

    public record ActivePurchase(int CourseId, string Title, DateTime PurchasedAt, DateTime RefundableUntil, bool Refundable, bool RefundedBefore);
}
