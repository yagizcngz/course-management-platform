using EdTechApi.API.Helpers;
using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Constants;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;
        private readonly ITeacherService _teacherService;
        private readonly AppDbContext _context;

        public CoursesController(ICourseService courseService, ITeacherService teacherService, AppDbContext context)
        {
            _courseService = courseService;
            _teacherService = teacherService;
            _context = context;
        }

        [Authorize]
        [HttpGet("recommended")]
        public async Task<IActionResult> GetRecommended([FromQuery] int count = 5)
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || (user.Role.ToLower() != "student" && user.Role.ToLower() != "user" && user.Role.ToLower() != "teacher")) return StatusCode(403, "Sadece katılımcılar önerilen kursları görebilir.");

            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student == null) return Ok(new List<object>());

            var recommended = await _courseService.GetRecommendedCoursesAsync(student.Id, count);
            return Ok(recommended);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? category, [FromQuery] bool? isFeatured)
        {
            var courses = await _courseService.GetAllCoursesAsync(search, category, isFeatured);
            return Ok(courses);
        }

        [HttpGet("popular")]
        public async Task<IActionResult> GetPopular([FromQuery] int count = 4)
        {
            var courses = await _courseService.GetPopularCoursesAsync(count);
            return Ok(courses);
        }

        // Katalog vitrinleri için kurs başına kayıt sayıları (kimlik gerekmez; kişisel veri yok)
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats() => Ok(await _courseService.GetCourseStatsAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var course = await _courseService.GetCourseByIdAsync(id);
            if (course == null)
            {
                return NotFound("Kurs bulunamadı.");
            }
            return Ok(course);
        }

        // Puan özeti herkese açık; oturum açmış öğrenci kendi puanını ve puan verip veremeyeceğini de görür
        [HttpGet("{id}/rating")]
        public async Task<IActionResult> GetRating(int id)
        {
            if (!await _context.Courses.AnyAsync(c => c.Id == id)) return NotFound("Kurs bulunamadı.");
            return Ok(await _courseService.GetRatingAsync(id, await OwnStudentIdAsync()));
        }

        public record RatingRequest(int Stars);

        [Authorize]
        [HttpPut("{id}/rating")]
        public async Task<IActionResult> Rate(int id, [FromBody] RatingRequest request)
        {
            var studentId = await OwnStudentIdAsync();
            if (studentId == null) return StatusCode(403, "Yalnızca kayıtlı olduğunuz veya bitirdiğiniz kursu puanlayabilirsiniz.");
            try
            {
                return Ok(await _courseService.RateAsync(studentId.Value, id, request.Stars));
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
            catch (InvalidOperationException ex) { return StatusCode(403, ex.Message); }
        }

        [Authorize]
        [HttpDelete("{id}/rating")]
        public async Task<IActionResult> RemoveRating(int id)
        {
            var studentId = await OwnStudentIdAsync();
            if (studentId == null) return NoContent();
            return Ok(await _courseService.RemoveRatingAsync(studentId.Value, id));
        }

        // Oturumdaki kullanıcının öğrenci kaydı (öğretmenler kurs alınca oluşur); yönetici ve misafirde null
        private async Task<int?> OwnStudentIdAsync()
        {
            var username = User.GetUsername();
            if (string.IsNullOrEmpty(username) || User.IsAdmin()) return null;
            return await _context.Students
                .Where(s => s.User != null && s.User.Username == username)
                .Select(s => (int?)s.Id)
                .FirstOrDefaultAsync();
        }

        // NOT: Önceden sadece "Admin" idi. Frontend'de (kurslar.tsx) canManage kontrolü
        // "Eğitmen", "Admin" ve "superadmin" rollerine izin veriyordu; bu yüzden Eğitmen
        // veya superadmin ile giriş yapan biri kurs oluşturma butonunu görüyor ama backend
        // 403 döndürüyordu. Rol listesi frontend'deki canManage ile eşleşecek şekilde
        // genişletildi.
        [Authorize(Roles = RoleNames.AdminsAndTeachers)]
        [HttpPost]
        public async Task<IActionResult> CreateCourse([FromBody] Course newCourse)
        {
            // Gövdeden gelen ilişki/sistem alanlarını yok say (over-posting)
            newCourse.Id = 0; newCourse.Teacher = null; newCourse.IsDeleted = false; newCourse.DeletedAt = null;
            newCourse.CreatedAt = DateTime.UtcNow;
            if (!User.IsAdmin()) newCourse.IsFeatured = false; // öne çıkarma yönetici kararı
            newCourse.Enrollments = new List<Enrollment>();

            // Öğretmen yalnızca kendi adına kurs açabilir
            var ownTeacherId = await GetOwnTeacherIdAsync();
            if (User.IsInRole("Teacher"))
            {
                if (ownTeacherId == null) return StatusCode(403, "Öğretmen profili bulunamadı.");
                newCourse.TeacherId = ownTeacherId;
            }

            if (newCourse.TeacherId == null || newCourse.TeacherId == 0)
            {
                var username = User.GetUsername();
                if (!string.IsNullOrEmpty(username))
                {
                    var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                    if (user != null)
                    {
                        var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
                        if (teacher != null)
                        {
                            newCourse.TeacherId = teacher.Id;
                            newCourse.Instructor = $"{teacher.FirstName} {teacher.LastName}";
                        }
                    }
                }
            }

            var (isValid, error) = await ValidateCategoryAndTeacherAsync(newCourse);
            if (!isValid)
            {
                return BadRequest(error);
            }

            await _courseService.AddCourseAsync(newCourse);
            return CreatedAtAction(nameof(GetById), new { id = newCourse.Id }, newCourse);
        }

        // NOT: Aynı sebeple PUT de "Eğitmen" ve "superadmin" rollerine açıldı — öğretmen
        // atama/düzenleme işlemi CourseDetailModal üzerinden bu rollerle yapılabilsin.
        [Authorize(Roles = RoleNames.AdminsAndTeachers)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCourse(int id, [FromBody] Course updatedCourse)
        {
            if (User.IsInRole("Teacher"))
            {
                var ownTeacherId = await GetOwnTeacherIdAsync();
                var ownerId = await _context.Courses.Where(c => c.Id == id).Select(c => c.TeacherId).FirstOrDefaultAsync();
                if (ownTeacherId == null || ownerId != ownTeacherId) return StatusCode(403, "Sadece kendi kurslarınızı düzenleyebilirsiniz.");
                updatedCourse.TeacherId = ownTeacherId; // öğretmen kursu başkasına devredemez
            }

            var (isValid, error) = await ValidateCategoryAndTeacherAsync(updatedCourse);
            if (!isValid)
            {
                return BadRequest(error);
            }

            var success = await _courseService.UpdateCourseAsync(id, updatedCourse);
            if (!success)
            {
                return NotFound("Kurs bulunamadı.");
            }
            return NoContent();
        }

        // NOT: Önceden hiç [Authorize] yoktu, yani kimlik doğrulaması olmadan da
        // çağrılabiliyordu. POST/PUT ile aynı rol setine kısıtlandı.
        [Authorize(Roles = RoleNames.AdminsAndTeachers)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            if (User.IsInRole("Teacher"))
            {
                var ownTeacherId = await GetOwnTeacherIdAsync();
                var ownerId = await _context.Courses.Where(c => c.Id == id).Select(c => c.TeacherId).FirstOrDefaultAsync();
                if (ownTeacherId == null || ownerId != ownTeacherId) return StatusCode(403, "Sadece kendi kurslarınızı silebilirsiniz.");
            }
            await _courseService.DeleteCourseAsync(id);
            return NoContent();
        }

        // Silinmiş (soft-deleted) kurslar — Raporlar sayfasındaki "Silinen Kurslar" kartı için
        [Authorize(Roles = RoleNames.Admins)]
        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedCourses()
        {
            var deleted = await _courseService.GetDeletedCoursesAsync();
            return Ok(deleted);
        }

        private async Task<int?> GetOwnTeacherIdAsync()
        {
            var username = User.GetUsername();
            if (string.IsNullOrEmpty(username)) return null;
            return await _context.Teachers
                .Where(t => t.User != null && t.User.Username == username)
                .Select(t => (int?)t.Id)
                .FirstOrDefaultAsync();
        }

        // Bir kursun Kategori'sinin sabit listeden olduğunu ve atanan öğretmenin branşının
        // bu kategoriyle eşleştiğini doğrular. Bir öğretmen sadece kendi branşıyla aynı
        // kategorideki bir kursa eğitmen olarak atanabilir. Geçerliyse Category alanını
        // listedeki kanonik yazıma normalize eder (örn. "fen bilimleri" -> "Fen Bilimleri").
        private async Task<(bool IsValid, string? Error)> ValidateCategoryAndTeacherAsync(Course course)
        {
            var categoryName = (course.Category ?? "").ToLower();
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name.ToLower() == categoryName);
            if (category == null)
            {
                var allCategories = await _context.Categories.Select(c => c.Name).ToListAsync();
                return (false,
                    $"Geçersiz kategori. Lütfen şu değerlerden birini seçin: {string.Join(", ", allCategories)}");
            }
            var normalizedCategory = category.Name;
            course.Category = normalizedCategory;
            // kategoriye ait olmayan alt kategori sessizce düşer; seviye yalnızca bilinen üç değerden biri olabilir
            course.SubCategory = BranchOptions.NormalizeSubCategory(normalizedCategory, course.SubCategory);
            if (!string.IsNullOrWhiteSpace(course.Level) && course.Level is not ("Beginner" or "Intermediate" or "Advanced"))
                return (false, "Geçersiz seviye. Beginner, Intermediate veya Advanced olmalı.");
            if (string.IsNullOrWhiteSpace(course.Level)) course.Level = null;
            course.Language = CourseLanguages.Normalize(course.Language) ?? CourseLanguages.Default;
            course.SubtitleLanguages = CourseLanguages.NormalizeList(course.SubtitleLanguages, course.Language);
            course.Topic = string.IsNullOrWhiteSpace(course.Topic) ? null : course.Topic.Trim();
            if (course.Topic?.Length > 60) return (false, "Konu en fazla 60 karakter olabilir.");

            if (course.TeacherId == null)
            {
                return (false, "Lütfen bir eğitmen seçin.");
            }

            var teacher = await _teacherService.GetTeacherByIdAsync(course.TeacherId.Value);
            if (teacher == null)
            {
                return (false, "Seçilen öğretmen bulunamadı.");
            }

            // Branch virgülle ayrılmış birden fazla branş tutabilir
            var branches = (teacher.Branch ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (!branches.Contains(normalizedCategory, StringComparer.OrdinalIgnoreCase))
            {
                var teacherBranch = string.IsNullOrWhiteSpace(teacher.Branch) ? "belirtilmemiş" : teacher.Branch;
                return (false,
                    $"Bu öğretmenin branşı ('{teacherBranch}') kursun kategorisiyle ('{normalizedCategory}') eşleşmiyor.");
            }

            return (true, null);
        }
    }
}
