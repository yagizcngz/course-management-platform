using EdTechApi.API.Helpers;
using EdTechApi.Business.Interfaces;
using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
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

            var studentId = await _context.Students.Where(s => s.UserId == userId).Select(s => (int?)s.Id).FirstOrDefaultAsync();
            var teacher = await _context.Teachers.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId);
            return Ok(new { learning = await LearningAsync(studentId), teaching = await TeachingAsync(teacher), social = await SocialAsync(userId.Value) });
        }

        // Herkese açık profil kartı (forum, mesajlar, eğitmenler) ve yönetici görünümü. kind: user | student | teacher.
        // Gizli profilde öğrenme ilerlemesi ve rozetler yalnızca yöneticiye ve sahibine görünür; öğretim bilgisi zaten herkese açık.
        [AllowAnonymous]
        [HttpGet("public/{kind}/{id:int}")]
        public async Task<IActionResult> GetPublicProfile(string kind, int id)
        {
            int? userId = null, studentId = null;
            Teacher? teacher = null;
            switch (kind)
            {
                case "user":
                    userId = id;
                    break;
                case "student":
                    var s = await _context.Students.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
                    if (s == null) return NotFound();
                    (studentId, userId) = (s.Id, s.UserId);
                    break;
                case "teacher":
                    teacher = await _context.Teachers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
                    if (teacher == null) return NotFound();
                    userId = teacher.UserId;
                    break;
                default:
                    return NotFound();
            }

            var user = userId == null ? null : await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user?.Role == AccountRetirement.DeletedRole || (kind == "user" && user == null))
                return NotFound();
            if (user != null)
            {
                studentId ??= await _context.Students.Where(x => x.UserId == user.Id).Select(x => (int?)x.Id).FirstOrDefaultAsync();
                teacher ??= await _context.Teachers.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == user.Id);
            }
            // hesabı olmayan (yöneticinin eklediği) öğrenci herkese açık değildir; eğitmen zaten /egitmenler'de görünür
            if (user == null && teacher == null && !User.IsAdmin()) return NotFound();

            var full = User.IsAdmin() || (user != null && (user.IsProfilePublic || user.Id == User.GetUserId()));
            var studentRow = studentId == null ? null : await _context.Students.AsNoTracking().FirstOrDefaultAsync(x => x.Id == studentId);
            var taught = teacher == null ? null : await _context.Courses.AsNoTracking().Where(c => c.TeacherId == teacher.Id)
                .Select(c => new { c.Id, c.Title, c.Category, c.ImageUrl }).ToListAsync();

            return Ok(new
            {
                userId = user?.Id,
                username = user?.Username,
                firstName = user?.FirstName ?? teacher?.FirstName ?? studentRow?.FirstName,
                lastName = user?.LastName ?? teacher?.LastName ?? studentRow?.LastName,
                role = user?.Role ?? (teacher != null ? "Teacher" : "User"),
                aboutMe = user?.AboutMe ?? teacher?.AboutMe ?? studentRow?.AboutMe,
                profilePictureUrl = user?.ProfilePictureUrl ?? teacher?.ProfilePictureUrl ?? studentRow?.ProfilePictureUrl,
                branch = teacher?.Branch,
                joinedAt = teacher?.CreatedAt ?? studentRow?.CreatedAt,
                isPrivate = !full,
                featuredBadges = full ? SplitBadges(user?.FeaturedBadges) : null,
                learning = full ? await LearningAsync(studentId) : null,
                social = full && user != null ? await SocialAsync(user.Id) : null,
                teaching = await TeachingAsync(teacher),
                taughtCourses = taught
            });
        }

        public const int MaxFeaturedBadges = 5;

        // Profilde öne çıkarılacak rozetler (en fazla 5). Rozet kuralları arayüzde olduğu için yalnızca biçim denetlenir.
        [HttpPut("badges")]
        public async Task<IActionResult> UpdateFeaturedBadges([FromBody] FeaturedBadgesRequest request)
        {
            var username = GetCurrentUsername();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound();
            var ids = (request.BadgeIds ?? new()).Select(b => b?.Trim() ?? "").Where(b => b.Length > 0).Distinct().ToList();
            if (ids.Count > MaxFeaturedBadges)
                return BadRequest($"En fazla {MaxFeaturedBadges} rozet öne çıkarılabilir.");
            if (ids.Any(b => b.Length > 64 || b.Contains(',')))
                return BadRequest("Geçersiz rozet.");
            user.FeaturedBadges = ids.Count == 0 ? null : string.Join(",", ids);
            await _context.SaveChangesAsync();
            return Ok(new { featuredBadges = ids });
        }

        private static List<string> SplitBadges(string? value) =>
            string.IsNullOrEmpty(value) ? new() : value.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();

        private record LearningCourse(int CourseId, string Category, string Title, string? ImageUrl, int Percent,
            DateTime? StartedAt, DateTime? CompletedAt, string? Level = null);

        // Rozetlerin ham verisi. Bitirilen kurslar kalıcı bitirme kaydından (CourseCompletion) gelir: kurstan ayrılmak,
        // iade, sonradan eklenen ders veya kursun silinmesi bitişi düşürmez; aynı kursu yeniden bitirmek bir kez sayılır.
        private async Task<object?> LearningAsync(int? studentId)
        {
            if (studentId == null) return null;
            var sid = studentId.Value;
            var enrolled = await _context.Enrollments.AsNoTracking().Where(e => e.StudentId == sid)
                .Select(e => new { e.CourseId, e.Course.Category, e.Course.Title, e.Course.ImageUrl, e.Course.Level }).ToListAsync();
            var completions = (await _enrollmentService.GetCompletionsAsync(sid)).ToDictionary(c => c.CourseId);
            var progress = await _enrollmentService.GetProgressAsync(sid, enrolled.Select(c => c.CourseId).ToList());
            var lessonTimes = await _context.LessonCompletions.Where(c => c.StudentId == sid && c.Lesson != null)
                .Select(c => new { c.Lesson!.CourseId, c.CompletedAt }).ToListAsync();
            // hız rozeti için: kursta bitirilen ilk dersin anı
            var startedAt = lessonTimes.GroupBy(x => x.CourseId).ToDictionary(g => g.Key, g => g.Min(x => x.CompletedAt));
            DateTime? Started(int id) => startedAt.TryGetValue(id, out var at) ? at : null;
            var leftIds = completions.Keys.Except(enrolled.Select(e => e.CourseId)).ToList();
            var left = await _context.Courses.AsNoTracking().Where(c => leftIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => new { c.ImageUrl, c.Level });

            var courses = enrolled.Select(e => new LearningCourse(e.CourseId, e.Category, e.Title, e.ImageUrl,
                    progress[e.CourseId].Percent, Started(e.CourseId),
                    completions.GetValueOrDefault(e.CourseId)?.CompletedAt, e.Level))
                .Concat(leftIds.Select(id => completions[id]).Select(c => new LearningCourse(c.CourseId, c.Category, c.Title,
                    left.GetValueOrDefault(c.CourseId)?.ImageUrl, 100, Started(c.CourseId), c.CompletedAt,
                    left.GetValueOrDefault(c.CourseId)?.Level)));
            return new
            {
                completedLessons = await _context.LessonCompletions.CountAsync(c => c.StudentId == sid),
                // seri rozetleri için ders bitirilen günler (UTC)
                lessonDays = lessonTimes.Select(x => x.CompletedAt.ToString("yyyy-MM-dd")).Distinct().Order().ToList(),
                // izlenen video süresi: bitirilen derslerin bilinen uzunlukları
                watchedSeconds = await _context.LessonCompletions.Where(c => c.StudentId == sid && c.Lesson != null)
                    .SumAsync(c => c.Lesson!.DurationSeconds ?? 0),
                ratingsGiven = await _context.CourseRatings.CountAsync(r => r.StudentId == sid),
                courses
            };
        }

        // Topluluk rozetleri için: açtığı başlıkların ve katıldığı (başkasının açtığı) tartışmalara ilk yanıtının
        // tarihleri, kabul edilmiş arkadaş sayısı ve başkalarından aldığı beğeni. Sayılar kayıtlardan türediği için
        // rozetler geriye dönük de açılır.
        private async Task<object> SocialAsync(int userId) => new
        {
            Threads = await _context.ForumThreads.Where(t => t.AuthorId == userId).Select(t => t.CreatedAt).ToListAsync(),
            Joined = await _context.ForumPosts.Where(p => p.AuthorId == userId && p.Thread!.AuthorId != userId)
                .GroupBy(p => p.ThreadId).Select(g => g.Min(p => p.CreatedAt)).ToListAsync(),
            Friends = await _context.Friendships.CountAsync(f => f.Status == FriendsController.Accepted
                && (f.RequesterId == userId || f.AddresseeId == userId)),
            Likes = await _context.ForumPostLikes.CountAsync(l => l.UserId != userId
                && _context.ForumPosts.Any(p => p.Id == l.PostId && p.AuthorId == userId))
        };

        private async Task<object?> TeachingAsync(Teacher? teacher)
        {
            if (teacher == null) return null;
            var courses = await _context.Courses.Where(c => c.TeacherId == teacher.Id).Select(c => new { c.Id, c.Category }).ToListAsync();
            var courseIds = courses.Select(c => c.Id).ToList();
            var userId = teacher.UserId ?? 0;
            return new
            {
                JoinedAt = teacher.CreatedAt,
                Courses = courseIds.Count,
                Students = await _context.Enrollments.Where(e => courseIds.Contains(e.CourseId)).Select(e => e.StudentId).Distinct().CountAsync(),
                Lessons = await _context.Lessons.CountAsync(l => courseIds.Contains(l.CourseId)),
                Fields = courses.Select(c => c.Category).Distinct().Count(),
                // iade edilen satışlar düşülür (her iade bir pay geri alımı yazar)
                Sales = await _context.WalletTransactions.CountAsync(t => t.UserId == userId && t.Type == "Earning")
                        - await _context.WalletTransactions.CountAsync(t => t.UserId == userId && t.Type == "EarningReversal"),
                Graduates = await _context.CourseCompletions.CountAsync(c => courseIds.Contains(c.CourseId)),
                RatingsReceived = await _context.CourseRatings.CountAsync(r => courseIds.Contains(r.CourseId)),
                // en az 5 puanla ortalaması 4,5 ve üzeri olan kurslar
                TopRatedCourses = await _context.CourseRatings.Where(r => courseIds.Contains(r.CourseId))
                    .GroupBy(r => r.CourseId)
                    .Select(g => new { Count = g.Count(), Average = g.Average(r => (double)r.Stars) })
                    .CountAsync(x => x.Count >= 5 && x.Average >= 4.5),
                // yayımlanan video süresi
                ContentSeconds = await _context.Lessons.Where(l => courseIds.Contains(l.CourseId)).SumAsync(l => l.DurationSeconds ?? 0)
            };
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

            await EdTechApi.Business.Services.AccountRetirement.RetireAsync(_context, user);
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
            int? teacherId = null; // the same row the course endpoints treat as "my teacher profile"
            if (user.Role == "Teacher" || user.Role == "Eğitmen")
            {
                var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.UserId == user.Id);
                if (teacher != null)
                {
                    branch = teacher.Branch;
                    teacherId = teacher.Id;
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
                branch = branch,
                teacherId = teacherId,
                id = user.Id,
                featuredBadges = SplitBadges(user.FeaturedBadges)
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

                // branş buradan değişmez: POST /api/teachers/me/branch-request yönetici onayına gönderir
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
            return User.GetUsername();
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
    }

    public class FeaturedBadgesRequest
    {
        public List<string?>? BadgeIds { get; set; }
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