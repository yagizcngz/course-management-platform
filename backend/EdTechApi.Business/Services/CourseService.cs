using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    public class CourseService : ICourseService
    {
        private readonly AppDbContext _context;

        public CourseService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Course>> GetAllCoursesAsync(string? search = null, string? category = null, bool? isFeatured = null)
        {
            var query = _context.Courses.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(c => c.Title.Contains(search) || c.Description.Contains(search) || c.Category.Contains(search) || (c.SubCategory != null && c.SubCategory.Contains(search)) || c.Instructor.Contains(search));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(c => c.Category.ToLower() == category.ToLower());
            }

            if (isFeatured.HasValue)
            {
                query = query.Where(c => c.IsFeatured == isFeatured.Value);
            }

            return await query
                .AsNoTracking()
                .OrderByDescending(c => c.Enrollments.Count)
                .ToListAsync();
        }

        public async Task<IEnumerable<Course>> GetPopularCoursesAsync(int count)
        {
            return await _context.Courses
                .AsNoTracking()
                .OrderByDescending(c => c.Enrollments.Count)
                .Take(count)
                .ToListAsync();
        }

        public async Task<List<CourseStats>> GetCourseStatsAsync()
        {
            var now = DateTime.UtcNow;
            DateTime d7 = now.AddDays(-7), d14 = now.AddDays(-14), d30 = now.AddDays(-30);
            return await _context.Enrollments.AsNoTracking()
                .GroupBy(e => e.CourseId)
                .Select(g => new CourseStats(g.Key, g.Count(),
                    g.Count(e => e.EnrollmentDate >= d7),
                    g.Count(e => e.EnrollmentDate >= d14 && e.EnrollmentDate < d7),
                    g.Count(e => e.EnrollmentDate >= d30)))
                .ToListAsync();
        }

        public async Task<CourseRatingSummary> GetRatingAsync(int courseId, int? studentId)
        {
            var q = _context.CourseRatings.AsNoTracking().Where(r => r.CourseId == courseId);
            var count = await q.CountAsync();
            var average = count == 0 ? 0 : Math.Round(await q.AverageAsync(r => r.Stars), 2);
            int? mine = studentId == null ? null
                : await q.Where(r => r.StudentId == studentId).Select(r => (int?)r.Stars).FirstOrDefaultAsync();
            var canRate = studentId != null && await OwnsCourseAsync(studentId.Value, courseId);
            return new CourseRatingSummary(average, count, mine, canRate);
        }

        public async Task<CourseRatingSummary> RateAsync(int studentId, int courseId, int stars)
        {
            if (stars is < 1 or > 5) throw new ArgumentException("Puan 1 ile 5 arasında olmalı.");
            if (!await _context.Courses.AnyAsync(c => c.Id == courseId)) throw new KeyNotFoundException("Kurs bulunamadı.");
            if (!await OwnsCourseAsync(studentId, courseId))
                throw new InvalidOperationException("Yalnızca kayıtlı olduğunuz veya bitirdiğiniz kursu puanlayabilirsiniz.");

            var rating = await _context.CourseRatings.FirstOrDefaultAsync(r => r.StudentId == studentId && r.CourseId == courseId);
            if (rating == null)
                _context.CourseRatings.Add(new CourseRating { StudentId = studentId, CourseId = courseId, Stars = stars });
            else
            {
                rating.Stars = stars;
                rating.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            return await GetRatingAsync(courseId, studentId);
        }

        public async Task<CourseRatingSummary> RemoveRatingAsync(int studentId, int courseId)
        {
            await _context.CourseRatings.Where(r => r.StudentId == studentId && r.CourseId == courseId).ExecuteDeleteAsync();
            return await GetRatingAsync(courseId, studentId);
        }

        // Kayıtlı (aktif kayıt) veya bitirmiş öğrenci puan verebilir; iade edip ayrılan veremez
        private async Task<bool> OwnsCourseAsync(int studentId, int courseId) =>
            await _context.Enrollments.AnyAsync(e => e.StudentId == studentId && e.CourseId == courseId)
            || await _context.CourseCompletions.AnyAsync(c => c.StudentId == studentId && c.CourseId == courseId);

        public async Task<Course?> GetCourseByIdAsync(int id)
        {
            return await _context.Courses.FindAsync(id);
        }

        public async Task AddCourseAsync(Course course)
        {
            await SyncInstructorFromTeacherAsync(course);
            await _context.Courses.AddAsync(course);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> UpdateCourseAsync(int id, Course updatedCourse)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null)
            {
                return false;
            }

            course.Title = updatedCourse.Title;
            course.MaxCapacity = updatedCourse.MaxCapacity;
            course.Price = updatedCourse.Price;
            course.Category = updatedCourse.Category;
            course.SubCategory = updatedCourse.SubCategory;
            course.Level = updatedCourse.Level;
            course.Description = updatedCourse.Description;
            course.ImageUrl = updatedCourse.ImageUrl;

            // Önce gelen TeacherId'yi ve (varsa) elle girilmiş Instructor metnini yazıyoruz.
            // TeacherId set edilmişse aşağıdaki SyncInstructorFromTeacherAsync bunun üzerine
            // yazıp Instructor'ı seçilen öğretmenin adıyla senkronize edecek. TeacherId null
            // ise (öğretmen seçilmemiş, serbest metin kullanılmışsa) elle girilen Instructor
            // olduğu gibi kalır.
            course.TeacherId = updatedCourse.TeacherId;
            course.Instructor = updatedCourse.Instructor;

            await SyncInstructorFromTeacherAsync(course);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task DeleteCourseAsync(int id)
        {
            // Artık hard-delete değil, soft-delete yapıyoruz: satır DB'de kalır,
            // sadece IsDeleted=true işaretlenir.
            var course = await _context.Courses.FindAsync(id);
            if (course != null)
            {
                course.IsDeleted = true;
                course.DeletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Course>> GetDeletedCoursesAsync()
        {
            return await _context.Courses
                .IgnoreQueryFilters()
                .Where(c => c.IsDeleted)
                .ToListAsync();
        }

        public async Task<IEnumerable<Course>> GetRecommendedCoursesAsync(int studentId, int count)
        {
            var enrolledCourseIds = await _context.Enrollments
                .Where(e => e.StudentId == studentId && !e.IsDeleted)
                .Select(e => e.CourseId)
                .ToListAsync();

            return await _context.Courses
                .AsNoTracking()
                .Where(c => !enrolledCourseIds.Contains(c.Id))
                .OrderByDescending(c => c.CreatedAt)
                .Take(count)
                .ToListAsync();
        }

        // Bir kursa TeacherId atanmışsa, Instructor serbest metin alanını o öğretmenin
        // adıyla otomatik senkronize eder. Böylece eski kod yolları (raporlar, kart
        // görünümü vb.) Instructor string'ini okumaya devam edebilir, ama artık bu alan
        // TeacherId'den türetilmiş "tek doğru kaynak" (source of truth) haline gelir.
        private async Task SyncInstructorFromTeacherAsync(Course course)
        {
            if (!course.TeacherId.HasValue)
            {
                return;
            }

            var teacher = await _context.Teachers.FindAsync(course.TeacherId.Value);
            if (teacher != null)
            {
                course.Instructor = $"{teacher.FirstName} {teacher.LastName}".Trim();
            }
        }
    }

    // Aktif kayıtlar: toplam, son 7 gün, ondan önceki 7 gün ve son 30 gün
    public record CourseStats(int CourseId, int Students, int Last7, int Prev7, int Last30);

    // Ortalama 0-5 (puan yoksa 0); Mine oturumdaki öğrencinin puanı, CanRate kursa sahip olup olmadığı
    public record CourseRatingSummary(double Average, int Count, int? Mine, bool CanRate);
}
