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

        // Kullanıcının Student kaydını döner; öğretmense ilk seferde oluşturur. Yoksa null.
        Task<EdTechApi.Core.Entities.Student?> GetOrCreateStudentForUserAsync(EdTechApi.Core.Entities.User user);
    }
}