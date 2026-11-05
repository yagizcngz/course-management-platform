using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EdTechApi.Business.Interfaces;
using EdTechApi.Core.DTOs;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    public class AnnouncementService : IAnnouncementService
    {
        private readonly AppDbContext _context;

        public AnnouncementService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AnnouncementDto>> GetActiveAnnouncementsAsync()
        {
            return await _context.Announcements
                .Where(a => a.IsActive)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AnnouncementDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Content = a.Content,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<bool> RemoveAnnouncementAsync(int id)
        {
            var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id && a.IsActive);
            if (announcement == null) return false;
            announcement.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<AnnouncementDto> AddAnnouncementAsync(string title, string content)
        {
            var announcement = new EdTechApi.Core.Entities.Announcement
            {
                Title = title,
                Content = content,
                IsActive = true,
                CreatedAt = System.DateTime.UtcNow
            };

            await _context.Announcements.AddAsync(announcement);
            await _context.SaveChangesAsync();

            return new AnnouncementDto
            {
                Id = announcement.Id,
                Title = announcement.Title,
                Content = announcement.Content,
                CreatedAt = announcement.CreatedAt
            };
        }
    }
}
