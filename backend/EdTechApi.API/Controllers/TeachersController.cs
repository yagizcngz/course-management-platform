using EdTechApi.API.Helpers;
using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Constants;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TeachersController : ControllerBase
    {
        private readonly ITeacherService _teacherService;
        private readonly ICourseService _courseService;
        private readonly AppDbContext _context;

        public TeachersController(ITeacherService teacherService, ICourseService courseService, AppDbContext context)
        {
            _teacherService = teacherService;
            _courseService = courseService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var teachers = await _teacherService.GetAllTeachersAsync();
            return Ok(teachers);
        }

        // Misafirlerin de görebildiği eğitmen vitrini: e-posta, numara ve hesap bilgisi dönmez.
        // Profilini gizli yapan (IsProfilePublic=false) öğretmenin biyografisi ve fotoğrafı gösterilmez.
        [AllowAnonymous]
        // Giriş yapan eğitmenin kurs bazında panel verisi (Eğitmen Paneli sayfası)
        [Authorize(Roles = "Teacher")]
        [HttpGet("me/analytics")]
        public async Task<IActionResult> GetMyAnalytics()
        {
            var userId = await _context.Users.Where(u => u.Username == User.GetUsername()).Select(u => (int?)u.Id).FirstOrDefaultAsync();
            if (userId == null) return Unauthorized();
            var rows = await _teacherService.GetAnalyticsForUserAsync(userId.Value);
            return rows == null ? NotFound() : Ok(rows);
        }

        [HttpGet("public")]
        public async Task<IActionResult> GetPublic()
        {
            var teachers = await _context.Teachers.AsNoTracking()
                .OrderBy(t => t.FirstName).ThenBy(t => t.LastName)
                .Select(t => new
                {
                    t.Id,
                    t.FirstName,
                    t.LastName,
                    t.Branch,
                    AboutMe = t.User == null || t.User.IsProfilePublic ? t.AboutMe : null,
                    ProfilePictureUrl = t.User == null || t.User.IsProfilePublic ? t.ProfilePictureUrl : null,
                    Courses = t.Courses.Select(c => new { c.Id, c.Title, c.Category }).ToList()
                })
                .ToListAsync();
            return Ok(teachers);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var teacher = await _teacherService.GetTeacherByIdAsync(id);
            if (teacher == null)
            {
                return NotFound("Öğretmen bulunamadı.");
            }
            return Ok(teacher);
        }

        [Authorize(Roles = RoleNames.Admins)]
        [HttpPost]
        public async Task<IActionResult> CreateTeacher([FromBody] Teacher newTeacher)
        {
            // Branş, kurs kategorileriyle eşleştirme yapılabilmesi için sabit listeden
            // seçilmiş olmalı — serbest metin artık kabul edilmiyor.
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name.ToLower() == (newTeacher.Branch ?? "").ToLower());
            if (category == null)
            {
                var allCategories = await _context.Categories.Select(c => c.Name).ToListAsync();
                return BadRequest($"Geçersiz branş. Lütfen şu değerlerden birini seçin: {string.Join(", ", allCategories)}");
            }
            newTeacher.Branch = category.Name;
            // Gövdeden gelen ilişki/sistem alanlarını yok say (over-posting)
            newTeacher.Id = 0; newTeacher.User = null; newTeacher.UserId = null; newTeacher.IsDeleted = false;
            newTeacher.Courses = new List<Course>();

            await _teacherService.AddTeacherAsync(newTeacher);
            // kayıt ve başvuru onayıyla aynı numara biçimi: yıl + 7 haneli kimlik
            newTeacher.TeacherNumber = DateTime.UtcNow.ToString("yy") + newTeacher.Id.ToString().PadLeft(7, '0');
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = newTeacher.Id }, newTeacher);
        }

        [Authorize(Roles = RoleNames.Admins)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTeacher(int id, [FromBody] Teacher updatedTeacher)
        {
            // Branş, kurs kategorileriyle eşleştirme yapılabilmesi için sabit listeden
            // seçilmiş olmalı — serbest metin artık kabul edilmiyor.
            // Branch virgülle ayrılmış birden fazla branş olabilir; her biri listeden olmalı
            var allCategoryNames = await _context.Categories.Select(c => c.Name).ToListAsync();
            var requested = (updatedTeacher.Branch ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            var normalized = requested.Select(b => allCategoryNames.FirstOrDefault(n => string.Equals(n, b, StringComparison.OrdinalIgnoreCase))).ToList();
            if (normalized.Count == 0 || normalized.Any(n => n == null))
            {
                return BadRequest($"Geçersiz branş. Lütfen şu değerlerden birini seçin: {string.Join(", ", allCategoryNames)}");
            }
            var normalizedBranch = string.Join(", ", normalized);
            updatedTeacher.Branch = normalizedBranch;

            var existingTeacher = await _teacherService.GetTeacherByIdAsync(id);
            if (existingTeacher == null)
            {
                return NotFound("Öğretmen bulunamadı.");
            }

            // Branş fiilen değiştiriliyorsa ve öğretmenin mevcut (eski) branşıyla eşleşen,
            // hâlâ ona atanmış kurs(lar) varsa değişikliğe izin verme — aksi halde o kurslar
            // öğretmenin yeni branşıyla eşleşmeyen "yetim" kayıtlar haline gelir.
            var removedBranches = (existingTeacher.Branch ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Where(b => !normalized.Contains(b, StringComparer.OrdinalIgnoreCase)).ToList();
            if (removedBranches.Count > 0)
            {
                var coursesInCurrentBranch = await _context.Courses
                    .Where(c => c.TeacherId == id && removedBranches.Contains(c.Category))
                    .ToListAsync();

                if (coursesInCurrentBranch.Any())
                {
                    var titles = string.Join(", ", coursesInCurrentBranch.Select(c => c.Title ?? "Bilinmeyen Kurs"));
                    return BadRequest(
                        $"Bu öğretmenin branşı değiştirilemez: '{existingTeacher.Branch}' branşındaki şu kurs(lar)a hâlâ atanmış: {titles}. Önce bu kursları başka bir eğitmene atayın, sonra branşı değiştirin.");
                }
            }

            var success = await _teacherService.UpdateTeacherAsync(id, updatedTeacher);
            if (!success)
            {
                return NotFound("Öğretmen bulunamadı.");
            }
            return NoContent();
        }

        [Authorize(Roles = RoleNames.Admins)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeacher(int id)
        {
            await _teacherService.DeleteTeacherAsync(id);
            return NoContent();
        }

        [Authorize(Roles = RoleNames.Admins)]
        [HttpPost("bulk-delete")]
        public async Task<IActionResult> DeleteMultipleTeachers([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any()) return BadRequest("Silinecek öğretmen seçilmedi.");

            foreach (var id in ids)
            {
                await _teacherService.DeleteTeacherAsync(id);
            }

            return Ok();
        }

        // Silinmiş (soft-deleted) öğretmenler — Raporlar sayfasındaki "Silinen Öğretmenler" kartı için
        [Authorize(Roles = RoleNames.Admins)]
        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedTeachers()
        {
            var deleted = await _teacherService.GetDeletedTeachersAsync();
            return Ok(deleted);
        }
    }
}