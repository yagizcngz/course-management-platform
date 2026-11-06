using EdTechApi.API.Helpers;
using EdTechApi.Business.Services;
using EdTechApi.Core.Constants;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static EdTechApi.API.Helpers.CommunityHelpers;

namespace EdTechApi.API.Controllers
{
    // Herkese açık topluluk forumu: okumak serbest, yazmak/beğenmek giriş ister
    [Route("api/[controller]")]
    [ApiController]
    public class ForumController : ControllerBase
    {
        public const int MaxTitle = 160;
        public const int MaxBody = 4000;
        private const int PageSize = 50;
        private readonly AppDbContext _context;

        public ForumController(AppDbContext context) => _context = context;

        [HttpGet("topics")]
        public async Task<IActionResult> Topics()
        {
            var stats = await _context.ForumThreads.AsNoTracking()
                .GroupBy(t => t.Topic)
                .Select(g => new { Topic = g.Key, Threads = g.Count(), Posts = g.Sum(t => t.Posts.Count), Last = g.Max(t => t.LastActivityAt) })
                .ToListAsync();
            return Ok(ForumTopics.All.Select(slug =>
            {
                var s = stats.FirstOrDefault(x => x.Topic == slug);
                return new { slug, threads = s?.Threads ?? 0, posts = s?.Posts ?? 0, lastActivityAt = s?.Last };
            }));
        }

        // shortcut: en yeni 50 başlık; sayfalama forum büyüyünce eklenir
        [HttpGet("topics/{slug}/threads")]
        public async Task<IActionResult> Threads(string slug)
        {
            if (!ForumTopics.All.Contains(slug)) return NotFound();
            var threads = await _context.ForumThreads.AsNoTracking()
                .Where(t => t.Topic == slug)
                .OrderByDescending(t => t.LastActivityAt)
                .Take(PageSize)
                .Select(t => new
                {
                    t.Id, t.Title, t.CreatedAt, t.LastActivityAt,
                    replies = t.Posts.Count - 1,
                    excerpt = t.Posts.OrderBy(p => p.Id).Select(p => p.Body.Substring(0, Math.Min(p.Body.Length, 180))).FirstOrDefault(),
                    author = t.Author == null || t.Author.Role == AccountRetirement.DeletedRole ? null
                        : new UserCard(t.Author.Id, t.Author.Username, t.Author.FirstName, t.Author.LastName, t.Author.Role, t.Author.ProfilePictureUrl)
                })
                .ToListAsync();
            return Ok(threads);
        }

        [HttpGet("threads/{id:int}")]
        public async Task<IActionResult> Thread(int id)
        {
            var me = await _context.CurrentUserIdAsync(User);
            var thread = await _context.ForumThreads.AsNoTracking().Where(t => t.Id == id)
                .Select(t => new { t.Id, t.Topic, t.Title, t.CreatedAt, t.AuthorId })
                .FirstOrDefaultAsync();
            if (thread == null) return NotFound("Başlık bulunamadı.");

            var posts = await _context.ForumPosts.AsNoTracking().Where(p => p.ThreadId == id)
                .OrderBy(p => p.Id)
                .Select(p => new
                {
                    p.Id, p.Body, p.CreatedAt,
                    likes = p.Likes.Count,
                    likedByMe = me != null && p.Likes.Any(l => l.UserId == me),
                    author = p.Author == null || p.Author.Role == AccountRetirement.DeletedRole ? null
                        : new UserCard(p.Author.Id, p.Author.Username, p.Author.FirstName, p.Author.LastName, p.Author.Role, p.Author.ProfilePictureUrl)
                })
                .ToListAsync();
            return Ok(new { thread.Id, thread.Topic, thread.Title, thread.CreatedAt, posts });
        }

        [Authorize]
        [HttpPost("topics/{slug}/threads")]
        public async Task<IActionResult> CreateThread(string slug, [FromBody] NewThreadRequest request)
        {
            if (!ForumTopics.All.Contains(slug)) return NotFound();
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            var title = request.Title?.Trim() ?? "";
            var body = request.Body?.Trim() ?? "";
            if (title.Length < 4 || title.Length > MaxTitle) return BadRequest($"Başlık 4-{MaxTitle} karakter olmalıdır.");
            if (body.Length < 2 || body.Length > MaxBody) return BadRequest($"Mesaj 2-{MaxBody} karakter olmalıdır.");

            var thread = new ForumThread { Topic = slug, Title = title, AuthorId = me };
            thread.Posts.Add(new ForumPost { AuthorId = me, Body = body });
            _context.ForumThreads.Add(thread);
            await _context.SaveChangesAsync();
            return Ok(new { thread.Id });
        }

        [Authorize]
        [HttpPost("threads/{id:int}/posts")]
        public async Task<IActionResult> Reply(int id, [FromBody] NewPostRequest request)
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            var thread = await _context.ForumThreads.FindAsync(id);
            if (thread == null) return NotFound("Başlık bulunamadı.");
            var body = request.Body?.Trim() ?? "";
            if (body.Length < 2 || body.Length > MaxBody) return BadRequest($"Mesaj 2-{MaxBody} karakter olmalıdır.");

            var post = new ForumPost { ThreadId = id, AuthorId = me, Body = body };
            _context.ForumPosts.Add(post);
            thread.LastActivityAt = post.CreatedAt;
            await _context.SaveChangesAsync();
            return Ok(new { post.Id });
        }

        // beğeni aç/kapa
        [Authorize]
        [HttpPost("posts/{id:int}/like")]
        public async Task<IActionResult> Like(int id)
        {
            var me = await _context.CurrentUserIdAsync(User);
            if (me == null) return Unauthorized();
            if (!await _context.ForumPosts.AnyAsync(p => p.Id == id)) return NotFound();
            var like = await _context.ForumPostLikes.FindAsync(id, me.Value);
            if (like == null) _context.ForumPostLikes.Add(new ForumPostLike { PostId = id, UserId = me.Value });
            else _context.ForumPostLikes.Remove(like);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // eşzamanlı iki tıklama: diğer istek zaten yazdı, sonuç aynı
            }
            return Ok(new { liked = like == null, likes = await _context.ForumPostLikes.CountAsync(l => l.PostId == id) });
        }

        // Yazar veya yönetici siler; başlığın ilk mesajı silinirse başlık da gider
        [Authorize]
        [HttpDelete("posts/{id:int}")]
        public async Task<IActionResult> DeletePost(int id)
        {
            var me = await _context.CurrentUserIdAsync(User);
            var post = await _context.ForumPosts.Include(p => p.Thread).FirstOrDefaultAsync(p => p.Id == id);
            if (post == null) return NotFound();
            if (post.AuthorId != me && !User.IsAdmin()) return StatusCode(403, "Bu mesajı silemezsiniz.");

            var isOpening = !await _context.ForumPosts.AnyAsync(p => p.ThreadId == post.ThreadId && p.Id < post.Id);
            if (isOpening) _context.ForumThreads.Remove(post.Thread!);
            else _context.ForumPosts.Remove(post);
            await _context.SaveChangesAsync();
            return Ok(new { threadDeleted = isOpening });
        }
    }

    public class NewThreadRequest
    {
        public string? Title { get; set; }
        public string? Body { get; set; }
    }

    public class NewPostRequest
    {
        public string? Body { get; set; }
    }
}
