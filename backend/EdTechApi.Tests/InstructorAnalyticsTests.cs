using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    // Eğitmen panelinin öğrenci listesi ve ortalama ilerlemesi; bellek içi SQLite.
    public class InstructorAnalyticsTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly TeacherService _teachers;
        private readonly User _teacherUser;
        private readonly Student _student;
        private readonly Course _course;

        public InstructorAnalyticsTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();

            var studentUser = new User { Username = "s", Role = "User", FirstName = "S", Email = "s@test" };
            _teacherUser = new User { Username = "t", Role = "Teacher", FirstName = "T", Email = "t@test" };
            _db.Users.AddRange(studentUser, _teacherUser);
            _db.SaveChanges();

            var teacher = new Teacher { FirstName = "T", LastName = "T", Email = "t@test", TeacherNumber = "T1", Branch = "Genel", UserId = _teacherUser.Id };
            _student = new Student { FirstName = "Ada", LastName = "S", Email = "s@test", StudentNumber = "S1", UserId = studentUser.Id };
            _db.Teachers.Add(teacher);
            _db.Students.Add(_student);
            _db.SaveChanges();

            _course = new Course { Title = "C", MaxCapacity = 10, Category = "Genel", TeacherId = teacher.Id };
            _db.Courses.Add(_course);
            _db.SaveChanges();
            _db.Lessons.AddRange(
                new Lesson { CourseId = _course.Id, Title = "L1", Order = 1, DurationSeconds = 600 },
                new Lesson { CourseId = _course.Id, Title = "L2", Order = 2, DurationSeconds = 300 });
            _db.SaveChanges();

            _teachers = new TeacherService(_db);
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task The_instructor_panel_lists_each_student_with_progress()
        {
            _db.Enrollments.Add(new Enrollment { StudentId = _student.Id, CourseId = _course.Id });
            var first = _db.Lessons.OrderBy(l => l.Order).First();
            _db.LessonCompletions.Add(new LessonCompletion { StudentId = _student.Id, LessonId = first.Id });
            _db.SaveChanges();

            var row = (await _teachers.GetCourseStudentsForUserAsync(_teacherUser.Id, _course.Id))!.Single();
            Assert.Equal((1, 2, 50, true), (row.CompletedLessons, row.TotalLessons, row.Percent, row.Active));
            Assert.Null(row.CompletedAt);
            var course = (await _teachers.GetAnalyticsForUserAsync(_teacherUser.Id))!.Single();
            Assert.Equal((50, 900), (course.AverageProgress, course.DurationSeconds));

            // finished and left: still listed as a graduate at 100%
            _db.CourseCompletions.Add(new CourseCompletion { StudentId = _student.Id, CourseId = _course.Id, Title = "C", Category = "Genel" });
            _db.Enrollments.Single().IsDeleted = true;
            _db.SaveChanges();
            row = (await _teachers.GetCourseStudentsForUserAsync(_teacherUser.Id, _course.Id))!.Single();
            Assert.Equal((100, false), (row.Percent, row.Active));
            Assert.NotNull(row.CompletedAt);

            Assert.Null(await _teachers.GetCourseStudentsForUserAsync(_teacherUser.Id + 99, _course.Id));
        }
    }
}
