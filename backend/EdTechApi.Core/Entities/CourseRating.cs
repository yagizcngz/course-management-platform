namespace EdTechApi.Core.Entities
{
    // Öğrencinin bir kursa verdiği yıldız (1-5); öğrenci+kurs başına bir satır, yeniden puanlamak üzerine yazar.
    public class CourseRating
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public int StudentId { get; set; }
        public int Stars { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
