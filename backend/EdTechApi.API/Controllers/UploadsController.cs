using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdTechApi.API.Controllers
{
    // Profil fotoğrafı gibi küçük görselleri diske kaydedip sadece URL'sini döner.
    // Böylece görsel, base64 olarak her API isteğinde dev bir metin gibi taşınmaz
    // (önceki haliyle /api/profile/me tek başına 2-3 MB'a çıkıp saniyelerce sürüyordu).
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UploadsController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public UploadsController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("profile-picture")]
        [RequestSizeLimit(20_000_000)] // 20 MB üst sınır
        public async Task<IActionResult> UploadProfilePicture(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Dosya seçilmedi.");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return BadRequest("Sadece jpg, png, gif veya webp dosyaları yüklenebilir.");

            var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadsFolder = Path.Combine(webRootPath, "uploads", "profile-pictures");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Frontend bu göreli URL'i http://localhost:5157 ile birleştirip <img src> olarak kullanacak
            var relativeUrl = $"/uploads/profile-pictures/{fileName}";
            return Ok(new { url = relativeUrl });
        }

        // Kurs kapak fotoğrafı yükleme. Sadece kursları düzenleyebilen roller (Admin) kullanabilir.
        // Kurslar.tsx / Kontrol Paneli'ndeki "Kursu Düzenle" ekranında hem dosya yükleme hem de
        // dışarıdan link yapıştırma seçeneği var; bu endpoint yalnızca "dosya yükle" seçeneği için.
        [HttpPost("course-image")]
        [Authorize(Roles = "Admin,Teacher")]
        [RequestSizeLimit(20_000_000)] // 20 MB üst sınır
        public async Task<IActionResult> UploadCourseImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Dosya seçilmedi.");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return BadRequest("Sadece jpg, png, gif veya webp dosyaları yüklenebilir.");

            var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadsFolder = Path.Combine(webRootPath, "uploads", "course-images");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativeUrl = $"/uploads/course-images/{fileName}";
            return Ok(new { url = relativeUrl });
        }
    }
}