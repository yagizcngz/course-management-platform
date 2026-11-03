namespace EdTechApi.Core.Entities
{
    // Bir kursun video dersi. VideoUrl yüklenen dosyanın göreli yolu (/uploads/videos/..) veya dış bir bağlantı olabilir.
    public class Lesson
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public Course? Course { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? VideoUrl { get; set; }
        public int Order { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
    }
}
