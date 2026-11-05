using EdTechApi.Business.Interfaces;
using EdTechApi.DataAccess.Context;
using EdTechApi.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EnrollmentsController : ControllerBase
    {
        private readonly IEnrollmentService _enrollmentService;
        private readonly IWalletService _walletService;
        private readonly AppDbContext _context;

        public EnrollmentsController(IEnrollmentService enrollmentService, IWalletService walletService, AppDbContext context)
        {
            _enrollmentService = enrollmentService;
            _walletService = walletService;
            _context = context;
        }

        [Authorize]
        [HttpPost("join/{courseId}")]
        public async Task<IActionResult> JoinCourse(int courseId)
        {
            var username = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || (user.Role.ToLower() != "student" && user.Role.ToLower() != "user" && user.Role.ToLower() != "teacher")) return StatusCode(403, "Only participants can join courses.");

            var course = await _context.Courses.Include(c => c.Teacher).FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return NotFound("Kurs bulunamadı.");
            if (course.Teacher?.UserId == user.Id) return BadRequest("Kendi kursunuza katılamazsınız.");

            // Ücretli kurslar cüzdan üzerinden satın alınır; daha önce satın alınmışsa tekrar katılım ücretsiz
            if (course.Price > 0 && !await _walletService.HasActivePurchaseAsync(user.Id, courseId))
                return BadRequest("Bu kurs ücretli. Lütfen satın alın.");

            var student = await _enrollmentService.GetOrCreateStudentForUserAsync(user);
            if (student == null) return NotFound("Katılımcı profili bulunamadı.");

            await _enrollmentService.EnrollStudentAsync(student.Id, courseId);
            return Ok(new { message = "Kursa başarıyla katıldınız!" });
        }

        [Authorize]
        [HttpDelete("leave/{courseId}")]
        public async Task<IActionResult> LeaveCourse(int courseId)
        {
            var username = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || (user.Role.ToLower() != "student" && user.Role.ToLower() != "user" && user.Role.ToLower() != "teacher")) return StatusCode(403, "Only participants can leave courses.");

            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student == null) return NotFound("Katılımcı profili bulunamadı.");

            try
            {
                await _enrollmentService.LeaveCourseAsync(student.Id, courseId);
                return Ok(new { message = "Kurstan başarıyla ayrıldınız." });
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("my-courses")]
        public async Task<IActionResult> GetMyCourses()
        {
            var username = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Unauthorized();
            // Yöneticiler kursa katılmaz; ortak sayfalar bu ucu her rol için çağırdığından 403 yerine boş liste.
            var role = user.Role.ToLower();
            if (role != "student" && role != "user" && role != "teacher") return Ok(new List<object>());

            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student == null) return Ok(new List<object>());

            var enrollments = await _enrollmentService.GetStudentEnrollmentsAsync(student.Id);
            return Ok(enrollments);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("student/{studentId}/course/{courseId}")]
    public async Task<IActionResult> Enroll(int studentId, int courseId)
    {
        await _enrollmentService.EnrollStudentAsync(studentId, courseId);
        return Ok(new { message = "Öğrenci kursa başarıyla kaydedildi!" });
    }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _enrollmentService.DeleteEnrollmentAsync(id);
            return Ok(new { message = "Kayıt başarıyla silindi." });
        }

        // Kapasite sayıları için herkes kayıtları görür; ad/numara yalnızca yöneticiye,
        // kursun öğretmenine ve kaydın sahibine gösterilir.
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetAllEnrollments()
        {
            var enrollments = (await _enrollmentService.GetAllEnrollmentsAsync()).ToList();
            if (EdTechApi.API.Helpers.ClaimsPrincipalExtensions.IsAdmin(User)) return Ok(enrollments);

            var username = EdTechApi.API.Helpers.ClaimsPrincipalExtensions.GetUsername(User);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Unauthorized();
            var myStudentId = await _context.Students.Where(s => s.UserId == user.Id).Select(s => (int?)s.Id).FirstOrDefaultAsync();
            var myCourseIds = await _context.Courses.Where(c => c.Teacher != null && c.Teacher.UserId == user.Id).Select(c => c.Id).ToListAsync();

            foreach (var e in enrollments.Where(e => e.StudentId != myStudentId && !myCourseIds.Contains(e.CourseId)))
            {
                e.StudentFullName = string.Empty;
                e.StudentNumber = string.Empty;
            }
            return Ok(enrollments);
        }

        // Silinmiş (soft-deleted) kayıtlar — Raporlar sayfasındaki "Silinen Kayıtlar" kartı için
        [Authorize(Roles = "Admin")]
        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedEnrollments()
        {
            var deleted = await _enrollmentService.GetDeletedEnrollmentsAsync();
            return Ok(deleted);
        }
    }
}
