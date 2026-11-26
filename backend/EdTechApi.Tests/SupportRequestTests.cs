using EdTechApi.API.Controllers;
using EdTechApi.Business.Interfaces;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace EdTechApi.Tests
{
    public class SupportRequestTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;

        public SupportRequestTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private sealed class NoEmail : IEmailService
        {
            public Task SendEmailAsync(string toEmail, string subject, string body) => Task.CompletedTask;
        }

        private SupportRequestsController Support() => new(_db, new NoEmail(), NullLogger<SupportRequestsController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        private static SupportRequestsController.CreateSupportRequestDto Guest(string email) =>
            new() { Name = "Misafir", Email = email, Message = "Giriş yapamıyorum." };

        [Fact]
        public async Task Guest_ticket_needs_a_real_email_address()
        {
            Assert.IsType<BadRequestObjectResult>(await Support().CreateSupportRequest(Guest("not an address")));
            Assert.Equal(0, await _db.SupportRequests.CountAsync());

            Assert.IsNotType<BadRequestObjectResult>(await Support().CreateSupportRequest(Guest("guest@test.example")));
            Assert.Equal(1, await _db.SupportRequests.CountAsync());
        }
    }
}
