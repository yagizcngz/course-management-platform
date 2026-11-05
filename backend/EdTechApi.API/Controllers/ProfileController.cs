using EdTechApi.Business.Interfaces;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly ITeacherService _teacherService;
        private readonly AppDbContext _context;
        private readonly IEnrollmentService _enrollmentService;

        public ProfileController(IStudentService studentService, ITeacherService teacherService, AppDbContext context, IEnrollmentService enrollmentService)
        {
            _studentService = studentService;
            _teacherService = teacherService;
            _context = context;
            _enrollmentService = enrollmentService;
        }

        // Rozetler için ham sayılar (öğrenme ve öğretme); rozet kuralları arayüzde, lib/badges.ts
        [HttpGet("achievements")]
        public async Task<IActionResult> GetAchievements()
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();
            var userId = await _context.Users.Where(u => u.Username == username).Select(u => (int?)u.Id).FirstOrDefaultAsync();
            if (userId == null) return NotFound();

            object? learning = null;
            var studentId = await _context.Students.Where(s => s.UserId == userId).Select(s => (int?)s.Id).FirstOrDefaultAsync();
            if (studentId != null)
            {
                var courses = await _context.Enrollments.AsNoTracking().Where(e => e.StudentId == studentId)
                    .Select(e => new { e.CourseId, e.Course.Category }).ToListAsync();
                var progress = await _enrollmentService.GetProgressAsync(studentId.Value, courses.Select(c => c.CourseId).ToList());
                learning = new
                {
                    completedLessons = await _context.LessonCompletions.CountAsync(c => c.StudentId == studentId),
                    courses = courses.Select(c => new
                    {
                        c.CourseId, c.Category, progress[c.CourseId].Percent,
                        CompletedAt = progress[c.CourseId].IsComplete ? progress[c.CourseId].LastCompletedAt : null
                    })
                };
            }

            object? teaching = null;
            var teacher = await _context.Teachers.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId);
            if (teacher != null)
            {
                var courseIds = await _context.Courses.Where(c => c.TeacherId == teacher.Id).Select(c => c.Id).ToListAsync();
                teaching = new
                {
                    JoinedAt = teacher.CreatedAt,
                    Courses = courseIds.Count,
                    Students = await _context.Enrollments.Where(e => courseIds.Contains(e.CourseId)).Select(e => e.StudentId).Distinct().CountAsync(),
                    Lessons = await _context.Lessons.CountAsync(l => courseIds.Contains(l.CourseId))
                };
            }
            return Ok(new { learning, teaching });
        }

        // Self-service account deletion; reuses the admin soft-delete so reports stay correct.
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMe()
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound();
            if (user.Role.ToLowerInvariant() is "admin" or "superadmin")
                return BadRequest("Yönetici hesapları buradan silinemez.");

            var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (teacher != null)
            {
                await _teacherService.DeleteTeacherAsync(teacher.Id);
                return NoContent();
            }

            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student != null)
            {
                await _studentService.DeleteStudentAsync(student.Id);
                return NoContent();
            }

            EdTechApi.Business.Services.AccountRetirement.Retire(user);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound();

            string? branch = null;
            if (user.Role == "Teacher" || user.Role == "Eğitmen")
            {
                var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
                if (teacher != null)
                {
                    branch = teacher.Branch;
                }
            }

            var response = new
            {
                source = user.Role.ToLower(),
                username = user.Username,
                email = user.Email,
                aboutMe = user.AboutMe,
                profilePictureUrl = user.ProfilePictureUrl,
                firstName = user.FirstName,
                lastName = user.LastName,
                isProfilePublic = user.IsProfilePublic,
                receiveEmailNotifications = user.ReceiveEmailNotifications,
                branch = branch
            };

            return Ok(response);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound("Bu hesaba karşılık gelen bir kayıt bulunamadı.");

            // Update User table
            user.AboutMe = request.AboutMe;
            user.ProfilePictureUrl = request.ProfilePictureUrl;
            user.FirstName = request.FirstName ?? user.FirstName;
            user.LastName = request.LastName ?? user.LastName;
            
            if (request.IsProfilePublic.HasValue) user.IsProfilePublic = request.IsProfilePublic.Value;
            if (request.ReceiveEmailNotifications.HasValue) user.ReceiveEmailNotifications = request.ReceiveEmailNotifications.Value;

            // Update Student table if exists
            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student != null)
            {
                student.AboutMe = request.AboutMe;
                student.ProfilePictureUrl = request.ProfilePictureUrl;
                student.FirstName = user.FirstName;
                student.LastName = user.LastName;
            }

            // Update Teacher table if exists
            var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (teacher != null)
            {
                teacher.AboutMe = request.AboutMe;
                teacher.ProfilePictureUrl = request.ProfilePictureUrl;
                teacher.FirstName = user.FirstName;
                teacher.LastName = user.LastName;

                if (request.Branch != null)
                {
                    var oldBranches = string.IsNullOrWhiteSpace(teacher.Branch) 
                        ? new List<string>() 
                        : teacher.Branch.Split(",").Select(b => b.Trim()).ToList();
                    
                    var newBranches = string.IsNullOrWhiteSpace(request.Branch)
                        ? new List<string>()
                        : request.Branch.Split(",").Select(b => b.Trim()).ToList();

                    var removedBranches = oldBranches.Except(newBranches).ToList();
                    
                    if (removedBranches.Any())
                    {
                        var activeCoursesInRemovedBranches = await _context.Courses
                            .Where(c => c.TeacherId == teacher.Id && removedBranches.Contains(c.Category))
                            .Select(c => c.Category)
                            .Distinct()
                            .ToListAsync();

                        if (activeCoursesInRemovedBranches.Any())
                        {
                            var branchesStr = string.Join(", ", activeCoursesInRemovedBranches);
                            return BadRequest($"Şu branşta verdiğiniz kurslar var: {branchesStr}. Önce o kursları silmeli veya devretmelisiniz.");
                        }
                    }

                    teacher.Branch = request.Branch;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Kullanıcı profili başarıyla güncellendi." });
        }

        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword ?? "", user.Password))
            {
                return BadRequest("Mevcut şifre hatalı.");
            }

            if ((request.NewPassword ?? "").Length < AuthController.MinPasswordLength)
                return BadRequest($"Yeni şifre en az {AuthController.MinPasswordLength} karakter olmalıdır.");

            user.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Şifreniz başarıyla değiştirildi." });
        }

        [HttpPut("change-email")]
        public async Task<IActionResult> ChangeEmail([FromBody] ChangeEmailRequest request)
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");

            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(request.NewEmail))
                return BadRequest("Geçerli bir e-posta adresi giriniz.");

            var emailExists = await _context.Users.AnyAsync(u => u.Email == request.NewEmail && u.Id != user.Id);
            if (emailExists)
                return BadRequest("Bu e-posta adresi zaten kullanımda.");

            user.Email = request.NewEmail;

            // Sync to Student/Teacher
            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (student != null) student.Email = request.NewEmail;

            var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (teacher != null) teacher.Email = request.NewEmail;

            await _context.SaveChangesAsync();
            return Ok(new { message = "E-posta adresiniz başarıyla güncellendi." });
        }

        [HttpPut("change-username")]
        public async Task<IActionResult> ChangeUsername([FromBody] ChangeUsernameRequest request)
        {
            var currentUsername = GetCurrentUsername();
            if (string.IsNullOrEmpty(currentUsername)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == currentUsername);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");

            if (string.IsNullOrWhiteSpace(request.NewUsername))
                return BadRequest("Geçerli bir kullanıcı adı giriniz.");

            var usernameExists = await _context.Users.AnyAsync(u => u.Username == request.NewUsername && u.Id != user.Id);
            if (usernameExists)
                return BadRequest("Bu kullanıcı adı zaten alınmış.");

            user.Username = request.NewUsername;
            await _context.SaveChangesAsync();

            // Return new token? Or just force re-login. Re-login is safer.
            return Ok(new { message = "Kullanıcı adınız güncellendi. Lütfen yeniden giriş yapın." });
        }

        private string? GetCurrentUsername()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.Identity?.Name;
        }
    }

    public class UpdateProfileRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? AboutMe { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public bool? IsProfilePublic { get; set; }
        public bool? ReceiveEmailNotifications { get; set; }
        public string? Branch { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ChangeEmailRequest
    {
        public string NewEmail { get; set; } = string.Empty;
    }

    public class ChangeUsernameRequest
    {
        public string NewUsername { get; set; } = string.Empty;
    }
}