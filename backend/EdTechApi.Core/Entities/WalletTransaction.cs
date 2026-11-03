namespace EdTechApi.Core.Entities
{
    // Cüzdan hareketi. Amount kullanıcının bakiyesine etkisidir: TopUp/Earning pozitif, Purchase negatif.
    public class WalletTransaction
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        [System.Text.Json.Serialization.JsonIgnore]
        public User? User { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty; // TopUp | Purchase | Earning | Refund | EarningReversal
        public int? CourseId { get; set; }
        // Earning/Refund/EarningReversal hangi satın almaya ait (iade hesabı için)
        public int? RelatedTransactionId { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
