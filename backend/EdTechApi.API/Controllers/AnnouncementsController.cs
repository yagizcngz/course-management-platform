using EdTechApi.API.Helpers;
using EdTechApi.Business.Interfaces;
using EdTechApi.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AnnouncementsController : ControllerBase
    {
        private readonly IAnnouncementService _announcementService;

        public AnnouncementsController(IAnnouncementService announcementService)
        {
            _announcementService = announcementService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AnnouncementDto>>> GetAllActive()
        {
            var announcements = await _announcementService.GetActiveAnnouncementsAsync();
            return Ok(announcements);
        }

        [Authorize(Roles = RoleNames.Admins)]
        [HttpPost]
        public async Task<ActionResult<AnnouncementDto>> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest("Title and Content are required.");
            }

            var announcement = await _announcementService.AddAnnouncementAsync(request.Title, request.Content);
            return Ok(announcement);
        }

        [Authorize(Roles = RoleNames.Admins)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Remove(int id) =>
            await _announcementService.RemoveAnnouncementAsync(id) ? NoContent() : NotFound("Duyuru bulunamadı.");
    }

    public class CreateAnnouncementRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
