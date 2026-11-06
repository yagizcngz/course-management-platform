namespace EdTechApi.Core.Entities
{
    // Davet kodu olmadan "eğitmen olarak başvur" diyen kullanıcının başvurusu. Hesap öğrenci olarak açılır;
    // yönetici onaylayınca rolü Teacher olur ve bu branş/biyografiyle öğretmen profili oluşturulur.
    public class TeacherApplication
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public string Branch { get; set; } = string.Empty;
        public string AboutMe { get; set; } = string.Empty;
        // Pending, Approved, Rejected
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }
    }
}
