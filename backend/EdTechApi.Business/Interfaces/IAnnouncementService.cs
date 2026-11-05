using System.Collections.Generic;
using System.Threading.Tasks;
using EdTechApi.Core.DTOs;

namespace EdTechApi.Business.Interfaces
{
    public interface IAnnouncementService
    {
        Task<IEnumerable<AnnouncementDto>> GetActiveAnnouncementsAsync();
        Task<AnnouncementDto> AddAnnouncementAsync(string title, string content);
        // Duyuruyu yayından kaldırır (satır silinmez); bulunamazsa false
        Task<bool> RemoveAnnouncementAsync(int id);
    }
}
