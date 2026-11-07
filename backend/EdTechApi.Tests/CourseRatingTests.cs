using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    // Kurs puanı: yalnızca kayıtlı veya bitirmiş öğrenci 1-5 yıldız verir; bellek içi SQLite.
    public class CourseRatingTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly CourseService _courses;
        private readonly Student _student;
        private readonly Course _course;

        public CourseRatingTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();

            var studentUser = new User { Username = "s", Role = "User", FirstName = "S", Email = "s@test" };
            var teacherUser = new User { Username = "t", Role = "Teacher", FirstName = "T", Email = "t@test" };
            _db.Users.AddRange(studentUser, teacherUser);
            _db.SaveChanges();

            var teacher = new Teacher { FirstName = "T", LastName = "T", Email = "t@test", TeacherNumber = "T1", Branch = "Genel", UserId = teacherUser.Id };
            _student = new Student { FirstName = "Ada", LastName = "S", Email = "s@test", StudentNumber = "S1", UserId = studentUser.Id };
            _db.Teachers.Add(teacher);
            _db.Students.Add(_student);
            _db.SaveChanges();

            _course = new Course { Title = "C", Price = 0m, MaxCapacity = 10, Category = "Genel", TeacherId = teacher.Id };
            _db.Courses.Add(_course);
            _db.SaveChanges();
            _db.Lessons.AddRange(
                new Lesson { CourseId = _course.Id, Title = "L1", Order = 1, DurationSeconds = 600 },
                new Lesson { CourseId = _course.Id, Title = "L2", Order = 2, DurationSeconds = 300 });
            _db.SaveChanges();

            _courses = new CourseService(_db);
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task Only_an_owner_rates_and_a_new_rating_replaces_the_old_one()
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() => _courses.RateAsync(_student.Id, _course.Id, 5));
            Assert.False((await _courses.GetRatingAsync(_course.Id, _student.Id)).CanRate);

            _db.Enrollments.Add(new Enrollment { StudentId = _student.Id, CourseId = _course.Id });
            _db.SaveChanges();
            await Assert.ThrowsAsync<ArgumentException>(() => _courses.RateAsync(_student.Id, _course.Id, 6));
            await _courses.RateAsync(_student.Id, _course.Id, 4);
            var summary = await _courses.RateAsync(_student.Id, _course.Id, 2);
            Assert.Equal((2.0, 1, (int?)2, true), (summary.Average, summary.Count, summary.Mine, summary.CanRate));

            var stats = (await _courses.GetCourseStatsAsync()).Single(s => s.CourseId == _course.Id);
            Assert.Equal((2.0, 1, 2, 900, 1), (stats.RatingAverage, stats.RatingCount, stats.Lessons, stats.DurationSeconds, stats.Students));

            summary = await _courses.RemoveRatingAsync(_student.Id, _course.Id);
            Assert.Equal((0.0, 0, (int?)null), (summary.Average, summary.Count, summary.Mine));
        }

        [Fact]
        public async Task A_finished_course_can_be_rated_after_leaving_it()
        {
            _db.CourseCompletions.Add(new CourseCompletion { StudentId = _student.Id, CourseId = _course.Id, Title = "C", Category = "Genel" });
            _db.SaveChanges();
            var summary = await _courses.RateAsync(_student.Id, _course.Id, 5);
            Assert.Equal((5.0, 1), (summary.Average, summary.Count));
        }
    }
}
