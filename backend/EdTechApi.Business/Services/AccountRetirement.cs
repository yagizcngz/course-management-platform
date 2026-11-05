using EdTechApi.Core.Entities;

namespace EdTechApi.Business.Services
{
    // Silinen giriş hesabının satırı kalır: cüzdan hareketleri (satışlar, öğretmen payları, iadeler) ona bağlı ve
    // satır silinirse raporlardaki gelir geçmişi de silinirdi. Kullanıcı adı ve e-posta boşa çıkar, giriş kapanır.
    public static class AccountRetirement
    {
        public const string DeletedRole = "Deleted";

        public static void Retire(User user)
        {
            user.Username = $"deleted-{user.Id}-{Guid.NewGuid():N}";
            user.Email = $"{user.Username}@deleted.invalid";
            user.Password = string.Empty;
            user.Role = DeletedRole;
            user.AboutMe = null;
            user.ProfilePictureUrl = null;
            user.IsProfilePublic = false;
        }
    }
}
