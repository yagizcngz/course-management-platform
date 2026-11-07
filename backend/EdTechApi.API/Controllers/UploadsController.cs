using EdTechApi.API.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EdTechApi.API.Controllers
{
    // Profil fotoğrafı gibi küçük görselleri diske kaydedip sadece URL'sini döner.
    // Böylece görsel, base64 olarak her API isteğinde dev bir metin gibi taşınmaz
    // (önceki haliyle /api/profile/me tek başına 2-3 MB'a çıkıp saniyelerce sürüyordu).
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    [EnableRateLimiting("uploads")]
    public class UploadsController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public UploadsController(IWebHostEnvironment env)
        {
            _env = env;
        }

        private const string ImageTypeError = "Sadece jpg, png, gif veya webp dosyaları yüklenebilir.";
        private const string VideoTypeError = "Sadece mp4 veya webm videoları yüklenebilir.";
        private const long MaxImageBytes = 20_000_000;
        private const long MaxVideoBytes = 524_288_000;

        [HttpPost("profile-picture")]
        [RequestSizeLimit(MaxImageBytes)] // 20 MB üst sınır
        public async Task<IActionResult> UploadProfilePicture(IFormFile file)
        {
            var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var (fileName, error) = await SaveAsync(file, FileSignature.Images, ImageTypeError,
                Path.Combine(webRootPath, "uploads", "profile-pictures"));
            // Frontend bu göreli URL'i API adresiyle birleştirip <img src> olarak kullanır
            return error ?? Ok(new { url = $"/uploads/profile-pictures/{fileName}" });
        }

        // Kurs kapak fotoğrafı yükleme (kursu düzenleyebilen yönetici/eğitmen). Düzenleme ekranında dışarıdan link
        // yapıştırma seçeneği de var; bu endpoint yalnızca "dosya yükle" seçeneği için.
        [HttpPost("course-image")]
        [Authorize(Roles = RoleNames.AdminsAndTeachers)]
        [RequestSizeLimit(MaxImageBytes)] // 20 MB üst sınır
        public async Task<IActionResult> UploadCourseImage(IFormFile file)
        {
            var webRootPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var (fileName, error) = await SaveAsync(file, FileSignature.Images, ImageTypeError,
                Path.Combine(webRootPath, "uploads", "course-images"));
            return error ?? Ok(new { url = $"/uploads/course-images/{fileName}" });
        }

        // Ders videosu yükleme. Dosya wwwroot dışına kaydedilir; LessonsController imzalı adresle sunar.
        [HttpPost("video")]
        [Authorize(Roles = RoleNames.AdminsAndTeachers)]
        [RequestSizeLimit(MaxVideoBytes)] // 500 MB
        [RequestFormLimits(MultipartBodyLengthLimit = MaxVideoBytes)]
        public async Task<IActionResult> UploadVideo(IFormFile file)
        {
            var (fileName, error) = await SaveAsync(file, FileSignature.Videos, VideoTypeError,
                VideoUrlSigner.FolderPath(_env));
            return error ?? Ok(new { url = $"{VideoUrlSigner.Prefix}{fileName}" });
        }

        // Boyut üst sınırı RequestSizeLimit ile gövde okunmadan uygulanır. Uzantı izin listesinde, bildirilen MIME türü uzantıyla ve dosyanın ilk baytları ikisiyle aynı olmalı; görseller
        // ayrıca gömülü HTML/betik için taranır. Dosya rastgele adla kaydedilir, istemcinin verdiği ad hiç kullanılmaz.
        private static async Task<(string? FileName, IActionResult? Error)> SaveAsync(IFormFile? file,
            IReadOnlyDictionary<string, string> allowed, string typeError, string folder)
        {
            if (file == null || file.Length == 0)
                return (null, new BadRequestObjectResult("Dosya seçilmedi."));

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowed.TryGetValue(extension, out var mime)
                || !string.Equals(file.ContentType, mime, StringComparison.OrdinalIgnoreCase))
                return (null, new BadRequestObjectResult(typeError));

            var head = new byte[FileSignature.HeaderLength];
            await using (var probe = file.OpenReadStream())
            {
                var read = await probe.ReadAtLeastAsync(head, head.Length, throwOnEndOfStream: false);
                if (!FileSignature.HeaderMatches(extension, head.AsSpan(0, read)))
                    return (null, new BadRequestObjectResult(typeError));
            }

            if (allowed == FileSignature.Images)
            {
                using var buffer = new MemoryStream((int)file.Length);
                await file.CopyToAsync(buffer);
                if (FileSignature.ContainsMarkup(buffer.GetBuffer().AsSpan(0, (int)buffer.Length)))
                    return (null, new BadRequestObjectResult(typeError));
            }

            Directory.CreateDirectory(folder);
            var fileName = $"{Guid.NewGuid()}{extension}";
            await using (var stream = new FileStream(Path.Combine(folder, fileName), FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }
            return (fileName, null);
        }
    }
}