using EdTechApi.API.Helpers;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EdTechApi.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SupportRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SupportRequestsController(AppDbContext context)
        {
            _context = context;
        }

        public class CreateSupportRequestDto
        {
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string? Phone { get; set; }
            public string Message { get; set; } = string.Empty;
        }

        // POST /api/supportrequests
        // Herkes (Guest dahil) form gönderebilir. Giriş yaptıysa UserId eklenir.
        [HttpPost]
        public async Task<IActionResult> CreateSupportRequest([FromBody] CreateSupportRequestDto dto)
        {
            int? userId = null;
            if (User.Identity?.IsAuthenticated == true)
            {
                var username = User.GetUsername();
                
                var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                if (currentUser != null)
                {
                    userId = currentUser.Id;
                    
                    // Oturum açmış kullanıcının adını ve e-postasını otomatik doldur
                    dto.Name = $"{currentUser.FirstName} {currentUser.LastName}".Trim();
                    dto.Email = currentUser.Email ?? "";
                }
            }

            // Guest kullanıcılar için boşluk kontrolü (sadece oturum açmamışsa)
            if (userId == null && (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Email)))
            {
                return BadRequest(new { message = "Name and Email are required for guest users." });
            }

            var request = new SupportRequest
            {
                UserId = userId,
                Name = dto.Name,
                Email = dto.Email,
                Phone = dto.Phone,
                Message = dto.Message,
                CreatedAt = DateTime.UtcNow,
                IsResolved = false
            };

            _context.SupportRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Support request created successfully." });
        }

        // GET /api/supportrequests
        // Sadece Admin görebilir. Tüm destek talepleri.
        [HttpGet]
        [Authorize(Roles = RoleNames.Admins)]
        public async Task<IActionResult> GetAllRequests()
        {
            var requests = await _context.SupportRequests
                .Include(r => r.User)
                .Where(r => !r.IsDeletedByAdmin)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.Id,
                    x.UserId,
                    x.Name,
                    x.Email,
                    x.Phone,
                    x.Message,
                    x.CreatedAt,
                    x.IsResolved,
                    x.ReplyMessage,
                    x.RepliedAt,
                    UserRole = x.User != null ? x.User.Role : "Guest"
                })
                .ToListAsync();

            return Ok(requests);
        }

        // GET /api/supportrequests/my-requests
        // Giriş yapan öğrenci/öğretmen kendi taleplerini ve adminin yanıtlarını görebilir.
        [HttpGet("my-requests")]
        [Authorize]
        public async Task<IActionResult> GetMyRequests()
        {
            var username = User.GetUsername();

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var requests = await _context.SupportRequests
                .AsNoTracking()
                .Where(x => x.UserId == currentUser.Id)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return Ok(requests);
        }

        public class ReplySupportRequestDto
        {
            public string ReplyMessage { get; set; } = string.Empty;
        }

        // POST /api/supportrequests/{id}/reply
        // Admin tarafından bir talebe cevap vermek
        [HttpPost("{id}/reply")]
        [Authorize(Roles = RoleNames.Admins)]
        public async Task<IActionResult> ReplyToRequest(int id, [FromBody] ReplySupportRequestDto dto)
        {
            var request = await _context.SupportRequests.FindAsync(id);
            if (request == null)
            {
                return NotFound("Support request not found.");
            }

            request.ReplyMessage = dto.ReplyMessage;
            request.RepliedAt = DateTime.UtcNow;
            request.IsResolved = true;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Reply sent successfully." });
        }

        // DELETE /api/supportrequests/clear-resolved
        [HttpDelete("clear-resolved")]
        [Authorize(Roles = RoleNames.Admins)]
        public async Task<IActionResult> ClearResolvedRequests()
        {
            var resolvedRequests = await _context.SupportRequests
                .Where(x => x.IsResolved)
                .ToListAsync();

            if (resolvedRequests.Any())
            {
                foreach(var req in resolvedRequests)
                {
                    req.IsDeletedByAdmin = true;
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Resolved requests cleared." });
        }

        // DELETE /api/supportrequests/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = RoleNames.Admins)]
        public async Task<IActionResult> DeleteRequest(int id)
        {
            var request = await _context.SupportRequests.FindAsync(id);
            if (request == null) return NotFound("Support request not found.");

            request.IsDeletedByAdmin = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Request deleted." });
        }
    }
}
