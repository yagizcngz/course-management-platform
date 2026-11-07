using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EdTechApi.Business.Services;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Helpers
{
    // [Authorize(Roles = ...)] için: yöneticinin her yazımı IsAdmin() ile aynı kabul edilir
    public static class RoleNames
    {
        public const string Admins = "Admin,SuperAdmin,superadmin";
        public const string AdminsAndTeachers = Admins + ",Teacher";
    }

    public static class ClaimsPrincipalExtensions
    {
        // Token kimliği değişmez kullanıcı Id'sidir (sub). Kullanıcı adı değişebilir ve boşalan ad başka hesaba
        // geçebilir; bu yüzden token'daki ad hiçbir zaman kimlik için okunmaz.
        public const string UsernameClaim = "edtech:db_username"; // OnTokenValidated veritabanından ekler
        public const string DisplayUsernameClaim = "username";    // yalnızca arayüzde gösterim için

        public static int? GetUserId(this ClaimsPrincipal user) =>
            int.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value,
                out var id) ? id : null;

        // Id'ye karşılık gelen güncel kullanıcı adı (her istekte veritabanından)
        public static string? GetUsername(this ClaimsPrincipal user) => user.FindFirst(UsernameClaim)?.Value;

        // Token doğrulandıktan sonra (Program.cs OnTokenValidated): hesap Id ile bulunur, rolü token'dakiyle aynı ve
        // kapatılmamış olmalı; güncel kullanıcı adı principal'a eklenir. Eski biçim token'ın sub'ı kullanıcı adıydı:
        // "username" claim'i olmayan token reddedilir, yoksa "42" adlı kullanıcının eski token'ı 42 numaralı hesap sayılırdı.
        public static async Task<bool> AttachCurrentUserAsync(this ClaimsPrincipal principal, AppDbContext db)
        {
            var userId = principal.GetUserId();
            var role = principal.FindFirst(ClaimTypes.Role)?.Value;
            if (userId == null || role == null || principal.FindFirst(DisplayUsernameClaim) == null) return false;
            var username = await db.Users
                .Where(u => u.Id == userId && u.Role == role && u.Role != AccountRetirement.DeletedRole)
                .Select(u => u.Username).FirstOrDefaultAsync();
            if (username == null || principal.Identity is not ClaimsIdentity identity) return false;
            identity.AddClaim(new Claim(UsernameClaim, username));
            return true;
        }

        public static bool IsAdmin(this ClaimsPrincipal user) =>
            user.IsInRole("Admin") || user.IsInRole("SuperAdmin") || user.IsInRole("superadmin");
    }
}
