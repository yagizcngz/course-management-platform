using EdTechApi.API.Helpers;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = RoleNames.Admins)]
    public class SystemSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SystemSettingsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllSettings()
        {
            var settings = await _context.SystemSettings.ToListAsync();
            return Ok(settings);
        }

        [HttpGet("{key}")]
        public async Task<IActionResult> GetSetting(string key)
        {
            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == key);
            if (setting == null) return NotFound();
            return Ok(setting);
        }

        [HttpPut("{key}")]
        public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingRequest request)
        {
            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == key);
            
            if (setting == null)
            {
                // If it doesn't exist, create it
                setting = new SystemSetting
                {
                    SettingKey = key,
                    SettingValue = request.SettingValue,
                    Description = request.Description
                };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                setting.SettingValue = request.SettingValue;
                if (request.Description != null)
                {
                    setting.Description = request.Description;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(setting);
        }

        [HttpDelete("{key}")]
        public async Task<IActionResult> DeleteSetting(string key)
        {
            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == key);
            if (setting == null) return NotFound();

            _context.SystemSettings.Remove(setting);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Ayar başarıyla silindi." });
        }

        [HttpPost("seed")]
        public async Task<IActionResult> SeedDefaultSettings()
        {
            var defaults = new List<SystemSetting>
            {
                // kayıt kodları (ADMIN_CODE, TEACHER_CODE) bilerek tohumlanmaz: tahmin edilebilir bir kod herkese yönetici/eğitmen
                // kaydı açar. Yönetici kendi seçtiği değeri Ayarlar sayfasından girer; boşken kodla kayıt kapalıdır.
                new SystemSetting { SettingKey = "TEACHER_SHARE_PERCENT", SettingValue = "70", Description = "Kurs satışında eğitmen payı (yüzde)" },
                new SystemSetting { SettingKey = "ENABLE_GUEST_HOME_FEATURED", SettingValue = "true", Description = "Misafir ana sayfasında öne çıkan kursları göster" },
                new SystemSetting { SettingKey = "ENABLE_GUEST_HOME_POPULAR", SettingValue = "true", Description = "Misafir ana sayfasında en popüler kursları göster" },
                new SystemSetting { SettingKey = "ENABLE_STUDENT_HOME_RECOMMENDATIONS", SettingValue = "true", Description = "Öğrenci ana sayfasında önerilen kursları göster" },
                new SystemSetting { SettingKey = "ENABLE_STUDENT_HOME_ANNOUNCEMENTS", SettingValue = "true", Description = "Öğrenci ana sayfasında duyuruları göster" },
                new SystemSetting { SettingKey = "ENABLE_TEACHER_HOME_NOTIFICATIONS", SettingValue = "true", Description = "Öğretmen ana sayfasında yeni kayıt bildirimlerini göster" },
                new SystemSetting { SettingKey = "ENABLE_ADMIN_HOME_CAPACITY_ALERTS", SettingValue = "true", Description = "Admin dashboard'unda kapasite uyarılarını göster" },
                new SystemSetting { SettingKey = "ENABLE_ADMIN_HOME_ACTIVITY_LOG", SettingValue = "true", Description = "Admin dashboard'unda aktivite logunu göster" }
            };

            foreach (var def in defaults)
            {
                if (!await _context.SystemSettings.AnyAsync(s => s.SettingKey == def.SettingKey))
                {
                    _context.SystemSettings.Add(def);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Varsayılan ayarlar eklendi." });
        }
    }

    public class UpdateSettingRequest
    {
        public string SettingValue { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
