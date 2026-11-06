using EdTechApi.API.Helpers;
using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FriendsController : ControllerBase
    {
        public const string Accepted = "Accepted";
        public const string Pending = "Pending";
        private readonly AppDbContext _context;

        public FriendsController(AppDbContext context) => _context = context;

        [HttpGet]
        public async Task<IActionResult> List()
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            var rows = await _context.Friendships.AsNoTracking()
                .Where(f => f.RequesterId == me || f.AddresseeId == me)
                .Select(f => new
                {
                    f.Id, f.Status, f.CreatedAt,
                    outgoing = f.RequesterId == me,
                    user = f.RequesterId == me
                        ? new CommunityHelpers.UserCard(f.Addressee!.Id, f.Addressee.Username, f.Addressee.FirstName, f.Addressee.LastName, f.Addressee.Role, f.Addressee.ProfilePictureUrl)
                        : new CommunityHelpers.UserCard(f.Requester!.Id, f.Requester.Username, f.Requester.FirstName, f.Requester.LastName, f.Requester.Role, f.Requester.ProfilePictureUrl)
                })
                .ToListAsync();
            return Ok(new
            {
                friends = rows.Where(r => r.Status == Accepted),
                incoming = rows.Where(r => r.Status == Pending && !r.outgoing),
                outgoing = rows.Where(r => r.Status == Pending && r.outgoing)
            });
        }

        // Profil kartındaki düğme için: none | friends | outgoing | incoming
        [HttpGet("status/{userId:int}")]
        public async Task<IActionResult> Status(int userId)
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            var f = await Between(me.Value, userId);
            var status = f == null ? "none" : f.Status == Accepted ? "friends" : f.RequesterId == me ? "outgoing" : "incoming";
            return Ok(new { status, friendshipId = f?.Id, self = me == userId });
        }

        // Kullanıcı arama (arkadaş eklemek için); en az 2 karakter
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? q)
        {
            var me = await _context.CurrentUserIdAsync(User);
            var term = q?.Trim() ?? "";
            if (term.Length < 2) return Ok(Array.Empty<object>());
            var users = await _context.Users.AsNoTracking()
                .Where(u => u.Id != me && u.Role != AccountRetirement.DeletedRole
                            && (u.Username.Contains(term) || (u.FirstName + " " + u.LastName).Contains(term)))
                .OrderBy(u => u.Username).Take(20)
                .Select(CommunityHelpers.ToCard)
                .ToListAsync();
            return Ok(users);
        }

        // Karşı taraf zaten istek göndermişse bu çağrı onu kabul eder
        [EnableRateLimiting("community")]
        [HttpPost("requests/{userId:int}")]
        public async Task<IActionResult> Send(int userId)
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            if (me == userId) return BadRequest("Kendinize arkadaşlık isteği gönderemezsiniz.");
            if (!await _context.Users.AnyAsync(u => u.Id == userId && u.Role != AccountRetirement.DeletedRole))
                return NotFound("Kullanıcı bulunamadı.");

            var existing = await Between(me.Value, userId);
            if (existing != null)
            {
                if (existing.Status == Pending && existing.AddresseeId == me)
                {
                    existing.Status = Accepted;
                    await _context.SaveChangesAsync();
                }
                return Ok(new { status = existing.Status == Accepted ? "friends" : "outgoing", friendshipId = existing.Id });
            }

            var f = new Friendship { RequesterId = me.Value, AddresseeId = userId };
            _context.Friendships.Add(f);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict("Bu kullanıcıyla zaten bir arkadaşlık isteği var.");
            }
            return Ok(new { status = "outgoing", friendshipId = f.Id });
        }

        [EnableRateLimiting("community")]

        [HttpPost("{id:int}/accept")]
        public async Task<IActionResult> Accept(int id)
        {
            var me = await _context.CurrentUserIdAsync(User);
            var f = await _context.Friendships.FirstOrDefaultAsync(x => x.Id == id && x.AddresseeId == me && x.Status == Pending);
            if (f == null) return NotFound("İstek bulunamadı.");
            f.Status = Accepted;
            await _context.SaveChangesAsync();
            return Ok(new { status = "friends" });
        }

        // Reddet, isteği geri çek veya arkadaşlıktan çıkar
        [EnableRateLimiting("community")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Remove(int id)
        {
            var me = await _context.CurrentUserIdAsync(User);
            var f = await _context.Friendships.FirstOrDefaultAsync(x => x.Id == id && (x.RequesterId == me || x.AddresseeId == me));
            if (f == null) return NotFound("İstek bulunamadı.");
            _context.Friendships.Remove(f);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private Task<Friendship?> Between(int a, int b) => _context.Friendships
            .FirstOrDefaultAsync(f => (f.RequesterId == a && f.AddresseeId == b) || (f.RequesterId == b && f.AddresseeId == a));
    }
}
