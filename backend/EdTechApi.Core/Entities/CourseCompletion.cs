namespace EdTechApi.Core.Entities
{
    // Öğrencinin bitirdiği kurs, bittiği an yazılır ve hiç silinmez: kurstan ayrılmak, iade, sonradan eklenen ders veya
    // kursun kalıcı silinmesi rozetleri düşürmez. Kurs başına bir satır (benzersiz indeks), aynı kursu yeniden bitirmek
    // ikinci kez sayılmaz. Course'a FK yok; başlık ve alan, kurs silinse de rozet hesabı için kopyalanır.
    public class CourseCompletion
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public int CourseId { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    }
}
