using Microsoft.AspNetCore.RateLimiting;
using EdTechApi.DataAccess.Context;
using EdTechApi.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using EdTechApi.Business.Interfaces;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly IMemoryCache _memoryCache;
        private readonly IEmailService _emailService;



        public AuthController(IConfiguration configuration, AppDbContext context, IMemoryCache memoryCache, IEmailService emailService)
        {
            _configuration = configuration;
            _context = context;
            _memoryCache = memoryCache;
            _emailService = emailService;
        }

        private const int MaxOtpAttempts = 5;
        public const int MinPasswordLength = 8; // kayıt ve şifre değiştirme aynı kuralı kullanır
        private const int MinTeacherBio = 40;
        private const int MaxTeacherBio = 2000;
        private const int MaxLoginFailures = 5;
        private static readonly TimeSpan LoginLockout = TimeSpan.FromMinutes(5);

        [EnableRateLimiting("auth")]
        [HttpPost("send-verification-email")]
        public async Task<IActionResult> SendVerificationEmail([FromBody] SendVerificationEmailRequest request)
        {
            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(request.Email))
                return BadRequest("Geçerli bir e-posta adresi giriniz.");

            var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (emailExists)
                return BadRequest("Bu e-posta adresi zaten kullanımda.");

            var code = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();

            _memoryCache.Set(request.Email, code, TimeSpan.FromMinutes(5));
            _memoryCache.Remove($"otp-fail:{request.Email}");

            var subject = "E-Kurs Kayıt Doğrulama Kodu";
            var body = $@"
                <h3>E-Kurs Sistemine Hoş Geldiniz!</h3>
                <p>Kayıt işleminizi tamamlamak için doğrulama kodunuz:</p>
                <h2 style='color: #4285F4;'>{code}</h2>
                <p>Bu kod 5 dakika boyunca geçerlidir.</p>
            ";

            await _emailService.SendEmailAsync(request.Email, subject, body);

            return Ok(new { message = "Doğrulama kodu e-posta adresinize gönderildi." });
        }

        [EnableRateLimiting("auth")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // Admin olan yetkililer kullanıcı/öğretmen eklerken OTP'yi atlayabilir
            bool isAdmin = User?.IsInRole("Admin") == true || User?.IsInRole("superadmin") == true;

            // E-posta OTP doğrulaması (Admin değilse zorunlu)
            if (!isAdmin)
            {
                if (!_memoryCache.TryGetValue(request.Email, out string? expectedCode) || expectedCode != request.VerificationCode)
                {
                    // Kaba kuvvete karşı: 5 yanlış denemede kod geçersiz olur, yenisi istenmeli
                    var failKey = $"otp-fail:{request.Email}";
                    var fails = _memoryCache.GetOrCreate(failKey, e => { e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5); return 0; }) + 1;
                    _memoryCache.Set(failKey, fails, TimeSpan.FromMinutes(5));
                    if (fails >= MaxOtpAttempts) _memoryCache.Remove(request.Email);
                    return BadRequest("Geçersiz veya süresi dolmuş doğrulama kodu.");
                }
                // kod burada silinmez: 5 dakikalık süresi boyunca geçerli kalır, böylece alınmış kullanıcı adı gibi
                // bir doğrulama hatasında kullanıcı yeni kod istemeden tekrar dener; kayıt tamamlanınca silinir
            }

            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(request.Email))
                return BadRequest("Geçerli bir e-posta adresi giriniz.");
            if (string.IsNullOrWhiteSpace(request.Username))
                return BadRequest("Kullanıcı adı zorunludur.");
            if ((request.Password ?? "").Length < MinPasswordLength)
                return BadRequest($"Şifre en az {MinPasswordLength} karakter olmalıdır.");

            // Kullanıcı adı veya E-posta kontrolü
            var usernameExists = await _context.Users.AnyAsync(u => u.Username == request.Username);
            if (usernameExists)
                return BadRequest("Bu kullanıcı adı zaten alınmış.");

            var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (emailExists)
                return BadRequest("Bu e-posta adresi zaten kullanımda.");

            // Eğitmen başvurusu: branş mevcut bir kategori olmalı, biyografi kısa bir özgeçmiş kadar uzun olmalı
            var branch = request.Branch?.Trim();
            var aboutMe = request.AboutMe?.Trim();
            if (request.ApplyAsTeacher)
            {
                if (string.IsNullOrEmpty(branch) || !await _context.Categories.AnyAsync(c => c.Name == branch))
                    return BadRequest("Lütfen listeden bir branş seçin.");
                if (string.IsNullOrEmpty(aboutMe) || aboutMe.Length < MinTeacherBio)
                    return BadRequest($"Eğitmen başvurusu için en az {MinTeacherBio} karakterlik bir özgeçmiş yazın.");
                if (aboutMe.Length > MaxTeacherBio)
                    return BadRequest($"Özgeçmiş en fazla {MaxTeacherBio} karakter olabilir.");
            }

            // Rol ataması: Gelen RegistrationCode'a göre karar veriyoruz
            string assignedRole = "User"; // Varsayılan Öğrenci

            if (!string.IsNullOrEmpty(request.RegistrationCode))
            {
                if (isAdmin && request.RegistrationCode == "ADMIN_BYPASS_TEACHER")
                {
                    assignedRole = "Teacher";
                }
                else
                {
                    var adminCodeSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == "ADMIN_CODE");
                    var teacherCodeSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == "TEACHER_CODE");
                    
                    string? adminCode = adminCodeSetting?.SettingValue;
                    string? teacherCode = teacherCodeSetting?.SettingValue;

                    if (!string.IsNullOrEmpty(adminCode) && request.RegistrationCode == adminCode)
                    {
                        assignedRole = "Admin";
                    }
                    else if (!string.IsNullOrEmpty(teacherCode) && request.RegistrationCode == teacherCode)
                    {
                        assignedRole = "Teacher";
                    }
                    else
                    {
                        return BadRequest(request.ApplyAsTeacher
                            ? "Davet kodu geçersiz. Kodu kontrol edin ya da alanı boş bırakıp başvurunuzu yönetici onayına gönderin."
                            : "Geçersiz Kayıt Kodu.");
                    }
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Önce Kullanıcı (User) Hesabını Oluştur
                var newUser = new User
                {
                    Username = request.Username,
                    Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    Role = assignedRole,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Email = request.Email,
                    AboutMe = request.ApplyAsTeacher ? aboutMe : null
                };

                await _context.Users.AddAsync(newUser);
                await _context.SaveChangesAsync();

                // 2. Eğer rolü 'User' ise anında bir Öğrenci (Student) profili oluştur
                if (assignedRole == "User")
                {
                    var newStudent = new Student
                    {
                        FirstName = request.FirstName,
                        LastName = request.LastName,
                        Email = request.Email, 
                        CreatedAt = DateTime.Now,
                        UserId = newUser.Id 
                    };

                    await _context.Students.AddAsync(newStudent);
                    await _context.SaveChangesAsync();

                    string yearPrefix = DateTime.Now.ToString("yy");
                    newStudent.StudentNumber = yearPrefix + newStudent.Id.ToString().PadLeft(7, '0');
                    await _context.SaveChangesAsync();

                    // davet kodu olmayan eğitmen adayı öğrenci olarak başlar, başvurusu yönetici onayını bekler
                    if (request.ApplyAsTeacher)
                    {
                        _context.TeacherApplications.Add(new TeacherApplication
                        {
                            UserId = newUser.Id, Branch = branch!, AboutMe = aboutMe!
                        });
                        await _context.SaveChangesAsync();
                    }
                }
                // 3. Eğer rolü 'Teacher' ise anında bir Öğretmen (Teacher) profili oluştur
                else if (assignedRole == "Teacher")
                {
                     var newTeacher = new Teacher
                     {
                         FirstName = request.FirstName,
                         LastName = request.LastName,
                         Email = request.Email,
                         CreatedAt = DateTime.Now,
                         UserId = newUser.Id,
                         // yalnızca yukarıda doğrulanan başvuru alanları kullanılır
                         Branch = request.ApplyAsTeacher ? branch : null,
                         AboutMe = request.ApplyAsTeacher ? aboutMe : null
                     };
                     await _context.Teachers.AddAsync(newTeacher);
                     await _context.SaveChangesAsync();

                     string teacherYearPrefix = DateTime.Now.ToString("yy");
                     newTeacher.TeacherNumber = teacherYearPrefix + newTeacher.Id.ToString().PadLeft(7, '0');
                     await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                // Kayıt başarılı olduysa kodu önbellekten siliyoruz (tek kullanımlık)
                _memoryCache.Remove(request.Email);
                _memoryCache.Remove($"otp-fail:{request.Email}");

                var pendingApplication = request.ApplyAsTeacher && assignedRole == "User";
                return Ok(new
                {
                    message = pendingApplication
                        ? "Hesabınız oluşturuldu. Eğitmen başvurunuz yönetici onayına gönderildi; onaylanana kadar öğrenci olarak giriş yapabilirsiniz."
                        : $"Kullanıcı başarıyla oluşturuldu. Atanan Rol: {assignedRole}",
                    role = assignedRole,
                    teacherApplication = pendingApplication ? "Pending" : null
                });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [EnableRateLimiting("auth")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var lockKey = $"login-fail:{request.Username?.ToLowerInvariant()}";
            if (_memoryCache.TryGetValue(lockKey, out int failures) && failures >= MaxLoginFailures)
                return StatusCode(429, "Çok fazla hatalı giriş denemesi. Lütfen 5 dakika sonra tekrar deneyin.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Username);

            // kapatılmış hesabın parolası yoktur; doğrulamaya hiç girmez
            if (user == null || user.Role == EdTechApi.Business.Services.AccountRetirement.DeletedRole
                || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
            {
                _memoryCache.Set(lockKey, failures + 1, LoginLockout);
                return Unauthorized("Geçersiz kullanıcı adı veya şifre.");
            }
            _memoryCache.Remove(lockKey);

            var tokenString = GenerateJwtToken(user);
            return Ok(new { token = tokenString });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound();

            return Ok(new
            {
                user.Id,
                user.Username,
                user.Role,
                user.AboutMe,
                user.ProfilePictureUrl,
            });
        }

        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateUserProfileRequest request)
        {
            var username = GetCurrentUsername();
            if (string.IsNullOrEmpty(username)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return NotFound();

            user.AboutMe = request.AboutMe;
            user.ProfilePictureUrl = request.ProfilePictureUrl;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Profil güncellendi." });
        }

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Username),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}".Trim()),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(180),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string? GetCurrentUsername()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.Identity?.Name;
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UpdateUserProfileRequest
    {
        public string? AboutMe { get; set; }
        public string? ProfilePictureUrl { get; set; }
    }

    public class RegisterRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        
        // YENİ EKLENEN ALANLAR
        public string Email { get; set; } = string.Empty;
        public string? RegistrationCode { get; set; } 
        public string VerificationCode { get; set; } = string.Empty; // YENİ

        // Eğitmen başvurusu: davet kodu varsa anında öğretmen, yoksa yönetici onayına giden başvuru
        public bool ApplyAsTeacher { get; set; }
        public string? Branch { get; set; }
        public string? AboutMe { get; set; }
    }

    public class SendVerificationEmailRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}