using EdTechApi.Business.Interfaces;
using EdTechApi.Business.Services;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;
using FluentValidation;
using FluentValidation.AspNetCore;
using EdTechApi.Business.ValidationRules;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

using EdTechApi.Business.BackgroundJobs;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Database Context and tell it where the migrations live
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("EdTechApi.DataAccess")
    ));

// Add MemoryCache for OTP storage
builder.Services.AddMemoryCache();

// Servis kayıtları
builder.Services.AddScoped<IEmailService, EmailService>();

// 2. Add Dependency Injection for our Business Services
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();
builder.Services.AddScoped<ITeacherService, TeacherService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
// Arka plan görevini sisteme dahil ediyoruz
// builder.Services.AddHostedService<EdTechApi.Business.BackgroundJobs.SoftDeleteCleanupService>();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<StudentValidator>();

// Add standard API services
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebClient",
        policy => policy.AllowAnyOrigin() // Geliştirme aşamasında her yere açık, canlıda sadece kendi domainimizi yazarız
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });
builder.Services.AddOpenApi();

// Giriş/kayıt uç noktaları: IP başına dakikada 10 istek
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", http => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});


var app = builder.Build();

if (builder.Configuration["Jwt:Key"]?.StartsWith("YOUR_SECRET") == true)
    app.Logger.LogWarning("Jwt:Key hâlâ appsettings.example.json'daki örnek değer; herkes token üretebilir. appsettings.json'da değiştirin.");

// İlk yönetici: hiç Admin yoksa Seed:AdminUsername/AdminPassword ayarından oluşturulur
using (var scope = app.Services.CreateScope())
{
    var seedUser = builder.Configuration["Seed:AdminUsername"];
    var seedPass = builder.Configuration["Seed:AdminPassword"];
    if (!string.IsNullOrWhiteSpace(seedUser) && !string.IsNullOrWhiteSpace(seedPass))
    {
        try
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (!db.Users.Any(u => u.Role == "Admin") && !db.Users.Any(u => u.Username == seedUser))
            {
                db.Users.Add(new EdTechApi.Core.Entities.User
                {
                    Username = seedUser,
                    Password = BCrypt.Net.BCrypt.HashPassword(seedPass),
                    Role = "Admin",
                    FirstName = "Admin",
                    Email = builder.Configuration["Seed:AdminEmail"] ?? ""
                });
                db.SaveChanges();
            }
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Admin seed atlandı (veritabanı hazır değil mi?)");
        }
    }
}

app.UseCors("AllowWebClient");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseMiddleware<EdTechApi.API.Middlewares.ExceptionMiddleware>();
app.MapControllers();

app.Run();