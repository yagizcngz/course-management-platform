using EdTechApi.Core.Entities;

namespace EdTechApi.Business.Interfaces
{
    public interface IStudentService
    {
        Task<IEnumerable<Student>> GetAllStudentsAsync();
        Task<Student?> GetStudentByIdAsync(int id);
        Task AddStudentAsync(Student student);
        Task DeleteStudentAsync(int id);

        // Soft-delete edilmiş (silinmiş) öğrencilerin listesini döner — Raporlar sayfası için
        Task<IEnumerable<Student>> GetDeletedStudentsAsync();

        // Giriş yapan kullanıcının adı ile eşleşen Student kaydını bulur (Enrollment eşleştirmesindeki
        // ad-soyad mantığıyla aynı yaklaşım kullanılıyor, çünkü User <-> Student arasında henüz bir FK yok)
        Task<bool> UpdateStudentAsync(int id, Student updatedStudent);
    }
}