namespace EdTechApi.Core.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        // parola özeti hiçbir yanıtta dışarı çıkmaz (ilişkili varlıklarla serileşse bile)
        [System.Text.Json.Serialization.JsonIgnore]
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

        // Profilde öne çıkarılan rozet kimlikleri (virgülle, en fazla 5); boşsa kazanılan ilk 5 rozet gösterilir
        public string? FeaturedBadges { get; set; }

        // Hesap kapatıldığı an (Role = "Deleted"); saklama süresi bunun üzerinden sayılır
        public DateTime? DeletedAt { get; set; }
    }
}