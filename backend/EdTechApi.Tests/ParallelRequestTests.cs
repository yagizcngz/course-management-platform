using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace EdTechApi.Tests
{
    // A double click sends two requests; the second one's insert hits the unique index. The interceptor lets the
    // "other" request save its row after this one checked for it but before this one saves.
    public class ParallelRequestTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly DbContextOptions<AppDbContext> _plain;
        private readonly OtherRequestFirst _race = new();
        private readonly AppDbContext _db;
        private readonly int _userId, _studentId, _courseId, _lessonId;

        private sealed class OtherRequestFirst : SaveChangesInterceptor
        {
            public Func<Task>? Next;
            public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
                InterceptionResult<int> result, CancellationToken cancellationToken = default)
            {
                var run = Next;
                Next = null;
                if (run != null) await run();
                return result;
            }
        }

        public ParallelRequestTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _plain = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).AddInterceptors(_race).Options);
            _db.Database.EnsureCreated();

            var user = new User { Username = "s", Role = "User", FirstName = "S", Email = "s@test" };
            _db.Users.Add(user);
            _db.SaveChanges();
            var student = new Student { FirstName = "S", LastName = "S", Email = "s@test", StudentNumber = "S1", UserId = user.Id };
            var course = new Course { Title = "C", Price = 0m, MaxCapacity = 10, Category = "Genel" };
            _db.AddRange(student, course);
            _db.SaveChanges();
            var lessons = new[]
            {
                new Lesson { CourseId = course.Id, Title = "L1", Order = 1, DurationSeconds = 60 },
                new Lesson { CourseId = course.Id, Title = "L2", Order = 2, DurationSeconds = 60 }
            };
            _db.Lessons.AddRange(lessons);
            _db.Enrollments.Add(new Enrollment { StudentId = student.Id, CourseId = course.Id });
            _db.SaveChanges();
            (_userId, _studentId, _courseId, _lessonId) = (user.Id, student.Id, course.Id, lessons[0].Id);
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private Task OtherRequestSaves(object row) => Task.Run(async () =>
        {
            await using var other = new AppDbContext(_plain);
            other.Add(row);
            await other.SaveChangesAsync();
        });

        [Fact]
        public async Task Completing_a_lesson_twice_at_once_counts_it_once()
        {
            _race.Next = () => OtherRequestSaves(new LessonCompletion { StudentId = _studentId, LessonId = _lessonId });

            var progress = await new EnrollmentService(_db).CompleteLessonAsync(_studentId, _courseId, _lessonId);

            Assert.Equal(1, progress.Done);
            Assert.Equal(1, await _db.LessonCompletions.CountAsync());
        }

        [Fact]
        public async Task Rating_twice_at_once_keeps_one_row_with_the_latest_stars()
        {
            _race.Next = () => OtherRequestSaves(new CourseRating { StudentId = _studentId, CourseId = _courseId, Stars = 2 });

            var summary = await new CourseService(_db).RateAsync(_studentId, _courseId, 5);

            Assert.Equal(5, summary.Mine);
            Assert.Equal(1, await _db.CourseRatings.CountAsync());
        }

        private WalletService Wallet() => new(_db, new EnrollmentService(_db));
        private decimal Balance() => _db.Users.AsNoTracking().Single(u => u.Id == _userId).Balance;

        // The duplicate-key path of a top-up can't be raced here: its transaction would swallow the other request's
        // writes on the shared SQLite connection. WalletServiceTests covers the sequential repeat.
        [Fact]
        public async Task Any_other_save_error_is_not_reported_as_a_top_up()
        {
            _race.Next = () => throw new DbUpdateException("disk full");

            await Assert.ThrowsAsync<DbUpdateException>(() => Wallet().TopUpAsync(_userId, 50, "key-2"));
            Assert.Equal(0, Balance());
        }
    }
}
