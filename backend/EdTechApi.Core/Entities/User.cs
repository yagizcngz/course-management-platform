namespace EdTechApi.Core.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        // YENİ EKLENEN ALANLAR
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty; // EKLENDİ

        public string Role { get; set; } = "User";
        public string? AboutMe { get; set; }
        public string? ProfilePictureUrl { get; set; }
        
        // Yeni eklenen ayar alanları
        public bool IsProfilePublic { get; set; } = true;
        public bool ReceiveEmailNotifications { get; set; } = true;

        // Cüzdan bakiyesi (simüle; gerçek ödeme yok). Hareketler WalletTransactions'da.
        public decimal Balance { get; set; }
    }
}