using System.Net;
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
        private const string Owner = "10.0.0.1", Stranger = "10.0.0.66";
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
            public string LastCode => Regex.Match(Sent[^1].Body, @">([A-Z2-9]{8})<").Groups[1].Value;
        }

        private AuthController Auth(string ip = Owner) => new(new ConfigurationBuilder().Build(), _db, _cache, _outbox)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { Connection = { RemoteIpAddress = IPAddress.Parse(ip) } }
            }
        };

        private Task<IActionResult> Ask(string email = "ayse@test.example") =>
            Auth().ForgotPassword(new SendVerificationEmailRequest { Email = email });

        private Task<IActionResult> Reset(string code, string password = "New-Pass-2", string ip = Owner) =>
            Auth(ip).ResetPassword(new ResetPasswordRequest { Email = "ayse@test.example", Code = code, NewPassword = password });

        private string StoredHash() => _db.Users.AsNoTracking().Single(u => u.Username == "ayse").Password;

        private void PassCooldown() => _cache.Remove("pw-reset-sent:ayse@test.example");

        [Fact]
        public async Task Unknown_and_closed_accounts_get_the_same_answer_and_no_mail()
        {
            Assert.IsType<OkObjectResult>(await Ask("nobody@test.example"));
            Assert.IsType<OkObjectResult>(await Ask("gone@test.example"));
            Assert.Empty(_outbox.Sent);
        }

        [Fact]
        public async Task Mailed_code_sets_a_new_password_once()
        {
            Assert.IsType<OkObjectResult>(await Ask("AYSE@test.example "));
            var code = _outbox.LastCode;
            Assert.Equal(AuthController.CodeLength, code.Length);

            // a short password keeps the code so the user can retry; lower case and a dash are fine
            Assert.IsType<BadRequestObjectResult>(await Reset(code, "short"));
            Assert.IsType<OkObjectResult>(await Reset(code[..4].ToLowerInvariant() + "-" + code[4..]));
            Assert.True(BCrypt.Net.BCrypt.Verify("New-Pass-2", StoredHash()));

            Assert.IsType<BadRequestObjectResult>(await Reset(code, "Third-Pass-3"));
            Assert.True(BCrypt.Net.BCrypt.Verify("New-Pass-2", StoredHash()));
        }

        [Fact]
        public async Task A_strangers_wrong_guesses_do_not_use_up_the_owners_tries()
        {
            await Ask();
            var code = _outbox.LastCode;

            for (var i = 0; i < 20; i++)
                Assert.IsType<BadRequestObjectResult>(await Reset("WRONGCDE", ip: Stranger));
            // the stranger is locked out even with the right code; the owner is not
            Assert.IsType<BadRequestObjectResult>(await Reset(code, ip: Stranger));
            Assert.IsType<OkObjectResult>(await Reset(code));
        }

        [Fact]
        public async Task Five_own_wrong_guesses_lock_that_client_for_this_code()
        {
            await Ask();
            var code = _outbox.LastCode;

            for (var i = 0; i < 5; i++)
                Assert.IsType<BadRequestObjectResult>(await Reset("WRONGCDE"));
            var locked = Assert.IsType<BadRequestObjectResult>(await Reset(code));
            Assert.Contains("Çok fazla hatalı kod", (string)locked.Value!);
            Assert.True(BCrypt.Net.BCrypt.Verify("Old-Pass-1", StoredHash()));
        }

        [Fact]
        public async Task Asking_again_resends_the_same_code_instead_of_replacing_it()
        {
            await Ask();
            var first = _outbox.LastCode;
            PassCooldown();
            await Ask();

            Assert.Equal(first, _outbox.LastCode);
            Assert.IsType<OkObjectResult>(await Reset(first));
        }

        [Fact]
        public async Task A_second_request_within_a_minute_is_refused()
        {
            await Ask();
            var again = Assert.IsType<ObjectResult>(await Ask());
            Assert.Equal(429, again.StatusCode);
            Assert.Single(_outbox.Sent);
        }
    }
}
