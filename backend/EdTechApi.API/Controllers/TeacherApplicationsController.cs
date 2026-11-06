using EdTechApi.API.Helpers;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    // Kayıt sırasında davet kodu olmadan yapılan eğitmen başvuruları; yalnızca yönetici görür ve karara bağlar.
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TeacherApplicationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeacherApplicationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsAdmin()) return StatusCode(403, "Admin access required.");
            var list = await _context.TeacherApplications.AsNoTracking()
                .OrderBy(a => a.Status != "Pending").ThenByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    a.UserId,
                    a.User.Username,
                    FullName = a.User.FirstName + " " + a.User.LastName,
                    a.User.Email,
                    a.Branch,
                    a.AboutMe,
                    a.Status,
                    a.CreatedAt
                })
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> Approve(int id)
        {
            if (!User.IsAdmin()) return StatusCode(403, "Admin access required.");
            var app = await _context.TeacherApplications.Include(a => a.User).FirstOrDefaultAsync(a => a.Id == id);
            if (app == null) return NotFound();
            if (app.Status != "Pending") return BadRequest("Başvuru zaten sonuçlandırılmış.");

            var user = app.User;
            if (user.Role == "User") user.Role = "Teacher";
            if (string.IsNullOrWhiteSpace(user.AboutMe)) user.AboutMe = app.AboutMe;

            // daha önce silinmiş bir öğretmen profili varsa geri yüklenir, yoksa başvurudaki bilgilerle açılır
            var teacher = await _context.Teachers.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (teacher == null)
            {
                teacher = new Teacher
                {
                    FirstName = user.FirstName, LastName = user.LastName, Email = user.Email, UserId = user.Id,
                    Branch = app.Branch, AboutMe = app.AboutMe, ProfilePictureUrl = user.ProfilePictureUrl,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Teachers.Add(teacher);
                await _context.SaveChangesAsync();
                teacher.TeacherNumber = DateTime.UtcNow.ToString("yy") + teacher.Id.ToString().PadLeft(7, '0');
            }
            else
            {
                teacher.IsDeleted = false;
                teacher.DeletedAt = null;
                if (string.IsNullOrWhiteSpace(teacher.Branch)) teacher.Branch = app.Branch;
                if (string.IsNullOrWhiteSpace(teacher.AboutMe)) teacher.AboutMe = app.AboutMe;
            }

            app.Status = "Approved";
            app.ReviewedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Başvuru onaylandı; kullanıcı bir sonraki girişinde eğitmen olarak oturum açar." });
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> Reject(int id)
        {
            if (!User.IsAdmin()) return StatusCode(403, "Admin access required.");
            var app = await _context.TeacherApplications.FindAsync(id);
            if (app == null) return NotFound();
            if (app.Status != "Pending") return BadRequest("Başvuru zaten sonuçlandırılmış.");
            app.Status = "Rejected";
            app.ReviewedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Başvuru reddedildi." });
        }
    }
}
