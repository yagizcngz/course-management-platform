using EdTechApi.Business.Interfaces;
using EdTechApi.Core.DTOs;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    public class EnrollmentService : IEnrollmentService
    {
        private readonly AppDbContext _context;

        public EnrollmentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task EnrollStudentAsync(int studentId, int courseId)
        {
            var studentExists = await _context.Students.AnyAsync(s => s.Id == studentId);
            if (!studentExists)
                throw new ArgumentException("Öğrenci bulunamadı.");

            var course = await _context.Courses.FindAsync(courseId);
            if (course == null)
                throw new ArgumentException("Kurs bulunamadı.");

            var isAlreadyEnrolled = await _context.Enrollments
                .AnyAsync(e => e.StudentId == studentId && e.CourseId == courseId);

            if (isAlreadyEnrolled)
                throw new ArgumentException("Öğrenci bu kursa zaten kayıtlı.");

            var currentEnrollmentCount = await _context.Enrollments
                .CountAsync(e => e.CourseId == courseId);

            if (currentEnrollmentCount >= course.MaxCapacity)
                throw new ArgumentException("Kurs kapasitesi tamamen dolu.");

            var enrollment = new Enrollment
            {
                StudentId = studentId,
                CourseId = courseId,
                EnrollmentDate = DateTime.UtcNow
            };

            await _context.Enrollments.AddAsync(enrollment);
            await _context.SaveChangesAsync();
        }

        public async Task<Student?> GetOrCreateStudentForUserAsync(User user)
        {
            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student != null || user.Role.ToLower() != "teacher") return student;

            student = new Student
            {
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                CreatedAt = DateTime.UtcNow,
                UserId = user.Id
            };
            _context.Students.Add(student);
            await _context.SaveChangesAsync();
            student.StudentNumber = DateTime.UtcNow.ToString("yy") + student.Id.ToString().PadLeft(7, '0');
            await _context.SaveChangesAsync();
            return student;
        }

        public async Task LeaveCourseAsync(int studentId, int courseId)
        {
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.StudentId == studentId && e.CourseId == courseId);

            if (enrollment == null)
                throw new ArgumentException("Kayıt bulunamadı.");

            enrollment.IsDeleted = true;
            enrollment.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteEnrollmentAsync(int enrollmentId)
        {
            // Artık hard-delete değil, soft-delete yapıyoruz: satır DB'de kalır,
            // sadece IsDeleted=true işaretlenir.
            var enrollment = await _context.Enrollments.FindAsync(enrollmentId);
            if (enrollment == null)
                throw new ArgumentException("Kayıt bulunamadı.");

            enrollment.IsDeleted = true;
            enrollment.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<EnrollmentDto>> GetDeletedEnrollmentsAsync()
        {
            // IgnoreQueryFilters: hem Enrollment'ın kendi filtresini hem de Include edilen
            // Student/Course navigasyonlarındaki filtreleri devre dışı bırakır, böylece
            // ilişkili kayıt her durumda (o da silinmiş olsa dahi) gelir.
            return await _context.Enrollments
                .IgnoreQueryFilters()
                .Where(e => e.IsDeleted)
                .Include(e => e.Student)
                .Include(e => e.Course)
                .Select(e => new EnrollmentDto
                {
                    Id = e.Id,
                    StudentId = e.StudentId,
                    StudentFullName = e.Student.FirstName + " " + e.Student.LastName,
                    StudentNumber = e.Student.StudentNumber,
                    CourseTitle = e.Course.Title,
                    CourseId = e.CourseId,
                    Status = e.Status,
                    EnrollmentDate = e.EnrollmentDate
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<EnrollmentDto>> GetAllEnrollmentsAsync()
        {
            return await _context.Enrollments
                .Include(e => e.Student)
                .Include(e => e.Course)
                .Select(e => new EnrollmentDto
                {
                    Id = e.Id,
                    StudentId = e.StudentId,
                    StudentFullName = e.Student.FirstName + " " + e.Student.LastName,
                    StudentNumber = e.Student.StudentNumber,
                    CourseTitle = e.Course.Title,
                    CourseId = e.CourseId,
                    Status = e.Status,
                    EnrollmentDate = e.EnrollmentDate 
                })
                .ToListAsync();
        }

        public const string InProgress = "Devam Ediyor", Completed = "Tamamlandı";

        public async Task<Dictionary<int, CourseProgress>> GetProgressAsync(int studentId, IReadOnlyCollection<int> courseIds)
        {
            // ders filtresi silinmiş dersleri hem toplamdan hem tamamlananlardan düşürür
            var totals = await _context.Lessons.Where(l => courseIds.Contains(l.CourseId))
                .GroupBy(l => l.CourseId).Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);
            var done = await _context.LessonCompletions
                .Where(c => c.StudentId == studentId && courseIds.Contains(c.Lesson!.CourseId))
                .GroupBy(c => c.Lesson!.CourseId)
                .Select(g => new { g.Key, Count = g.Count(), Last = g.Max(c => c.CompletedAt) })
                .ToDictionaryAsync(x => x.Key);
            return courseIds.Distinct().ToDictionary(id => id, id => new CourseProgress(
                done.TryGetValue(id, out var d) ? d.Count : 0, totals.GetValueOrDefault(id), d?.Last));
        }

        public async Task<List<int>> GetCompletedCourseIdsAsync(int studentId)
        {
            // ilerleme öğrenciye bağlı (LessonCompletion), kayda değil; silinmiş dersler sayılmaz
            var touched = await _context.LessonCompletions
                .Where(c => c.StudentId == studentId && c.Lesson != null)
                .Select(c => c.Lesson!.CourseId).Distinct().ToListAsync();
            var progress = await GetProgressAsync(studentId, touched);
            return progress.Where(p => p.Value.IsComplete).Select(p => p.Key).ToList();
        }

        public async Task<CourseProgress> CompleteLessonAsync(int studentId, int courseId, int lessonId)
        {
            var enrollment = await _context.Enrollments.FirstOrDefaultAsync(e => e.StudentId == studentId && e.CourseId == courseId)
                ?? throw new ArgumentException("Bu kursa kayıtlı değilsiniz.");
            if (!await _context.Lessons.AnyAsync(l => l.Id == lessonId && l.CourseId == courseId))
                throw new ArgumentException("Ders bulunamadı.");
            if (!await _context.LessonCompletions.AnyAsync(c => c.StudentId == studentId && c.LessonId == lessonId))
                _context.LessonCompletions.Add(new LessonCompletion { StudentId = studentId, LessonId = lessonId });
            await _context.SaveChangesAsync();

            var progress = (await GetProgressAsync(studentId, new[] { courseId }))[courseId];
            enrollment.Status = progress.IsComplete ? Completed : InProgress;
            await _context.SaveChangesAsync();
            return progress;
        }

        public async Task<IEnumerable<EnrollmentDto>> GetStudentEnrollmentsAsync(int studentId)
        {
            var list = await _context.Enrollments
                .Include(e => e.Course)
                .Where(e => e.StudentId == studentId && !e.IsDeleted)
                .Select(e => new EnrollmentDto
                {
                    Id = e.Id,
                    StudentId = e.StudentId,
                    StudentFullName = e.Student.FirstName + " " + e.Student.LastName,
                    StudentNumber = e.Student.StudentNumber,
                    CourseTitle = e.Course.Title,
                    CourseId = e.CourseId,
                    Status = e.Status,
                    EnrollmentDate = e.EnrollmentDate
                })
                .ToListAsync();
            var progress = await GetProgressAsync(studentId, list.Select(e => e.CourseId).ToList());
            foreach (var e in list)
            {
                var p = progress[e.CourseId];
                e.CompletedLessons = p.Done;
                e.TotalLessons = p.Total;
                e.ProgressPercent = p.Percent;
                e.CompletedAt = p.IsComplete ? p.LastCompletedAt : null;
            }
            return list;
        }
    }
}