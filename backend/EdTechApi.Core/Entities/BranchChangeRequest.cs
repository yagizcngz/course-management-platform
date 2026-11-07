namespace EdTechApi.Core.Entities
{
    // Öğretmenin branş değişikliği talebi; Teacher.Branch yalnızca yönetici onayıyla değişir.
    // Öğretmen başına en fazla bir Pending talep olur (yenisi eskisini geri çeker).
    public class BranchChangeRequest
    {
        public int Id { get; set; }
        public int TeacherId { get; set; }
        public Teacher Teacher { get; set; } = null!;
        public string? CurrentBranch { get; set; }
        public string RequestedBranch { get; set; } = string.Empty;
        // Pending, Approved, Rejected, Cancelled
        public string Status { get; set; } = BranchRequestStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
    }

    public static class BranchRequestStatus
    {
        public const string Pending = "Pending";
        public const string Approved = "Approved";
        public const string Rejected = "Rejected";
        public const string Cancelled = "Cancelled";
    }
}
