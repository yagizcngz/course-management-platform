using System.Security.Claims;
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
    public class SignupTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly MemoryCache _cache = new(new MemoryCacheOptions());

        public SignupTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();
            _db.Categories.Add(new Category { Name = "Matematik" });
            _db.Users.Add(new User { Username = "taken", Email = "taken@test.example", Password = "x" });
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
            public string LastBody = "";
            public Task SendEmailAsync(string toEmail, string subject, string body)
            {
                LastBody = body;
                return Task.CompletedTask;
            }
        }

        private readonly Outbox _outbox = new();
        private string _code = "";

        // the real flow: ask for a code, read it from the mail
        private async Task SendCode()
        {
            Assert.IsType<OkObjectResult>(await Auth().SendVerificationEmail(new SendVerificationEmailRequest { Email = "new@test.example" }));
            _code = System.Text.RegularExpressions.Regex.Match(_outbox.LastBody, @">([A-Z2-9]{8})<").Groups[1].Value;
            Assert.Equal(AuthController.CodeLength, _code.Length);
        }

        private AuthController Auth() => new(new ConfigurationBuilder().Build(), _db, _cache, _outbox)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        private RegisterRequest Request(string username, bool teacher = false) => new()
        {
            FirstName = "Yeni", LastName = "Kişi", Username = username, Password = "Pass-2026",
            Email = "new@test.example", VerificationCode = _code,
            ApplyAsTeacher = teacher, Branch = teacher ? "Matematik" : null,
            AboutMe = teacher ? "On yıldır lise matematiği öğretiyorum, olimpiyat takımı çalıştırıyorum." : null
        };

        [Fact]
        public void Password_hash_never_serialises()
        {
            var json = System.Text.Json.JsonSerializer.Serialize(new Teacher { User = new User { Username = "t", Password = "$2a$hash" } });
            Assert.DoesNotContain("$2a$hash", json);
        }

        [Fact]
        public async Task Failed_signup_keeps_the_email_code_until_one_succeeds()
        {
            await SendCode();

            Assert.IsType<BadRequestObjectResult>(await Auth().Register(Request("taken")));
            // the same code still works after a validation error, and only once
            Assert.IsType<OkObjectResult>(await Auth().Register(Request("fresh")));
            Assert.IsType<BadRequestObjectResult>(await Auth().Register(Request("again")));
        }

        [Fact]
        public async Task Short_password_is_rejected_before_an_account_exists()
        {
            await SendCode();
            var request = Request("shorty");
            request.Password = "1234567";

            Assert.IsType<BadRequestObjectResult>(await Auth().Register(request));
            Assert.False(_db.Users.Any(u => u.Username == "shorty"));
        }

        [Fact]
        public async Task Approved_applicant_becomes_a_teacher_and_can_still_delete_the_account()
        {
            await SendCode();
            Assert.IsType<OkObjectResult>(await Auth().Register(Request("applicant", teacher: true)));
            var user = _db.Users.Single(u => u.Username == "applicant");
            Assert.Equal("User", user.Role); // no invite code: a learner until approved
            var app = _db.TeacherApplications.Single();

            var admin = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, "Admin") }, "test"));
            var applications = new TeacherApplicationsController(_db)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = admin } }
            };
            Assert.IsType<OkObjectResult>(await applications.Approve(app.Id));
            Assert.IsType<BadRequestObjectResult>(await applications.Approve(app.Id));

            Assert.Equal("Teacher", _db.Users.Single(u => u.Id == user.Id).Role);
            var teacher = _db.Teachers.Single(t => t.UserId == user.Id);
            Assert.Equal("Matematik", teacher.Branch);
            Assert.False(_db.Students.IgnoreQueryFilters().Any(s => s.UserId == user.Id));

            await new TeacherService(_db).DeleteTeacherAsync(teacher.Id);
            Assert.False(_db.Users.Any(u => u.Username == "applicant"));
        }
    }
}
