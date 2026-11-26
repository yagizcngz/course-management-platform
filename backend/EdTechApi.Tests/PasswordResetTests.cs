using System.Text.RegularExpressions;
using EdTechApi.API.Controllers;
using EdTechApi.Business.Interfaces;
using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace EdTechApi.Tests
{
    public class PasswordResetTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly MemoryCache _cache = new(new MemoryCacheOptions());
        private readonly Outbox _outbox = new();

        public PasswordResetTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();
            _db.Users.Add(new User { Username = "ayse", Email = "ayse@test.example", Password = BCrypt.Net.BCrypt.HashPassword("Old-Pass-1") });
            _db.Users.Add(new User { Username = "gone", Email = "gone@test.example", Password = "", Role = AccountRetirement.DeletedRole });
            _db.SaveChanges();
        }

        public void Dispose()
        {
            _db.Dispose();
            _cache.Dispose();
            _connection.Dispose();
        }

        private sealed class Outbox : IEmailService
        {
            public List<(string To, string Body)> Sent { get; } = new();
            public Task SendEmailAsync(string toEmail, string subject, string body)
            {
                Sent.Add((toEmail, body));
                return Task.CompletedTask;
            }
            public string LastCode => Regex.Match(Sent[^1].Body, @"\b\d{6}\b").Value;
        }

        private AuthController Auth() => new(new ConfigurationBuilder().Build(), _db, _cache, _outbox)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        private Task<IActionResult> Reset(string code, string password = "New-Pass-2") =>
            Auth().ResetPassword(new ResetPasswordRequest { Email = "ayse@test.example", Code = code, NewPassword = password });

        private string StoredHash() => _db.Users.AsNoTracking().Single(u => u.Username == "ayse").Password;

        [Fact]
        public async Task Unknown_and_closed_accounts_get_the_same_answer_and_no_mail()
        {
            Assert.IsType<OkObjectResult>(await Auth().ForgotPassword(new SendVerificationEmailRequest { Email = "nobody@test.example" }));
            Assert.IsType<OkObjectResult>(await Auth().ForgotPassword(new SendVerificationEmailRequest { Email = "gone@test.example" }));
            Assert.Empty(_outbox.Sent);
        }

        [Fact]
        public async Task Mailed_code_sets_a_new_password_once()
        {
            Assert.IsType<OkObjectResult>(await Auth().ForgotPassword(new SendVerificationEmailRequest { Email = "AYSE@test.example " }));
            var code = _outbox.LastCode;

            // a short password keeps the code so the user can retry
            Assert.IsType<BadRequestObjectResult>(await Reset(code, "short"));
            Assert.IsType<OkObjectResult>(await Reset(code));
            Assert.True(BCrypt.Net.BCrypt.Verify("New-Pass-2", StoredHash()));

            Assert.IsType<BadRequestObjectResult>(await Reset(code, "Third-Pass-3"));
            Assert.True(BCrypt.Net.BCrypt.Verify("New-Pass-2", StoredHash()));
        }

        [Fact]
        public async Task Five_wrong_codes_void_the_real_one()
        {
            await Auth().ForgotPassword(new SendVerificationEmailRequest { Email = "ayse@test.example" });
            var code = _outbox.LastCode;
            var wrong = code == "111111" ? "222222" : "111111";

            for (var i = 0; i < 5; i++)
                Assert.IsType<BadRequestObjectResult>(await Reset(wrong));
            Assert.IsType<BadRequestObjectResult>(await Reset(code));
            Assert.True(BCrypt.Net.BCrypt.Verify("Old-Pass-1", StoredHash()));
        }

        [Fact]
        public async Task A_second_request_within_a_minute_is_refused()
        {
            await Auth().ForgotPassword(new SendVerificationEmailRequest { Email = "ayse@test.example" });
            var again = Assert.IsType<ObjectResult>(await Auth().ForgotPassword(new SendVerificationEmailRequest { Email = "ayse@test.example" }));
            Assert.Equal(429, again.StatusCode);
            Assert.Single(_outbox.Sent);
        }
    }
}
