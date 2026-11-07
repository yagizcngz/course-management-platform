using EdTechApi.Core.DTOs;

namespace EdTechApi.Business.Interfaces
{
    public interface IEnrollmentService
    {
        Task EnrollStudentAsync(int studentId, int courseId);
        Task DeleteEnrollmentAsync(int enrollmentId);
        Task<IEnumerable<EnrollmentDto>> GetAllEnrollmentsAsync();

        Task<IEnumerable<EnrollmentDto>> GetDeletedEnrollmentsAsync();
        
        Task<IEnumerable<EnrollmentDto>> GetStudentEnrollmentsAsync(int studentId);

        Task LeaveCourseAsync(int studentId, int courseId);

        Task<Dictionary<int, CourseProgress>> GetProgressAsync(int studentId, IReadOnlyCollection<int> courseIds);

        // Dersi bitmiş sayar; tüm dersler bitince kaydın durumu "Tamamlandı" olur
        Task<CourseProgress> CompleteLessonAsync(int studentId, int courseId, int lessonId);

        // Öğrencinin bitirdiği kurslar (CourseCompletion): ayrılmak, iade veya sonradan eklenen ders bunu geri almaz
        Task<List<int>> GetCompletedCourseIdsAsync(int studentId);
        Task<List<EdTechApi.Core.Entities.CourseCompletion>> GetCompletionsAsync(int studentId);

        // Kullanıcının Student kaydını döner; öğretmense ilk seferde oluşturur. Yoksa null.
        Task<EdTechApi.Core.Entities.Student?> GetOrCreateStudentForUserAsync(EdTechApi.Core.Entities.User user);
    }
}