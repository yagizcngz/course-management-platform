namespace EdTechApi.Core.Entities
{
    // Öğrencinin bitirdiği ders. Kayda değil öğrenciye bağlı: kurstan ayrılıp dönen öğrencinin ilerlemesi kalır.
    public class LessonCompletion
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public int LessonId { get; set; }
        public Lesson? Lesson { get; set; }
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    }
}
