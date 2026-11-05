namespace EdTechApi.Core.DTOs
{
    public class EnrollmentDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string StudentFullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string CourseTitle { get; set; } = string.Empty;
        public int CourseId { get; set; }
        public DateTime EnrollmentDate { get; set; }
        public string Status { get; set; } = string.Empty;
        // ilerleme yalnızca öğrencinin kendi kurs listesinde (my-courses) doldurulur
        public int CompletedLessons { get; set; }
        public int TotalLessons { get; set; }
        public int ProgressPercent { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    // Kursun silinmemiş derslerinden kaçı bitti; yüzde ancak hepsi bitince 100 olur
    public record CourseProgress(int Done, int Total, DateTime? LastCompletedAt)
    {
        public int Percent => Total == 0 ? 0 : Done * 100 / Total;
        public bool IsComplete => Total > 0 && Done >= Total;
    }
}
