using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    public class TeacherService : ITeacherService
    {
        private readonly AppDbContext _context;

        public TeacherService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Teacher>> GetAllTeachersAsync()
        {
            return await _context.Teachers.AsNoTracking().ToListAsync();
        }

        public async Task<Teacher?> GetTeacherByIdAsync(int id)
        {
            return await _context.Teachers.FindAsync(id);
        }

        public async Task AddTeacherAsync(Teacher teacher)
        {
            await _context.Teachers.AddAsync(teacher);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> UpdateTeacherAsync(int id, Teacher updatedTeacher)
        {
            var teacher = await _context.Teachers.FindAsync(id);
            if (teacher == null)
            {
                return false;
            }

            teacher.FirstName = updatedTeacher.FirstName;
            teacher.LastName = updatedTeacher.LastName;
            teacher.Email = updatedTeacher.Email;
            teacher.Branch = updatedTeacher.Branch;
            teacher.AboutMe = updatedTeacher.AboutMe;
            teacher.ProfilePictureUrl = updatedTeacher.ProfilePictureUrl;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task DeleteTeacherAsync(int id)
        {
            // Teacher kaydı hard-delete değil, soft-delete yapılıyor: satır DB'de kalır,
            // sadece IsDeleted=true işaretlenir.
            var teacher = await _context.Teachers.FindAsync(id);
            if (teacher != null)
            {
                teacher.IsDeleted = true;
                teacher.DeletedAt = DateTime.UtcNow;

                // Bağlı giriş hesabı kapatılır (AccountRetirement): kullanıcı adı boşa çıkar, cüzdan geçmişi kalır.
                if (teacher.UserId.HasValue)
                {
                    var user = await _context.Users.FindAsync(teacher.UserId.Value);
                    if (user != null)
                    {
                        teacher.UserId = null;
                        // aynı hesaba bağlı kalmış bir öğrenci profili (ör. eğitmenliğe geçmiş öğrenci) silmeyi engellemesin
                        foreach (var s in await _context.Students.IgnoreQueryFilters().Where(s => s.UserId == user.Id).ToListAsync())
                            s.UserId = null;
                        await AccountRetirement.RetireAsync(_context, user);
                    }
                }

                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Teacher>> GetDeletedTeachersAsync()
        {
            return await _context.Teachers
                .IgnoreQueryFilters()
                .Where(t => t.IsDeleted)
                .ToListAsync();
        }

        // --- Branş değişikliği: öğretmen talep eder, yönetici onaylar ---

        public async Task<BranchRequestView?> GetLatestBranchRequestAsync(int teacherId) =>
            await View(_context.BranchChangeRequests.Where(r => r.TeacherId == teacherId)
                .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)).FirstOrDefaultAsync();

        public async Task<List<BranchRequestView>> GetBranchRequestsAsync(bool pendingOnly) =>
            await View(_context.BranchChangeRequests.Where(r => !pendingOnly || r.Status == BranchRequestStatus.Pending)
                .OrderBy(r => r.Status == BranchRequestStatus.Pending ? 0 : 1).ThenByDescending(r => r.CreatedAt)
                .Take(200)).ToListAsync();

        public async Task<BranchRequestView> RequestBranchChangeAsync(int teacherId, string? requested)
        {
            var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.Id == teacherId)
                ?? throw new KeyNotFoundException("Öğretmen bulunamadı.");
            var branch = await NormalizeBranchesAsync(requested);
            if (SameBranches(branch, teacher.Branch))
                throw new InvalidOperationException("Seçtiğiniz branşlar zaten mevcut branşlarınız.");
            await EnsureNoOrphanedCoursesAsync(teacher, branch);

            // yeni talep bekleyen eskisinin yerini alır
            await CancelBranchRequestAsync(teacherId);
            _context.BranchChangeRequests.Add(new BranchChangeRequest
            {
                TeacherId = teacherId, CurrentBranch = teacher.Branch, RequestedBranch = branch
            });
            await _context.SaveChangesAsync();
            return (await GetLatestBranchRequestAsync(teacherId))!;
        }

        public async Task<bool> CancelBranchRequestAsync(int teacherId)
        {
            var pending = await _context.BranchChangeRequests
                .Where(r => r.TeacherId == teacherId && r.Status == BranchRequestStatus.Pending).ToListAsync();
            foreach (var r in pending)
            {
                r.Status = BranchRequestStatus.Cancelled;
                r.ReviewedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return pending.Count > 0;
        }

        public async Task ReviewBranchRequestAsync(int requestId, bool approve)
        {
            var request = await _context.BranchChangeRequests.Include(r => r.Teacher)
                .FirstOrDefaultAsync(r => r.Id == requestId) ?? throw new KeyNotFoundException("Talep bulunamadı.");
            if (request.Status != BranchRequestStatus.Pending) throw new InvalidOperationException("Bu talep zaten sonuçlandırılmış.");
            if (approve)
            {
                // talepten sonra eski branşta kurs açılmış olabilir: onay anında yeniden denetlenir
                var branch = await NormalizeBranchesAsync(request.RequestedBranch);
                await EnsureNoOrphanedCoursesAsync(request.Teacher, branch);
                request.Teacher.Branch = branch;
            }
            request.Status = approve ? BranchRequestStatus.Approved : BranchRequestStatus.Rejected;
            request.ReviewedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // sıralama ve süzme varlık üzerinde yapılır; kayıt (record) projeksiyonu en sonda
        private static IQueryable<BranchRequestView> View(IQueryable<BranchChangeRequest> q) =>
            q.AsNoTracking().Select(r => new BranchRequestView(
                r.Id, r.TeacherId, r.Teacher.FirstName + " " + r.Teacher.LastName, r.CurrentBranch, r.RequestedBranch,
                r.Status, r.CreatedAt, r.ReviewedAt));

        // Her branş kategori listesinden olmalı; kanonik yazımla, tekrarsız ve ", " ile birleşik döner
        private async Task<string> NormalizeBranchesAsync(string? csv)
        {
            var names = await _context.Categories.AsNoTracking().Select(c => c.Name).ToListAsync();
            var picked = SplitBranches(csv)
                .Select(b => names.FirstOrDefault(n => string.Equals(n, b, StringComparison.OrdinalIgnoreCase))).ToList();
            if (picked.Count == 0) throw new ArgumentException("En az bir branş seçin.");
            if (picked.Any(n => n == null))
                throw new ArgumentException($"Geçersiz branş. Lütfen şu değerlerden birini seçin: {string.Join(", ", names)}");
            return string.Join(", ", picked.Distinct(StringComparer.OrdinalIgnoreCase));
        }

        // Bırakılan branşta hâlâ verdiği kurs varsa değişiklik o kursları branşsız bırakırdı
        private async Task EnsureNoOrphanedCoursesAsync(Teacher teacher, string branch)
        {
            var kept = SplitBranches(branch);
            var removed = SplitBranches(teacher.Branch).Where(b => !kept.Contains(b, StringComparer.OrdinalIgnoreCase)).ToList();
            if (removed.Count == 0) return;
            var blocking = await _context.Courses.Where(c => c.TeacherId == teacher.Id && removed.Contains(c.Category))
                .Select(c => c.Category).Distinct().ToListAsync();
            var list = string.Join(", ", blocking);
            if (blocking.Count > 0)
                throw new InvalidOperationException($"Şu branşta verdiğiniz kurslar var: {list}. Önce o kursları silmeli veya devretmelisiniz.");
        }

        private static List<string> SplitBranches(string? csv) =>
            (csv ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList();

        private static bool SameBranches(string a, string? b) =>
            SplitBranches(a).ToHashSet(StringComparer.OrdinalIgnoreCase).SetEquals(SplitBranches(b));

        public async Task<List<CourseAnalytics>?> GetAnalyticsForUserAsync(int userId)
        {
            var teacher = await _context.Teachers.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId);
            if (teacher == null) return null;
            var courses = await _context.Courses.AsNoTracking().Where(c => c.TeacherId == teacher.Id)
                .Select(c => new { c.Id, c.Title, c.Category, c.Price }).ToListAsync();
            var ids = courses.Select(c => c.Id).ToList();
            var since = DateTime.UtcNow.AddDays(-30);

            // aktif kayıtlar; ayrılan ve iade edenler (soft-delete) "toplam katılım"a girer
            var active = await _context.Enrollments.Where(e => ids.Contains(e.CourseId))
                .GroupBy(e => e.CourseId)
                .Select(g => new { g.Key, Count = g.Count(), Recent = g.Count(e => e.EnrollmentDate >= since) })
                .ToDictionaryAsync(x => x.Key);
            var ever = await _context.Enrollments.IgnoreQueryFilters().Where(e => ids.Contains(e.CourseId))
                .GroupBy(e => e.CourseId).Select(g => new { g.Key, Count = g.Select(e => e.StudentId).Distinct().Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);
            var graduates = await _context.CourseCompletions.Where(c => ids.Contains(c.CourseId))
                .GroupBy(c => c.CourseId).Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);
            var lessons = await _context.Lessons.Where(l => ids.Contains(l.CourseId))
                .GroupBy(l => l.CourseId).Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);
            // satış ve iade kursun kendisine ait (kurs sonradan başka eğitmene geçmiş olabilir); kazanç bu eğitmenin payı:
            // satışta Earning, iadede EarningReversal (eksi tutar)
            var sales = await _context.WalletTransactions
                .Where(t => t.CourseId != null && ids.Contains(t.CourseId.Value) && (t.Type == "Purchase" || t.Type == "Refund"))
                .GroupBy(t => t.CourseId!.Value)
                .Select(g => new { g.Key, Sales = g.Count(t => t.Type == "Purchase"), Refunds = g.Count(t => t.Type == "Refund") })
                .ToDictionaryAsync(x => x.Key);
            var earned = await _context.WalletTransactions
                .Where(t => t.UserId == userId && t.CourseId != null && ids.Contains(t.CourseId.Value)
                            && (t.Type == "Earning" || t.Type == "EarningReversal"))
                .GroupBy(t => t.CourseId!.Value)
                .Select(g => new { g.Key, Sum = g.Sum(t => t.Amount) })
                .ToDictionaryAsync(x => x.Key, x => x.Sum);

            return courses.Select(c => new CourseAnalytics(
                c.Id, c.Title, c.Category, c.Price,
                active.TryGetValue(c.Id, out var a) ? a.Count : 0,
                a?.Recent ?? 0,
                ever.GetValueOrDefault(c.Id),
                graduates.GetValueOrDefault(c.Id),
                lessons.GetValueOrDefault(c.Id),
                sales.TryGetValue(c.Id, out var m) ? m.Sales : 0,
                m?.Refunds ?? 0,
                earned.GetValueOrDefault(c.Id))).OrderByDescending(x => x.Students).ToList();
        }
    }

    public record BranchRequestView(int Id, int TeacherId, string TeacherName, string? CurrentBranch, string RequestedBranch,
        string Status, DateTime CreatedAt, DateTime? ReviewedAt);

    // Eğitmen panelindeki bir kurs satırı. EverEnrolled ayrılan/iade edenleri de sayar; Earned iadeler düşülmüş paydır.
    public record CourseAnalytics(int CourseId, string Title, string Category, decimal Price, int Students, int JoinedLast30,
        int EverEnrolled, int Graduates, int Lessons, int Sales, int Refunds, decimal Earned);
}
