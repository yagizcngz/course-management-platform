using EdTechApi.API.Helpers;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("GuestStats")]
        public async Task<IActionResult> GetGuestStats()
        {
            var totalStudents = await _context.Students.IgnoreQueryFilters().CountAsync(s => !s.IsDeleted);
            var totalTeachers = await _context.Teachers.IgnoreQueryFilters().CountAsync(t => !t.IsDeleted);
            var totalCourses = await _context.Courses.IgnoreQueryFilters().CountAsync(c => !c.IsDeleted);

            return Ok(new
            {
                TotalStudents = totalStudents,
                TotalTeachers = totalTeachers,
                TotalCourses = totalCourses
            });
        }

        // GET: api/dashboard/pending-requests — yöneticinin bekleyen işleri; kenar çubuğu rozeti ve İstekler sekmeleri bunu okur.
        // Sayımlar İstekler sayfasındaki listelerle aynı kayıtları görür (silinmiş kurs/öğretmen ve yöneticinin sildiği istekler hariç).
        [HttpGet("pending-requests")]
        [Authorize(Roles = RoleNames.Admins)]
        public async Task<IActionResult> GetPendingRequests()
        {
            var teaching = await _context.TeachingRequests.CountAsync(r =>
                r.Status == "Pending" && !r.IsDeletedByAdmin && !r.Course.IsDeleted && !r.Teacher.IsDeleted);
            var applications = await _context.TeacherApplications.CountAsync(a => a.Status == "Pending");
            var branches = await _context.BranchChangeRequests.CountAsync(r => r.Status == BranchRequestStatus.Pending);
            var support = await _context.SupportRequests.CountAsync(r => !r.IsResolved && !r.IsDeletedByAdmin);

            return Ok(new { teaching, applications, branches, support, total = teaching + applications + branches + support });
        }
    }
}
