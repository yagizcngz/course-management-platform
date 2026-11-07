using System.Linq.Expressions;
using System.Security.Claims;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Helpers
{
    // Forum, arkadaşlık ve mesajlaşmanın ortak parçaları
    public static class CommunityHelpers
    {
        // hesabın varlığı ve rolü OnTokenValidated'da (Program.cs) denetlenir
        public static Task<int?> CurrentUserIdAsync(this AppDbContext db, ClaimsPrincipal principal) =>
            Task.FromResult(principal.GetUserId());

        // Profil kartının küçük hâli: forumda yazar, mesajlarda karşı taraf
        public record UserCard(int Id, string Username, string FirstName, string LastName, string Role, string? ProfilePictureUrl);

        public static readonly Expression<Func<User, UserCard>> ToCard =
            u => new UserCard(u.Id, u.Username, u.FirstName, u.LastName, u.Role, u.ProfilePictureUrl);
    }
}
