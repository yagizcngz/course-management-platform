using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    // Silinen giriş hesabının satırı kalır: cüzdan hareketleri (satışlar, öğretmen payları, iadeler) ona bağlı ve
    // satır silinirse raporlardaki gelir geçmişi de silinirdi. Kullanıcı adı ve e-posta boşa çıkar, giriş kapanır.
    // Finansal olmayan geçici veriler (ders ilerlemesi, bekleyen başvurular, arkadaşlıklar, beğeniler) hemen silinir;
    // forum mesajları ve gönderilmiş özel mesajlar karşı tarafın geçmişi olduğu için kalır.
    // Kayıt SaveChanges çağıranındır: değişiklikler aynı işlemde yazılır.
    public static class AccountRetirement
    {
        public const string DeletedRole = "Deleted";

        public static async Task RetireAsync(AppDbContext db, User user)
        {
            // sorgular veritabanındaki hâli okur: çağıranın bellekte UserId'yi boşaltmış olması sonucu değiştirmez
            var studentIds = await db.Students.IgnoreQueryFilters().Where(s => s.UserId == user.Id).Select(s => s.Id).ToListAsync();
            var teacherIds = await db.Teachers.IgnoreQueryFilters().Where(t => t.UserId == user.Id).Select(t => t.Id).ToListAsync();

            db.LessonCompletions.RemoveRange(await db.LessonCompletions.Where(c => studentIds.Contains(c.StudentId)).ToListAsync());
            db.CourseCompletions.RemoveRange(await db.CourseCompletions.Where(c => studentIds.Contains(c.StudentId)).ToListAsync());
            db.TeacherApplications.RemoveRange(await db.TeacherApplications.Where(a => a.UserId == user.Id && a.Status == "Pending").ToListAsync());
            db.TeachingRequests.RemoveRange(await db.TeachingRequests.Where(r => teacherIds.Contains(r.TeacherId) && r.Status == "Pending").ToListAsync());
            db.Friendships.RemoveRange(await db.Friendships.Where(f => f.RequesterId == user.Id || f.AddresseeId == user.Id).ToListAsync());
            db.ForumPostLikes.RemoveRange(await db.ForumPostLikes.Where(l => l.UserId == user.Id).ToListAsync());

            user.Username = $"deleted-{user.Id}-{Guid.NewGuid():N}";
            user.Email = $"{user.Username}@deleted.invalid";
            user.Password = string.Empty;
            user.Role = DeletedRole;
            user.AboutMe = null;
            user.ProfilePictureUrl = null;
            user.IsProfilePublic = false;
            user.FeaturedBadges = null;
            user.DeletedAt = DateTime.UtcNow;
        }
    }
}
