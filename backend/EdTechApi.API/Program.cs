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

// Geliştirmede her köken açık; canlıda yalnızca Cors:AllowedOrigins (virgülle ayrılmış, ör. https://ekurs.example)
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebClient", policy =>
    {
        if (builder.Environment.IsDevelopment()) policy.AllowAnyOrigin();
        else policy.WithOrigins(allowedOrigins);
        policy.AllowAnyMethod().AllowAnyHeader();
    });
});

// HMAC-SHA256 anahtarı en az 32 bayt olmalı; kısa anahtar çevrimdışı kırılır, örnek anahtarla herkes token üretir
var jwtKey = builder.Configuration["Jwt:Key"] ?? "";
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key en az 32 bayt olmalı (appsettings.json veya ortam değişkeni Jwt__Key).");
if (jwtKey.StartsWith("YOUR_SECRET") && !builder.Environment.IsDevelopment())
    throw new InvalidOperationException("Jwt:Key hâlâ appsettings.example.json'daki örnek değer; canlıda gizli, rastgele bir anahtar verin.");

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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        // Süresi dolmamış token'ı olsa da kapatılmış (veya kullanıcı adı değişmiş) hesabın istekleri reddedilir. Rol de
        // veritabanıyla eşleşmeli: yetkisi alınan yönetici/eğitmen eski token'ıyla 3 saat daha o rolde kalamaz.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var username = EdTechApi.API.Helpers.ClaimsPrincipalExtensions.GetUsername(ctx.Principal!);
                var role = ctx.Principal!.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                if (username == null || role == null
                    || !await db.Users.AnyAsync(u => u.Username == username && u.Role == role && u.Role != AccountRetirement.DeletedRole))
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
    // Herkese açık yardım formu: IP başına saatte 5 talep, tabloyu doldurmayı ve e-posta bildirimini taşırmayı keser
    options.AddPolicy("support", http => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromHours(1) }));
});

var app = builder.Build();

if (jwtKey.StartsWith("YOUR_SECRET"))
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
// hata ara katmanı en başta: statik dosya, kimlik doğrulama ve hız sınırı hataları da ayrıntı sızdırmadan döner
app.UseMiddleware<EdTechApi.API.Middlewares.ExceptionMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

// API yalnızca JSON ve yüklenen dosyaları sunar: tarayıcı içerik türünü tahmin etmez, yanıt çerçeveye ve betiğe kapalıdır
app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h.XContentTypeOptions = "nosniff";
    h.XFrameOptions = "DENY";
    h["Referrer-Policy"] = "no-referrer";
    h.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
    await next();
});

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();