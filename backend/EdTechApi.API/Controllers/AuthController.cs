using EdTechApi.API.Helpers;
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
        public const int MaxTeacherBio = 2000;
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

            // aynı adrese dakikada bir kod: IP başına sınır, farklı IP'lerden bir kişinin kutusunu doldurmayı durdurmaz
            var cooldownKey = $"otp-sent:{request.Email.ToLowerInvariant()}";
            if (_memoryCache.TryGetValue(cooldownKey, out _))
                return StatusCode(429, "Bu adrese az önce kod gönderildi. Lütfen bir dakika sonra tekrar deneyin.");
            _memoryCache.Set(cooldownKey, true, TimeSpan.FromMinutes(1));

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

        // Herkese açık kayıt: yalnızca öğrenci hesabı açar; eğitmen adayının başvurusu yönetici onayına düşer.
        // Yönetici veya eğitmen hesabı bu uçtan hiçbir koşulda açılmaz (bkz. AdminCreate).
        [EnableRateLimiting("auth")]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
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

            var invalid = await ValidateAccountAsync(request.Email, request.Username, request.Password);
            if (invalid != null) return BadRequest(invalid);

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

            var newUser = await CreateAccountAsync(request.FirstName, request.LastName, request.Username, request.Email,
                request.Password, "User", null, request.ApplyAsTeacher ? aboutMe : null,
                request.ApplyAsTeacher ? new TeacherApplication { Branch = branch!, AboutMe = aboutMe! } : null);

            // Kayıt başarılı olduysa kodu önbellekten siliyoruz (tek kullanımlık)
            _memoryCache.Remove(request.Email);
            _memoryCache.Remove($"otp-fail:{request.Email}");

            return Ok(new
            {
                message = request.ApplyAsTeacher
                    ? "Hesabınız oluşturuldu. Eğitmen başvurunuz yönetici onayına gönderildi; onaylanana kadar öğrenci olarak giriş yapabilirsiniz."
                    : "Kullanıcı başarıyla oluşturuldu.",
                role = newUser.Role,
                teacherApplication = request.ApplyAsTeacher ? "Pending" : null
            });
        }

        // Yönetici panelinden öğrenci, eğitmen veya yönetici hesabı açma. Yetki JWT'deki rolden gelir; e-posta doğrulaması gerekmez.
        [Authorize(Roles = RoleNames.Admins)]
        [HttpPost("admin-create")]
        public async Task<IActionResult> AdminCreate([FromBody] AdminCreateUserRequest request)
        {
            if (request.Role is not ("User" or "Teacher" or "Admin"))
                return BadRequest("Geçersiz rol.");
            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
                return BadRequest("Ad ve soyad zorunludur.");
            var invalid = await ValidateAccountAsync(request.Email, request.Username, request.Password);
            if (invalid != null) return BadRequest(invalid);

            var user = await CreateAccountAsync(request.FirstName.Trim(), request.LastName.Trim(), request.Username.Trim(),
                request.Email.Trim(), request.Password, request.Role, request.Branch?.Trim(), null, null);
            return Ok(new { message = "Kullanıcı oluşturuldu.", user.Id, role = user.Role });
        }

        private async Task<string?> ValidateAccountAsync(string email, string username, string password)
        {
            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
                return "Geçerli bir e-posta adresi giriniz.";
            if (string.IsNullOrWhiteSpace(username))
                return "Kullanıcı adı zorunludur.";
            if (UsernameError(username) is { } usernameError)
                return usernameError;
            if ((password ?? "").Length < MinPasswordLength)
                return $"Şifre en az {MinPasswordLength} karakter olmalıdır.";
            if (await _context.Users.AnyAsync(u => u.Username == username))
                return "Bu kullanıcı adı zaten alınmış.";
            if (await _context.Users.AnyAsync(u => u.Email == email))
                return "Bu e-posta adresi zaten kullanımda.";
            return null;
        }

        // Harf, rakam, _ . - ve 3-30 karakter. "@" yasak: giriş e-postayla da yapıldığından başkasının e-postası
        // kullanıcı adı olursa iki hesap aynı girdiyle eşleşir.
        public static string? UsernameError(string? username) =>
            System.Text.RegularExpressions.Regex.IsMatch(username ?? "", @"^[\p{L}\p{N}_.\-]{3,30}$")
                ? null : "Geçerli bir kullanıcı adı giriniz.";

        // eşleşen kullanıcı yokken de BCrypt çalışır: yanıt süresi hesabın var olup olmadığını ele vermez
        private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword("timing-equaliser");

        // Giriş hesabı ve role uygun profil (öğrenci veya eğitmen) tek işlemde açılır
        private async Task<User> CreateAccountAsync(string firstName, string lastName, string username, string email,
            string password, string role, string? branch, string? aboutMe, TeacherApplication? application)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            var newUser = new User
            {
                Username = username,
                Password = BCrypt.Net.BCrypt.HashPassword(password),
                Role = role,
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                AboutMe = aboutMe
            };
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            var yearPrefix = DateTime.UtcNow.ToString("yy");
            if (role == "User")
            {
                var student = new Student { FirstName = firstName, LastName = lastName, Email = email, UserId = newUser.Id };
                _context.Students.Add(student);
                await _context.SaveChangesAsync();
                student.StudentNumber = yearPrefix + student.Id.ToString().PadLeft(7, '0');
                if (application != null)
                {
                    application.UserId = newUser.Id;
                    _context.TeacherApplications.Add(application);
                }
                await _context.SaveChangesAsync();
            }
            else if (role == "Teacher")
            {
                var teacher = new Teacher { FirstName = firstName, LastName = lastName, Email = email, UserId = newUser.Id, Branch = branch };
                _context.Teachers.Add(teacher);
                await _context.SaveChangesAsync();
                teacher.TeacherNumber = yearPrefix + teacher.Id.ToString().PadLeft(7, '0');
                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();
            return newUser;
        }

        [EnableRateLimiting("auth")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // kilit hesap + IP başına: başka bir IP'den yanlış parola denemek gerçek sahibini hesabından atamaz
            var lockKey = $"login-fail:{request.Username?.ToLowerInvariant()}:{HttpContext.Connection.RemoteIpAddress}";
            if (_memoryCache.TryGetValue(lockKey, out int failures) && failures >= MaxLoginFailures)
                return StatusCode(429, "Çok fazla hatalı giriş denemesi. Lütfen 5 dakika sonra tekrar deneyin.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username || u.Email == request.Username);

            // kapatılmış hesabın parolası yoktur; doğrulamaya hiç girmez
            var passwordOk = BCrypt.Net.BCrypt.Verify(request.Password ?? "", user?.Password is { Length: > 0 } hash ? hash : DummyHash);
            if (user == null || user.Role == EdTechApi.Business.Services.AccountRetirement.DeletedRole || !passwordOk)
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

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                // kimlik değişmez Id'dir; kullanıcı adı yalnızca arayüzde gösterim için taşınır
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimsPrincipalExtensions.DisplayUsernameClaim, user.Username),
                new Claim(ClaimsPrincipalExtensions.SecurityStampClaim, ClaimsPrincipalExtensions.SecurityStamp(user.Password)),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}".Trim()),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(180),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string? GetCurrentUsername()
        {
            return User.GetUsername();
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string VerificationCode { get; set; } = string.Empty;

        // Eğitmen başvurusu: hesap öğrenci olarak açılır, başvuru yönetici onayına gider
        public bool ApplyAsTeacher { get; set; }
        public string? Branch { get; set; }
        public string? AboutMe { get; set; }
    }

    public class AdminCreateUserRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "User"; // User | Teacher | Admin
        public string? Branch { get; set; }
    }

    public class SendVerificationEmailRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}