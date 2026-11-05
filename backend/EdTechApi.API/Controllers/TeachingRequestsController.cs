using EdTechApi.API.Helpers;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TeachingRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeachingRequestsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/teachingrequests
        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] CreateTeachingRequestDto dto)
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || user.Role.ToLower() != "teacher") return StatusCode(403, "Only teachers can request to teach.");
            
            var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (teacher == null) return NotFound("Teacher profile not found.");
            
            var course = await _context.Courses.FindAsync(dto.CourseId);
            if (course == null) return NotFound("Course not found.");
            
            if (course.TeacherId == teacher.Id) return BadRequest("You are already teaching this course.");
            
            var existingRequest = await _context.TeachingRequests
                .FirstOrDefaultAsync(r => r.CourseId == dto.CourseId && r.TeacherId == teacher.Id && r.Status == "Pending");
                
            if (existingRequest != null) return BadRequest("You already have a pending request for this course.");

            if (string.IsNullOrEmpty(teacher.Branch)) return BadRequest("Profilinize kayıtlı hiçbir branş yok. Önce profilinize branş ekleyiniz.");
            
            var teacherBranches = teacher.Branch.Split(",").Select(b => b.Trim()).ToList();
            if (!teacherBranches.Any(b => string.Equals(b, course.Category, StringComparison.OrdinalIgnoreCase))) 
                return BadRequest($"Bu kursa ders verme isteği atamazsınız. {course.Category} branşına sahip değilsiniz.");


            var request = new TeachingRequest
            {
                CourseId = dto.CourseId,
                TeacherId = teacher.Id,
                Status = "Pending"
            };

            _context.TeachingRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(request);
        }

        // GET: api/teachingrequests/my-requests (For Teachers)
        [HttpGet("my-requests")]
        public async Task<IActionResult> GetMyRequests()
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || user.Role.ToLower() != "teacher") return StatusCode(403, "Only teachers can view their requests.");
            
            var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (teacher == null) return NotFound("Teacher profile not found.");

            var requests = await _context.TeachingRequests
                .Include(r => r.Course)
                .Where(r => r.TeacherId == teacher.Id)
                .Select(r => new {
                    r.Id,
                    r.CourseId,
                    CourseTitle = r.Course.Title,
                    r.Status,
                    r.CreatedAt
                })
                .ToListAsync();

            return Ok(requests);
        }

        // GET: api/teachingrequests (For Admin)
        [HttpGet]
        public async Task<IActionResult> GetAllRequests()
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || (user.Role.ToLower() != "admin" && user.Role.ToLower() != "superadmin")) return StatusCode(403, "Admin access required.");

            var requests = await _context.TeachingRequests
                .Include(r => r.Course)
                .Include(r => r.Teacher)
                .Where(r => !r.IsDeletedByAdmin)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    r.Id,
                    r.CourseId,
                    CourseTitle = r.Course.Title,
                    r.TeacherId,
                    TeacherName = r.Teacher.FirstName + " " + r.Teacher.LastName,
                    r.Status,
                    r.CreatedAt
                })
                .ToListAsync();

            return Ok(requests);
        }

        // POST: api/teachingrequests/{id}/approve
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveRequest(int id)
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || (user.Role.ToLower() != "admin" && user.Role.ToLower() != "superadmin")) return StatusCode(403, "Admin access required.");

            var request = await _context.TeachingRequests
                .Include(r => r.Course)
                .Include(r => r.Teacher)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (request == null) return NotFound();
            
            if (request.Status != "Pending") return BadRequest("Request is not pending.");
            // kurs ya da öğretmen bu arada silinmiş olabilir (soft-delete filtresi navigasyonu boş bırakır)
            if (request.Course == null || request.Teacher == null)
                return BadRequest("Kurs veya öğretmen artık mevcut değil.");

            request.Status = "Accepted";
            request.Course.TeacherId = request.TeacherId;
            request.Course.Instructor = $"{request.Teacher.FirstName} {request.Teacher.LastName}".Trim();
            
            // Reject other pending requests for the same course
            var otherRequests = await _context.TeachingRequests
                .Where(r => r.CourseId == request.CourseId && r.Id != request.Id && r.Status == "Pending")
                .ToListAsync();
                
            foreach (var r in otherRequests) {
                r.Status = "Rejected";
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        // POST: api/teachingrequests/{id}/reject
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectRequest(int id)
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || (user.Role.ToLower() != "admin" && user.Role.ToLower() != "superadmin")) return StatusCode(403, "Admin access required.");

            var request = await _context.TeachingRequests.FindAsync(id);
            if (request == null) return NotFound();
            
            if (request.Status != "Pending") return BadRequest("Request is not pending.");

            request.Status = "Rejected";
            await _context.SaveChangesAsync();
            return Ok();
        }

        // DELETE: api/teachingrequests/clear-resolved
        [HttpDelete("clear-resolved")]
        public async Task<IActionResult> ClearResolvedRequests()
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || (user.Role.ToLower() != "admin" && user.Role.ToLower() != "superadmin")) return StatusCode(403, "Admin access required.");

            var resolvedRequests = await _context.TeachingRequests
                .Where(r => r.Status != "Pending")
                .ToListAsync();

            if (resolvedRequests.Any())
            {
                foreach(var req in resolvedRequests)
                {
                    req.IsDeletedByAdmin = true;
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Resolved teaching requests cleared." });
        }

        // DELETE: api/teachingrequests/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRequest(int id)
        {
            var username = User.GetUsername();
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Unauthorized();

            var request = await _context.TeachingRequests.FindAsync(id);
            if (request == null) return NotFound("Request not found.");

            if (user.Role.ToLower() == "admin" || user.Role.ToLower() == "superadmin")
            {
                // Admin soft deletes the request for themselves
                request.IsDeletedByAdmin = true;
                await _context.SaveChangesAsync();
                return Ok();
            }
            else if (user.Role.ToLower() == "teacher")
            {
                // Teacher can only delete their own pending requests
                var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
                if (teacher == null || request.TeacherId != teacher.Id) return StatusCode(403, "Forbidden");

                if (request.Status != "Pending") return BadRequest("Only pending requests can be deleted.");

                _context.TeachingRequests.Remove(request);
                await _context.SaveChangesAsync();
                return Ok();
            }

            return StatusCode(403, "Forbidden");
        }
    }
    
    public class CreateTeachingRequestDto {
        public int CourseId { get; set; }
    }
}
