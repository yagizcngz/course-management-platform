using EdTechApi.Business.Services;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EdTechApi.Business.BackgroundJobs
{
    // Günde bir: saklama süresini (30 gün) dolduran silinmiş kayıtları kalıcı kaldırır. Raporlar silinenleri bu
    // süre boyunca sayar; cüzdan hareketi olan kapatılmış hesaplar gelir geçmişi için hiç silinmez.
    public class SoftDeleteCleanupService : BackgroundService
    {
        public static readonly TimeSpan Retention = TimeSpan.FromDays(30);

        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SoftDeleteCleanupService> _logger;

        public SoftDeleteCleanupService(IServiceProvider serviceProvider, ILogger<SoftDeleteCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var removed = await PurgeAsync(db, DateTime.UtcNow - Retention, stoppingToken);
                    if (removed > 0) _logger.LogInformation("Soft-delete temizliği: {Count} satır kalıcı kaldırıldı.", removed);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    // veritabanı hazır değilse (ilk kurulum) uygulama ayakta kalır, ertesi gün yeniden denenir
                    _logger.LogError(ex, "Soft-delete temizlik görevi sırasında bir hata oluştu.");
                }

                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }

        // Testlerden de çağrılır (SQLite); yalnızca EF sorguları kullanır
        public static async Task<int> PurgeAsync(AppDbContext db, DateTime threshold, CancellationToken ct = default)
        {
            var students = await db.Students.IgnoreQueryFilters()
                .Where(s => s.IsDeleted && s.DeletedAt != null && s.DeletedAt < threshold).ToListAsync(ct);
            db.Students.RemoveRange(students); // kayıtları ve ders tamamlamaları zincirle silinir

            var teachers = await db.Teachers.IgnoreQueryFilters()
                .Where(t => t.IsDeleted && t.DeletedAt != null && t.DeletedAt < threshold).ToListAsync(ct);
            db.Teachers.RemoveRange(teachers); // kursları kalır (TeacherId null olur), talepleri zincirle silinir

            var courses = await db.Courses.IgnoreQueryFilters()
                .Where(c => c.IsDeleted && c.DeletedAt != null && c.DeletedAt < threshold).ToListAsync(ct);
            db.Courses.RemoveRange(courses);
            await db.SaveChangesAsync(ct);

            // kapatılmış hesap: cüzdan hareketi yoksa ona bağlı topluluk satırları ayıklanıp hesap silinir
            var userIds = await db.Users
                .Where(u => u.Role == AccountRetirement.DeletedRole && u.DeletedAt != null && u.DeletedAt < threshold
                            && !db.WalletTransactions.Any(w => w.UserId == u.Id))
                .Select(u => u.Id).ToListAsync(ct);
            if (userIds.Count > 0)
            {
                await db.DirectMessages.Where(m => userIds.Contains(m.SenderId) || userIds.Contains(m.RecipientId)).ExecuteDeleteAsync(ct);
                await db.Friendships.Where(f => userIds.Contains(f.RequesterId) || userIds.Contains(f.AddresseeId)).ExecuteDeleteAsync(ct);
                await db.ForumPostLikes.Where(l => userIds.Contains(l.UserId)).ExecuteDeleteAsync(ct);
                await db.ForumPosts.Where(p => p.AuthorId != null && userIds.Contains(p.AuthorId.Value))
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.AuthorId, (int?)null), ct);
                await db.ForumThreads.Where(t => t.AuthorId != null && userIds.Contains(t.AuthorId.Value))
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.AuthorId, (int?)null), ct);
                await db.SupportRequests.Where(r => r.UserId != null && userIds.Contains(r.UserId.Value))
                    .ExecuteUpdateAsync(s => s.SetProperty(r => r.UserId, (int?)null), ct);
                await db.Students.IgnoreQueryFilters().Where(s => s.UserId != null && userIds.Contains(s.UserId.Value))
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.UserId, (int?)null), ct);
                await db.Teachers.IgnoreQueryFilters().Where(t => t.UserId != null && userIds.Contains(t.UserId.Value))
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.UserId, (int?)null), ct);
                await db.Users.Where(u => userIds.Contains(u.Id)).ExecuteDeleteAsync(ct); // başvuruları zincirle silinir
            }

            return students.Count + teachers.Count + courses.Count + userIds.Count;
        }
    }
}
