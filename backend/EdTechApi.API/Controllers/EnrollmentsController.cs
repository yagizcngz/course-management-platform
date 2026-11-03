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
        private readonly AppDbContext _context;

        public EnrollmentsController(IEnrollmentService enrollmentService, AppDbContext context)
        {
            _enrollmentService = enrollmentService;
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

            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student == null)
            {
                if (user.Role.ToLower() == "teacher")
                {
                    student = new Student
                    {
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Email = user.Email,
                        CreatedAt = DateTime.UtcNow,
                        UserId = user.Id
                    };
                    _context.Students.Add(student);
                    await _context.SaveChangesAsync();
                    string yearPrefix = DateTime.UtcNow.ToString("yy");
                    student.StudentNumber = yearPrefix + student.Id.ToString().PadLeft(7, '0');
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return NotFound("Katılımcı profili bulunamadı.");
                }
            }

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
            if (user == null || (user.Role.ToLower() != "student" && user.Role.ToLower() != "user" && user.Role.ToLower() != "teacher")) return StatusCode(403, "Only participants can view their courses.");

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

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAllEnrollments()
        {
            var enrollments = await _enrollmentService.GetAllEnrollmentsAsync();
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
