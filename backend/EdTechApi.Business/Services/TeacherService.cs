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

    // Eğitmen panelindeki bir kurs satırı. EverEnrolled ayrılan/iade edenleri de sayar; Earned iadeler düşülmüş paydır.
    public record CourseAnalytics(int CourseId, string Title, string Category, decimal Price, int Students, int JoinedLast30,
        int EverEnrolled, int Graduates, int Lessons, int Sales, int Refunds, decimal Earned);
}
