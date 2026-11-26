using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EdTechApi.API.Controllers;
using EdTechApi.API.Helpers;
using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EdTechApi.Tests
{
    // Course.Instructor is a copy of the teacher's name; both rename paths must refresh it on every course.
    public class InstructorNameTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly Teacher _teacher;
        private readonly User _user;

        public InstructorNameTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();

            _user = new User { Username = "hoca", Role = "Teacher", FirstName = "Eski", LastName = "Ad", Email = "h@test" };
            _db.Users.Add(_user);
            _db.SaveChanges();
            _teacher = new Teacher { FirstName = "Eski", LastName = "Ad", Email = "h@test", TeacherNumber = "T1", Branch = "Genel", UserId = _user.Id };
            _db.Teachers.Add(_teacher);
            _db.SaveChanges();
            _db.Courses.AddRange(
                new Course { Title = "A", Category = "Genel", MaxCapacity = 5, TeacherId = _teacher.Id, Instructor = "Eski Ad" },
                new Course { Title = "B", Category = "Genel", MaxCapacity = 5, TeacherId = _teacher.Id, Instructor = "Eski Ad", IsDeleted = true },
                new Course { Title = "C", Category = "Genel", MaxCapacity = 5, Instructor = "Başka Biri" });
            _db.SaveChanges();
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private string[] Instructors()
        {
            using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            return db.Courses.IgnoreQueryFilters().OrderBy(c => c.Title).Select(c => c.Instructor).ToArray();
        }

        [Fact]
        public async Task Admin_rename_updates_the_teachers_courses_only()
        {
            await new TeacherService(_db).UpdateTeacherAsync(_teacher.Id,
                new Teacher { FirstName = "Yeni", LastName = "Ad", Email = "h@test", Branch = "Genel" });

            Assert.Equal(new[] { "Yeni Ad", "Yeni Ad", "Başka Biri" }, Instructors());
        }

        [Fact]
        public async Task Teacher_renaming_themselves_updates_their_courses()
        {
            var profile = new ProfileController(null!, null!, _db, new EnrollmentService(_db), new MemoryCache(new MemoryCacheOptions()), null!)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                        {
                            new Claim(JwtRegisteredClaimNames.Sub, _user.Id.ToString()),
                            new Claim(ClaimsPrincipalExtensions.UsernameClaim, "hoca"), new Claim(ClaimTypes.Role, "Teacher")
                        }, "test"))
                    }
                }
            };

            Assert.IsType<OkObjectResult>(await profile.UpdateMe(new UpdateProfileRequest { FirstName = "Yeni", LastName = "Ad" }));

            Assert.Equal(new[] { "Yeni Ad", "Yeni Ad", "Başka Biri" }, Instructors());
        }
    }
}
