namespace EdTechApi.Core.Entities
{
    public class Student
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? ProfilePictureUrl { get; set; }
        public string? AboutMe { get; set; }

        // Bu öğrenci kaydının hangi giriş hesabına (User) ait olduğunu belirtir.
        // Nullable, çünkü admin panelinden eklenen bir öğrencinin henüz bir giriş
        // hesabı (User) olmayabilir.
        public int? UserId { get; set; }
        public User? User { get; set; }

        // Navigation property indicating a student can have many enrollments
        public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

        // Soft-delete: "silme" işlemi artık satırı DB'den kaldırmıyor, sadece işaretliyor.
        // Böylece Raporlar sayfasındaki "Silinen Öğrenciler" gerçek veriye dayanabiliyor.
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
    }
}