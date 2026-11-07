using System.Reflection;
using EdTechApi.API.Controllers;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    // Yöneticinin bekleyen istek rozeti, İstekler sayfasının gösterdiği bekleyen kayıtları sayar; bellek içi SQLite.
    public class PendingRequestCountTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;

        public PendingRequestCountTests()
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

        [Fact]
        public async Task Counts_only_what_still_waits_for_an_admin()
        {
            var user = new User { Username = "t", Role = "Teacher", FirstName = "T", Email = "t@test" };
            _db.Users.Add(user);
            _db.SaveChanges();
            var teacher = new Teacher { FirstName = "T", LastName = "T", Email = "t@test", TeacherNumber = "T1", Branch = "Genel", UserId = user.Id };
            _db.Teachers.Add(teacher);
            _db.SaveChanges();
            var live = new Course { Title = "A", MaxCapacity = 10, Category = "Genel", TeacherId = teacher.Id };
            var gone = new Course { Title = "B", MaxCapacity = 10, Category = "Genel", TeacherId = teacher.Id, IsDeleted = true };
            _db.Courses.AddRange(live, gone);
            _db.SaveChanges();

            _db.TeachingRequests.AddRange(
                new TeachingRequest { CourseId = live.Id, TeacherId = teacher.Id },
                new TeachingRequest { CourseId = live.Id, TeacherId = teacher.Id, Status = "Accepted" },
                new TeachingRequest { CourseId = live.Id, TeacherId = teacher.Id, IsDeletedByAdmin = true },
                // the Requests page hides requests for deleted courses, so the badge does too
                new TeachingRequest { CourseId = gone.Id, TeacherId = teacher.Id });
            _db.TeacherApplications.AddRange(
                new TeacherApplication { UserId = user.Id, Branch = "Genel" },
                new TeacherApplication { UserId = user.Id, Branch = "Genel", Status = "Rejected" });
            _db.BranchChangeRequests.Add(new BranchChangeRequest { TeacherId = teacher.Id, RequestedBranch = "Genel, Müzik" });
            _db.SupportRequests.AddRange(
                new SupportRequest { Name = "G", Email = "g@test", Message = "?" },
                new SupportRequest { Name = "G", Email = "g@test", Message = "?", IsResolved = true },
                new SupportRequest { Name = "G", Email = "g@test", Message = "?", IsDeletedByAdmin = true });
            _db.SaveChanges();

            var result = Assert.IsType<OkObjectResult>(await new DashboardController(_db).GetPendingRequests());
            var counts = result.Value!.GetType().GetProperties().ToDictionary(p => p.Name, p => (int)p.GetValue(result.Value)!);
            Assert.Equal(
                new Dictionary<string, int> { ["teaching"] = 1, ["applications"] = 1, ["branches"] = 1, ["support"] = 1, ["total"] = 4 },
                counts);
        }

        [Fact]
        public void Only_admins_read_the_counts()
        {
            var m = typeof(DashboardController).GetMethod(nameof(DashboardController.GetPendingRequests))!;
            Assert.Null(m.GetCustomAttribute<AllowAnonymousAttribute>());
            Assert.Equal(EdTechApi.API.Helpers.RoleNames.Admins, m.GetCustomAttribute<AuthorizeAttribute>()?.Roles);
        }
    }
}
