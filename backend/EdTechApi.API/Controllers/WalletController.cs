using EdTechApi.Business.Services;
using EdTechApi.API.Helpers;
using EdTechApi.Business.Interfaces;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _walletService;
        private readonly AppDbContext _context;
        private readonly bool _simulatedTopUp;

        public WalletController(IWalletService walletService, AppDbContext context, IConfiguration configuration, IWebHostEnvironment env)
        {
            _walletService = walletService;
            _context = context;
            _simulatedTopUp = SimulatedTopUpEnabled(configuration, env);
        }

        // Bakiye yükleme simüle: gerçek ödeme alınmadan bakiye artar. Geliştirmede açık; test/staging ortamı
        // Wallet:SimulatedTopUp=true ile açabilir; Production'da hiçbir ayarla açılmaz (gerçek ödeme sağlayıcısı bağlanana kadar).
        public static bool SimulatedTopUpEnabled(IConfiguration configuration, IWebHostEnvironment env) =>
            !env.IsProduction() && (configuration.GetValue<bool?>("Wallet:SimulatedTopUp") ?? env.IsDevelopment());

        public record TopUpRequest(decimal Amount);

        [HttpGet("me")]
        public async Task<IActionResult> GetMine()
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == User.GetUserId());
            if (user == null) return Unauthorized();
            var transactions = await _walletService.GetTransactionsAsync(user.Id);
            var ownedCourseIds = await _walletService.GetOwnedCourseIdsAsync(user.Id);
            var purchases = await _walletService.GetActivePurchasesAsync(user.Id);
            var refundableCourseIds = purchases.Where(p => p.Refundable).Select(p => p.CourseId).ToList();
            // toplamlar bütün geçmişten (liste son 100 hareketle sınırlı): net harcama ve iadeler düşülmüş eğitmen kazancı
            var mine = _context.WalletTransactions.Where(t => t.UserId == user.Id);
            var spent = -await mine.Where(t => t.Type == "Purchase" || t.Type == "Refund").SumAsync(t => t.Amount);
            var earned = await mine.Where(t => t.Type == "Earning" || t.Type == "EarningReversal").SumAsync(t => t.Amount);
            return Ok(new
            {
                balance = user.Balance, transactions, ownedCourseIds, refundableCourseIds, purchases, spent, earned,
                refundWindowDays = (int)WalletService.RefundWindow.TotalDays,
                topUpEnabled = _simulatedTopUp
            });
        }

        [HttpPost("top-up")]
        public async Task<IActionResult> TopUp([FromBody] TopUpRequest request, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey = null)
        {
            if (!_simulatedTopUp) return NotFound();
            if (idempotencyKey?.Length > 100) return BadRequest();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == User.GetUserId());
            if (user == null) return Unauthorized();
            var role = user.Role.ToLower();
            if (role != "user" && role != "student" && role != "teacher")
                return StatusCode(403, "Sadece katılımcılar cüzdan kullanabilir.");
            var balance = await _walletService.TopUpAsync(user.Id, request.Amount, idempotencyKey);
            return Ok(new { balance });
        }

        [HttpPost("purchase/{courseId}")]
        public async Task<IActionResult> Purchase(int courseId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == User.GetUserId());
            if (user == null) return Unauthorized();
            var role = user.Role.ToLower();
            if (role != "user" && role != "student" && role != "teacher")
                return StatusCode(403, "Sadece katılımcılar kurs satın alabilir.");
            var balance = await _walletService.PurchaseCourseAsync(user, courseId);
            return Ok(new { balance, message = "Kurs satın alındı." });
        }

        [HttpPost("refund/{courseId}")]
        public async Task<IActionResult> Refund(int courseId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == User.GetUserId());
            if (user == null) return Unauthorized();
            var balance = await _walletService.RefundCourseAsync(user, courseId);
            return Ok(new { balance, message = "İade edildi." });
        }

        // Yönetici özeti: satış adedi, toplam ciro, öğretmenlere ödenen ve platform payı
        [Authorize(Roles = RoleNames.Admins)]
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            // Satış ve iadeler net hesaplanır: Purchase negatif, Refund pozitif tutar
            var sales = _context.WalletTransactions.Where(t => t.Type == "Purchase" || t.Type == "Refund");
            var gross = -(await sales.SumAsync(t => (decimal?)t.Amount) ?? 0);
            var teacherEarnings = await _context.WalletTransactions
                .Where(t => t.Type == "Earning" || t.Type == "EarningReversal").SumAsync(t => (decimal?)t.Amount) ?? 0;
            var monthly = await sales
                .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
                .Select(g => new
                {
                    g.Key.Year, g.Key.Month,
                    Revenue = -g.Sum(t => t.Amount),
                    Sales = g.Count(t => t.Type == "Purchase"),
                    Refunds = g.Count(t => t.Type == "Refund")
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();
            var topCourses = await _context.WalletTransactions
                .Where(t => (t.Type == "Purchase" || t.Type == "Refund") && t.CourseId != null)
                .GroupBy(t => new { t.CourseId, t.Description })
                .Select(g => new { CourseId = g.Key.CourseId, Title = g.Key.Description, Revenue = -g.Sum(t => t.Amount), Sales = g.Count(t => t.Type == "Purchase") - g.Count(t => t.Type == "Refund") })
                .Where(x => x.Sales > 0)
                .OrderByDescending(x => x.Revenue).Take(5)
                .ToListAsync();
            return Ok(new
            {
                sales = await _context.WalletTransactions.CountAsync(t => t.Type == "Purchase"),
                refunds = await _context.WalletTransactions.CountAsync(t => t.Type == "Refund"),
                grossRevenue = gross,
                teacherEarnings,
                platformRevenue = gross - teacherEarnings,
                totalBalances = await _context.Users.SumAsync(u => (decimal?)u.Balance) ?? 0,
                monthly,
                topCourses
            });
        }
    }
}
