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
    // Arkadaşlar arası birebir mesajlaşma
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        public const int MaxBody = 2000;
        private const int HistoryLimit = 200;
        private readonly AppDbContext _context;

        public MessagesController(AppDbContext context) => _context = context;

        // Arkadaşlar ve mesajlaşılan kişiler: son mesaj ve okunmamış sayısıyla, en yeni konuşma üstte
        [HttpGet("conversations")]
        public async Task<IActionResult> Conversations()
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();

            var friendIds = await _context.Friendships.AsNoTracking()
                .Where(f => f.Status == FriendsController.Accepted && (f.RequesterId == me || f.AddresseeId == me))
                .Select(f => f.RequesterId == me ? f.AddresseeId : f.RequesterId).ToListAsync();
            var partnerIds = await _context.DirectMessages.AsNoTracking()
                .Where(m => m.SenderId == me || m.RecipientId == me)
                .Select(m => m.SenderId == me ? m.RecipientId : m.SenderId).Distinct().ToListAsync();
            var ids = friendIds.Union(partnerIds).ToList();

            var users = await _context.Users.AsNoTracking().Where(u => ids.Contains(u.Id) && u.Role != AccountRetirement.DeletedRole)
                .Select(CommunityHelpers.ToCard).ToListAsync();
            var last = await _context.DirectMessages.AsNoTracking()
                .Where(m => (m.SenderId == me && ids.Contains(m.RecipientId)) || (m.RecipientId == me && ids.Contains(m.SenderId)))
                .GroupBy(m => m.SenderId == me ? m.RecipientId : m.SenderId)
                .Select(g => new
                {
                    PartnerId = g.Key,
                    Last = g.OrderByDescending(m => m.Id).Select(m => new { m.Body, m.CreatedAt, m.SenderId }).First(),
                    Unread = g.Count(m => m.RecipientId == me && m.ReadAt == null)
                })
                .ToListAsync();

            return Ok(users.Select(u =>
            {
                var l = last.FirstOrDefault(x => x.PartnerId == u.Id);
                return new
                {
                    user = u,
                    isFriend = friendIds.Contains(u.Id),
                    lastMessage = l?.Last.Body,
                    lastAt = l?.Last.CreatedAt,
                    lastFromMe = l?.Last.SenderId == me,
                    unread = l?.Unread ?? 0
                };
            }).OrderByDescending(c => c.lastAt ?? DateTime.MinValue).ThenBy(c => c.user.Username));
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> UnreadCount()
        {
            var me = await _context.CurrentUserIdAsync(User);
            return Ok(new { count = await _context.DirectMessages.CountAsync(m => m.RecipientId == me && m.ReadAt == null) });
        }

        // Konuşma geçmişi (son 200 mesaj); gelen okunmamışlar okundu işaretlenir
        [HttpGet("{userId:int}")]
        public async Task<IActionResult> History(int userId)
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            var messages = await _context.DirectMessages.AsNoTracking()
                .Where(m => (m.SenderId == me && m.RecipientId == userId) || (m.SenderId == userId && m.RecipientId == me))
                .OrderByDescending(m => m.Id).Take(HistoryLimit)
                .Select(m => new { m.Id, m.Body, m.CreatedAt, m.ReadAt, fromMe = m.SenderId == me })
                .ToListAsync();
            await _context.DirectMessages.Where(m => m.SenderId == userId && m.RecipientId == me && m.ReadAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.ReadAt, DateTime.UtcNow));
            messages.Reverse();
            return Ok(messages);
        }

        [EnableRateLimiting("community")]

        [HttpPost("{userId:int}")]
        public async Task<IActionResult> Send(int userId, [FromBody] NewPostRequest request)
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            var body = request.Body?.Trim() ?? "";
            if (body.Length == 0 || body.Length > MaxBody) return BadRequest($"Mesaj 1-{MaxBody} karakter olmalıdır.");
            var friends = await _context.Friendships.AnyAsync(f => f.Status == FriendsController.Accepted
                && ((f.RequesterId == me && f.AddresseeId == userId) || (f.RequesterId == userId && f.AddresseeId == me)));
            if (!friends) return StatusCode(403, "Yalnızca arkadaşlarınıza mesaj gönderebilirsiniz.");

            var message = new DirectMessage { SenderId = me.Value, RecipientId = userId, Body = body };
            _context.DirectMessages.Add(message);
            await _context.SaveChangesAsync();
            return Ok(new { message.Id, message.Body, message.CreatedAt, message.ReadAt, fromMe = true });
        }
    }
}
