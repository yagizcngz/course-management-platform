using EdTechApi.Core.Entities;

namespace EdTechApi.Business.Interfaces
{
    public interface ITeacherService
    {
        Task<IEnumerable<Teacher>> GetAllTeachersAsync();
        Task<Teacher?> GetTeacherByIdAsync(int id);
        Task AddTeacherAsync(Teacher teacher);
        Task<bool> UpdateTeacherAsync(int id, Teacher updatedTeacher);
        Task DeleteTeacherAsync(int id);

        // Soft-delete edilmiş (silinmiş) öğretmenlerin listesini döner — Raporlar sayfası için
        Task<IEnumerable<Teacher>> GetDeletedTeachersAsync();

        // Branş değişikliği talebi: öğretmen ister (bekleyen eskisinin yerine geçer), yönetici onaylar veya reddeder.
        // Hatalar: KeyNotFoundException (yok), ArgumentException (geçersiz branş), InvalidOperationException (kural).
        Task<EdTechApi.Business.Services.BranchRequestView?> GetLatestBranchRequestAsync(int teacherId);
        Task<List<EdTechApi.Business.Services.BranchRequestView>> GetBranchRequestsAsync(bool pendingOnly);
        Task<EdTechApi.Business.Services.BranchRequestView> RequestBranchChangeAsync(int teacherId, string? requested);
        Task<bool> CancelBranchRequestAsync(int teacherId);
        Task ReviewBranchRequestAsync(int requestId, bool approve);

        // Eğitmen paneli: giriş yapan eğitmenin kursları için öğrenci, mezun, satış, iade ve kazanç; eğitmen değilse null
        Task<List<EdTechApi.Business.Services.CourseAnalytics>?> GetAnalyticsForUserAsync(int userId);
    }
}