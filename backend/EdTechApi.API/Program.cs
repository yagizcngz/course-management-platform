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
builder.Services.AddScoped<IWalletService, WalletService>();
// Saklama süresi dolan silinmiş kayıtları günde bir temizler
builder.Services.AddHostedService<SoftDeleteCleanupService>();
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
        // Süresi dolmamış token'ı olsa da kapatılmış (veya kullanıcı adı değişmiş) hesabın istekleri reddedilir
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var username = EdTechApi.API.Helpers.ClaimsPrincipalExtensions.GetUsername(ctx.Principal!);
                var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                if (username == null || !await db.Users.AnyAsync(u => u.Username == username && u.Role != AccountRetirement.DeletedRole))
                    ctx.Fail("Hesap kapatılmış.");
            }
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
    // Topluluk yazma uçları (forum, beğeni, arkadaşlık, mesaj): kullanıcı başına dakikada 30 istek, spam'i keser
    options.AddPolicy("community", http => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        EdTechApi.API.Helpers.ClaimsPrincipalExtensions.GetUsername(http.User) ?? http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

if (builder.Configuration["Jwt:Key"]?.StartsWith("YOUR_SECRET") == true)
    app.Logger.LogWarning("Jwt:Key hâlâ appsettings.example.json'daki örnek değer; herkes token üretebilir. appsettings.json'da değiştirin.");

using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // geliştirmede klonlayan herkes için şema kendiliğinden güncellenir; canlıda migration bilinçli uygulanır
        if (app.Environment.IsDevelopment()) db.Database.Migrate();
        EdTechApi.API.Helpers.DataSeeder.Run(db, builder.Configuration, app.Environment.IsDevelopment());
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Seed atlandı (veritabanı hazır değil mi?)");
    }
}

// `dotnet run -- --seed-only`: şemayı ve tohum verisini yazıp çıkar (database/seed-demo.sql bu yolla üretilir)
if (args.Contains("--seed-only")) return;

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