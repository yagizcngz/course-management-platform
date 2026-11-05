using EdTechApi.API.Helpers;
using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Route("api/courses/{courseId}/lessons")]
    [ApiController]
    [Authorize]
    public class LessonsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly IEnrollmentService _enrollments;

        public LessonsController(AppDbContext context, IConfiguration config, IWebHostEnvironment env, IEnrollmentService enrollments)
        {
            _context = context;
            _config = config;
            _env = env;
            _enrollments = enrollments;
        }

        // İmzalı video akışı; <video> etiketi Authorization başlığı gönderemediği için imza ile korunur.
        [AllowAnonymous]
        [HttpGet("/api/lessons/stream/{file}")]
        public IActionResult Stream(string file, [FromQuery] long exp, [FromQuery] string sig)
        {
            if (file != Path.GetFileName(file) || !VideoUrlSigner.IsValid(file, exp, sig, _config["Jwt:Key"]!))
                return StatusCode(403, "Video bağlantısının süresi dolmuş veya geçersiz.");
            var path = Path.Combine(VideoUrlSigner.FolderPath(_env), file);
            if (!System.IO.File.Exists(path)) return NotFound();
            var contentType = Path.GetExtension(file).ToLowerInvariant() == ".webm" ? "video/webm" : "video/mp4";
            return PhysicalFile(path, contentType, enableRangeProcessing: true);
        }

        // Herkese açık müfredat: kurs kimliği -> sıralı ders başlığı ve açıklaması (video bağlantısı içermez).
        [AllowAnonymous]
        [HttpGet("/api/lessons/outline")]
        public async Task<IActionResult> Outline() =>
            Ok((await _context.Lessons.AsNoTracking()
                    .OrderBy(l => l.Order).ThenBy(l => l.Id)
                    .Select(l => new { l.CourseId, l.Title, l.Description })
                    .ToListAsync())
                .GroupBy(l => l.CourseId)
                .ToDictionary(g => g.Key.ToString(), g => g.Select(l => new { l.Title, l.Description }).ToList()));

        public record LessonRequest(string Title, string? Description, string? VideoUrl, int? Order);

        // Herkes ders başlıklarını görür; video bağlantısı yalnızca kayıtlı öğrenci, kursun öğretmeni ve yöneticiye döner.
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetAll(int courseId)
        {
            var course = await _context.Courses.Include(c => c.Teacher).FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return NotFound("Kurs bulunamadı.");

            var canEdit = await CanEditAsync(course);
            var studentId = await EnrolledStudentIdAsync(courseId);
            var hasAccess = canEdit || studentId != null;
            var key = _config["Jwt:Key"]!;
            var lessons = (await _context.Lessons
                .Where(l => l.CourseId == courseId)
                .OrderBy(l => l.Order).ThenBy(l => l.Id)
                .ToListAsync())
                .Select(l => new
                {
                    l.Id, l.Title, l.Description, l.Order,
                    VideoUrl = !hasAccess || l.VideoUrl == null ? null
                        : l.VideoUrl.StartsWith(VideoUrlSigner.Prefix) ? VideoUrlSigner.Sign(l.VideoUrl, key) : l.VideoUrl,
                    // Düzenleme formu için saklanan ham değer
                    StoredVideoUrl = canEdit ? l.VideoUrl : null
                });
            // ilerleme yalnızca kayıtlı öğrenciye döner
            var completed = studentId == null ? new List<int>() : await _context.LessonCompletions
                .Where(c => c.StudentId == studentId && c.Lesson!.CourseId == courseId).Select(c => c.LessonId).ToListAsync();
            var progress = studentId == null ? null : (await _enrollments.GetProgressAsync(studentId.Value, new[] { courseId }))[courseId];
            return Ok(new
            {
                hasAccess,
                canEdit,
                isEnrolled = studentId != null,
                completedLessonIds = completed,
                progressPercent = progress?.Percent ?? 0,
                course = new { course.Id, course.Title, course.Description, course.Instructor, course.ImageUrl, course.Price, course.Category },
                lessons
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create(int courseId, [FromBody] LessonRequest request)
        {
            var course = await _context.Courses.Include(c => c.Teacher).FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return NotFound("Kurs bulunamadı.");
            if (!await CanEditAsync(course)) return StatusCode(403, "Bu kursun derslerini düzenleyemezsiniz.");
            if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest("Ders başlığı zorunludur.");

            var nextOrder = request.Order ?? (await _context.Lessons.Where(l => l.CourseId == courseId).MaxAsync(l => (int?)l.Order) ?? 0) + 1;
            var lesson = new Lesson
            {
                CourseId = courseId,
                Title = request.Title.Trim(),
                Description = request.Description,
                VideoUrl = request.VideoUrl,
                Order = nextOrder
            };
            _context.Lessons.Add(lesson);
            await _context.SaveChangesAsync();
            return Ok(new { lesson.Id, lesson.Title, lesson.Description, lesson.VideoUrl, lesson.Order });
        }

        // Kayıtlı öğrenci dersi bitirdi (düğmeyle veya video sonunda); ilerleme döner
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> Complete(int courseId, int id)
        {
            var studentId = await EnrolledStudentIdAsync(courseId);
            if (studentId == null) return StatusCode(403, "Bu kursa kayıtlı değilsiniz.");
            try
            {
                var p = await _enrollments.CompleteLessonAsync(studentId.Value, courseId, id);
                return Ok(new { completedLessons = p.Done, totalLessons = p.Total, progressPercent = p.Percent, completed = p.IsComplete });
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int courseId, int id, [FromBody] LessonRequest request)
        {
            var lesson = await _context.Lessons.Include(l => l.Course).ThenInclude(c => c!.Teacher)
                .FirstOrDefaultAsync(l => l.Id == id && l.CourseId == courseId);
            // silinmiş bir kursun dersi: kurs filtresi navigasyonu boş bırakır
            if (lesson?.Course == null) return NotFound("Ders bulunamadı.");
            if (!await CanEditAsync(lesson.Course)) return StatusCode(403, "Bu kursun derslerini düzenleyemezsiniz.");
            if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest("Ders başlığı zorunludur.");

            lesson.Title = request.Title.Trim();
            lesson.Description = request.Description;
            lesson.VideoUrl = request.VideoUrl;
            if (request.Order.HasValue) lesson.Order = request.Order.Value;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int courseId, int id)
        {
            var lesson = await _context.Lessons.Include(l => l.Course).ThenInclude(c => c!.Teacher)
                .FirstOrDefaultAsync(l => l.Id == id && l.CourseId == courseId);
            if (lesson?.Course == null) return NotFound("Ders bulunamadı.");
            if (!await CanEditAsync(lesson.Course)) return StatusCode(403, "Bu kursun derslerini düzenleyemezsiniz.");

            lesson.IsDeleted = true;
            lesson.DeletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task<bool> CanEditAsync(Course course)
        {
            if (User.IsAdmin()) return true;
            var teacherUserId = course.Teacher?.UserId;
            if (!User.IsInRole("Teacher") || teacherUserId == null) return false;
            var username = User.GetUsername();
            return await _context.Users.AnyAsync(u => u.Id == teacherUserId && u.Username == username);
        }

        // Kursa etkin kaydı olan öğrenci profili; yoksa null
        private async Task<int?> EnrolledStudentIdAsync(int courseId)
        {
            var username = User.GetUsername();
            if (username == null) return null;
            return await _context.Enrollments
                .Where(e => e.CourseId == courseId && e.Student.User != null && e.Student.User.Username == username)
                .Select(e => (int?)e.StudentId).FirstOrDefaultAsync();
        }
    }
}
