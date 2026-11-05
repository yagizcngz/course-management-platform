using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

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
        public static string? GetUsername(this ClaimsPrincipal user) =>
            user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? user.Identity?.Name;

        public static bool IsAdmin(this ClaimsPrincipal user) =>
            user.IsInRole("Admin") || user.IsInRole("SuperAdmin") || user.IsInRole("superadmin");
    }
}
