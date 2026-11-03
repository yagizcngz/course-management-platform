using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace EdTechApi.API.Helpers
{
    public static class ClaimsPrincipalExtensions
    {
        public static string? GetUsername(this ClaimsPrincipal user) =>
            user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        public static bool IsAdmin(this ClaimsPrincipal user) =>
            user.IsInRole("Admin") || user.IsInRole("SuperAdmin") || user.IsInRole("superadmin");
    }
}
