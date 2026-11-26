using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EdTechApi.API.Controllers;
using EdTechApi.API.Helpers;
using EdTechApi.Business.Services;
using EdTechApi.Core.DTOs;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    // GET /api/enrollments: admins see every row; others see full rows only for themselves and the courses they
    // teach, and the rest only as anonymous rows so course cards can still count students.
    public class EnrollmentListTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly int _ayseStudentId, _taughtCourseId, _otherCourseId;

        public EnrollmentListTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();

            var users = new[]
            {
                new User { Username = "ayse", Role = "User", Email = "a@test" },
                new User { Username = "mehmet", Role = "User", Email = "m@test" },
                new User { Username = "hoca", Role = "Teacher", Email = "h@test" },
                new User { Username = "admin", Role = "Admin", Email = "ad@test" }
            };
            _db.Users.AddRange(users);
            _db.SaveChanges();
            var ayse = new Student { FirstName = "Ayşe", LastName = "A", Email = "a@test", StudentNumber = "S1", UserId = users[0].Id };
            var mehmet = new Student { FirstName = "Mehmet", LastName = "M", Email = "m@test", StudentNumber = "S2", UserId = users[1].Id };
            var teacher = new Teacher { FirstName = "Hoca", LastName = "H", Email = "h@test", TeacherNumber = "T1", Branch = "Genel", UserId = users[2].Id };
            _db.AddRange(ayse, mehmet, teacher);
            _db.SaveChanges();
            var taught = new Course { Title = "Taught", Category = "Genel", MaxCapacity = 10, TeacherId = teacher.Id };
            var other = new Course { Title = "Other", Category = "Genel", MaxCapacity = 10 };
            _db.AddRange(taught, other);
            _db.SaveChanges();
            _db.Enrollments.AddRange(
                new Enrollment { StudentId = ayse.Id, CourseId = other.Id },
                new Enrollment { StudentId = mehmet.Id, CourseId = other.Id },
                new Enrollment { StudentId = mehmet.Id, CourseId = taught.Id });
            _db.SaveChanges();
            (_ayseStudentId, _taughtCourseId, _otherCourseId) = (ayse.Id, taught.Id, other.Id);
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private async Task<List<EnrollmentDto>> ListAs(string username, string role)
        {
            var controller = new EnrollmentsController(new EnrollmentService(_db), null!, _db)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                        {
                            new Claim(JwtRegisteredClaimNames.Sub, _db.Users.Single(u => u.Username == username).Id.ToString()),
                            new Claim(ClaimsPrincipalExtensions.UsernameClaim, username),
                            new Claim(ClaimTypes.Role, role)
                        }, "jwt"))
                    }
                }
            };
            var ok = Assert.IsType<OkObjectResult>(await controller.GetAllEnrollments());
            return ((IEnumerable<EnrollmentDto>)ok.Value!).ToList();
        }

        private static bool Identified(EnrollmentDto e) => e.StudentId != 0 || e.StudentFullName != "" || e.StudentNumber != "";

        [Fact]
        public async Task Admin_sees_every_student()
        {
            Assert.All(await ListAs("admin", "Admin"), e => Assert.True(Identified(e)));
        }

        [Fact]
        public async Task A_student_sees_only_their_own_rows_and_counts_for_the_rest()
        {
            var rows = await ListAs("ayse", "User");

            Assert.Equal(3, rows.Count);
            var mine = Assert.Single(rows, Identified);
            Assert.Equal(_ayseStudentId, mine.StudentId);
            Assert.Equal(2, rows.Count(e => e.CourseId == _otherCourseId));
        }

        [Fact]
        public async Task A_teacher_sees_students_of_their_own_course_only()
        {
            var rows = await ListAs("hoca", "Teacher");

            Assert.Equal(3, rows.Count);
            Assert.All(rows.Where(e => e.CourseId == _taughtCourseId), e => Assert.True(Identified(e)));
            Assert.All(rows.Where(e => e.CourseId == _otherCourseId), e => Assert.False(Identified(e)));
        }
    }
}
