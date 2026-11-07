using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using EdTechApi.API.Controllers;
using EdTechApi.Business.BackgroundJobs;
using EdTechApi.Business.Interfaces;
using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace EdTechApi.Tests
{
    // Kayıt kodlarının kaldırılması, hesap kapatma/temizlik, öne çıkan rozetler, forum, arkadaşlık, mesajlar ve izleme şartı
    public class CommunityTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly User _ali;
        private readonly User _ayse;
        private readonly Student _aliStudent;

        public CommunityTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();
            _ali = new User { Username = "ali", Email = "ali@test", FirstName = "Ali", Role = "User" };
            _ayse = new User { Username = "ayse", Email = "ayse@test", FirstName = "Ayşe", Role = "Teacher" };
            _db.Users.AddRange(_ali, _ayse);
            _db.SaveChanges();
            _aliStudent = new Student { FirstName = "Ali", Email = "ali@test", StudentNumber = "S1", UserId = _ali.Id };
            _db.Students.Add(_aliStudent);
            _db.SaveChanges();
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private static ControllerContext As(string username, string role = "User") => new()
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(JwtRegisteredClaimNames.Sub, username), new Claim(ClaimTypes.Role, role)
                }, "test"))
            }
        };

        private sealed class NoEmail : IEmailService
        {
            public Task SendEmailAsync(string toEmail, string subject, string body) => Task.CompletedTask;
        }

        [Fact]
        public async Task Public_signup_never_grants_a_staff_role_but_admins_can_create_one()
        {
            var cache = new MemoryCache(new MemoryCacheOptions());
            cache.Set("x@test", "111111", TimeSpan.FromMinutes(5));
            var auth = new AuthController(new ConfigurationBuilder().Build(), _db, cache, new NoEmail()) { ControllerContext = As("root", "Admin") };

            // even an admin's token does not turn the public form into a staff signup
            Assert.IsType<OkObjectResult>(await auth.Register(new RegisterRequest
            {
                FirstName = "X", LastName = "Y", Username = "x", Email = "x@test", Password = "Pass-2026", VerificationCode = "111111"
            }));
            Assert.Equal("User", _db.Users.Single(u => u.Username == "x").Role);

            Assert.IsType<BadRequestObjectResult>(await auth.AdminCreate(new AdminCreateUserRequest
            {
                FirstName = "R", LastName = "R", Username = "r", Email = "r@test", Password = "Pass-2026", Role = "SuperAdmin"
            }));
            Assert.IsType<OkObjectResult>(await auth.AdminCreate(new AdminCreateUserRequest
            {
                FirstName = "N", LastName = "A", Username = "newadmin", Email = "na@test", Password = "Pass-2026", Role = "Admin"
            }));
            Assert.IsType<OkObjectResult>(await auth.AdminCreate(new AdminCreateUserRequest
            {
                FirstName = "N", LastName = "T", Username = "newteacher", Email = "nt@test", Password = "Pass-2026", Role = "Teacher", Branch = "Matematik"
            }));
            Assert.Equal("Admin", _db.Users.Single(u => u.Username == "newadmin").Role);
            Assert.Equal("Matematik", _db.Teachers.Single(t => t.User!.Username == "newteacher").Branch);
        }

        [Fact]
        public async Task Retiring_an_account_clears_transient_data_and_the_purge_keeps_financial_history()
        {
            var course = new Course { Title = "C", Category = "Genel", MaxCapacity = 5 };
            _db.Courses.Add(course);
            _db.SaveChanges();
            var lesson = new Lesson { CourseId = course.Id, Title = "L1", Order = 1 };
            _db.Lessons.Add(lesson);
            _db.SaveChanges();
            _db.LessonCompletions.Add(new LessonCompletion { StudentId = _aliStudent.Id, LessonId = lesson.Id });
            _db.Friendships.Add(new Friendship { RequesterId = _ali.Id, AddresseeId = _ayse.Id, Status = "Accepted" });
            _db.TeacherApplications.Add(new TeacherApplication { UserId = _ali.Id, Branch = "Genel", AboutMe = "x" });
            _db.SaveChanges();

            await new StudentService(_db).DeleteStudentAsync(_aliStudent.Id);

            var retired = _db.Users.Single(u => u.Id == _ali.Id);
            Assert.Equal(AccountRetirement.DeletedRole, retired.Role);
            Assert.NotNull(retired.DeletedAt);
            Assert.Empty(_db.LessonCompletions);
            Assert.Empty(_db.Friendships);
            Assert.Empty(_db.TeacherApplications);

            // within retention nothing is purged; after it, the account without wallet history goes
            Assert.Equal(0, await SoftDeleteCleanupService.PurgeAsync(_db, DateTime.UtcNow.AddDays(-30)));
            _db.Users.Add(new User { Username = "paid", Email = "p@test", Role = AccountRetirement.DeletedRole, DeletedAt = DateTime.UtcNow.AddDays(-60) });
            _db.SaveChanges();
            var paid = _db.Users.Single(u => u.Username == "paid");
            _db.WalletTransactions.Add(new WalletTransaction { UserId = paid.Id, Amount = 10, Type = "TopUp" });
            _db.SaveChanges();

            await SoftDeleteCleanupService.PurgeAsync(_db, DateTime.UtcNow.AddMinutes(1));
            _db.ChangeTracker.Clear();
            Assert.False(_db.Users.Any(u => u.Id == _ali.Id));
            Assert.True(_db.Users.Any(u => u.Username == "paid"));
            Assert.False(_db.Students.IgnoreQueryFilters().Any(s => s.Id == _aliStudent.Id));
        }

        [Fact]
        public async Task At_most_five_badges_can_be_featured()
        {
            var profile = new ProfileController(null!, null!, _db, new EnrollmentService(_db)) { ControllerContext = As("ali") };
            Assert.IsType<BadRequestObjectResult>(await profile.UpdateFeaturedBadges(new FeaturedBadgesRequest
            {
                BadgeIds = new() { "a", "b", "c", "d", "e", "f" }
            }));
            Assert.IsType<OkObjectResult>(await profile.UpdateFeaturedBadges(new FeaturedBadgesRequest
            {
                BadgeIds = new() { "graduate", "specialist-Yazılım", "graduate" }
            }));
            Assert.Equal("graduate,specialist-Yazılım", _db.Users.Single(u => u.Id == _ali.Id).FeaturedBadges);
        }

        [Fact]
        public async Task Forum_threads_replies_and_likes_work_for_members()
        {
            var forum = new ForumController(_db) { ControllerContext = As("ali") };
            Assert.IsType<NotFoundResult>(await forum.CreateThread("nope", new NewThreadRequest { Title = "Hello", Body = "World" }));
            Assert.IsType<OkObjectResult>(await forum.CreateThread("math", new NewThreadRequest { Title = "Limits", Body = "How do I start?" }));
            var thread = _db.ForumThreads.Single();

            var other = new ForumController(_db) { ControllerContext = As("ayse", "Teacher") };
            Assert.IsType<OkObjectResult>(await other.Reply(thread.Id, new NewPostRequest { Body = "With sequences." }));
            var reply = _db.ForumPosts.OrderBy(p => p.Id).Last();
            await forum.Like(reply.Id);
            Assert.Equal(1, _db.ForumPostLikes.Count());
            await forum.Like(reply.Id);
            Assert.Equal(0, _db.ForumPostLikes.Count());

            // only the author (or an admin) deletes; deleting the opening post removes the thread
            Assert.IsType<ObjectResult>(await other.DeletePost(_db.ForumPosts.OrderBy(p => p.Id).First().Id));
            Assert.IsType<OkObjectResult>(await forum.DeletePost(_db.ForumPosts.OrderBy(p => p.Id).First().Id));
            Assert.Empty(_db.ForumThreads);
        }

        [Fact]
        public async Task Only_friends_can_message_each_other()
        {
            var aliMessages = new MessagesController(_db) { ControllerContext = As("ali") };
            var send = await aliMessages.Send(_ayse.Id, new NewPostRequest { Body = "Merhaba" });
            Assert.Equal(403, Assert.IsType<ObjectResult>(send).StatusCode);

            await new FriendsController(_db) { ControllerContext = As("ali") }.Send(_ayse.Id);
            // the addressee sending back accepts the pending request
            await new FriendsController(_db) { ControllerContext = As("ayse", "Teacher") }.Send(_ali.Id);
            Assert.Equal("Accepted", _db.Friendships.Single().Status);

            Assert.IsType<OkObjectResult>(await aliMessages.Send(_ayse.Id, new NewPostRequest { Body = "Merhaba" }));
            var ayseMessages = new MessagesController(_db) { ControllerContext = As("ayse", "Teacher") };
            Assert.IsType<OkObjectResult>(await ayseMessages.Conversations());
            await ayseMessages.History(_ali.Id);
            Assert.NotNull(_db.DirectMessages.AsNoTracking().Single().ReadAt);
        }

        [Fact]
        public async Task Unread_count_skips_messages_from_closed_accounts()
        {
            _db.DirectMessages.Add(new DirectMessage { SenderId = _ali.Id, RecipientId = _ayse.Id, Body = "x" });
            _db.SaveChanges();
            var ayseMessages = new MessagesController(_db) { ControllerContext = As("ayse", "Teacher") };
            async Task<int> Unread()
            {
                var value = ((OkObjectResult)await ayseMessages.UnreadCount()).Value!;
                return (int)value.GetType().GetProperty("count")!.GetValue(value)!;
            }

            Assert.Equal(1, await Unread());
            _ali.Role = AccountRetirement.DeletedRole;
            _db.SaveChanges();
            Assert.Equal(0, await Unread());
        }

        [Fact]
        public async Task Admins_have_no_wallet_to_top_up()
        {
            _db.Users.Add(new User { Username = "boss", Email = "b@test", Role = "Admin" });
            _db.SaveChanges();
            var wallet = new WalletService(_db, new EnrollmentService(_db));
            var asAdmin = new WalletController(wallet, _db) { ControllerContext = As("boss", "Admin") };
            var asStudent = new WalletController(wallet, _db) { ControllerContext = As("ali") };

            Assert.Equal(403, Assert.IsType<ObjectResult>(await asAdmin.TopUp(new(50))).StatusCode);
            Assert.IsType<OkObjectResult>(await asStudent.TopUp(new(50)));
        }

        [Fact]
        public async Task A_video_lesson_needs_most_of_the_video_watched()
        {
            var course = new Course { Title = "C", Category = "Genel", MaxCapacity = 5 };
            _db.Courses.Add(course);
            _db.SaveChanges();
            _db.Enrollments.Add(new Enrollment { StudentId = _aliStudent.Id, CourseId = course.Id });
            var video = new Lesson { CourseId = course.Id, Title = "Video", VideoUrl = "https://example.test/v.mp4", Order = 1 };
            var text = new Lesson { CourseId = course.Id, Title = "Text", Order = 2 };
            _db.Lessons.AddRange(video, text);
            _db.SaveChanges();

            var lessons = new LessonsController(_db, new ConfigurationBuilder().Build(), null!, new EnrollmentService(_db)) { ControllerContext = As("ali") };
            Assert.IsType<BadRequestObjectResult>(await lessons.Complete(course.Id, video.Id, null));
            Assert.IsType<BadRequestObjectResult>(await lessons.Complete(course.Id, video.Id, new CompleteLessonRequest { WatchedSeconds = 50, DurationSeconds = 100 }));
            Assert.IsType<OkObjectResult>(await lessons.Complete(course.Id, video.Id, new CompleteLessonRequest { WatchedSeconds = 86, DurationSeconds = 100 }));
            Assert.IsType<OkObjectResult>(await lessons.Complete(course.Id, text.Id, null));
        }

        [Fact]
        public async Task The_dev_override_completes_a_video_lesson_only_in_development()
        {
            var course = new Course { Title = "C", Category = "Genel", MaxCapacity = 5 };
            _db.Courses.Add(course);
            _db.SaveChanges();
            _db.Enrollments.Add(new Enrollment { StudentId = _aliStudent.Id, CourseId = course.Id });
            var video = new Lesson { CourseId = course.Id, Title = "Video", VideoUrl = "https://example.test/v.mp4", Order = 1 };
            _db.Lessons.Add(video);
            _db.SaveChanges();

            var forced = new CompleteLessonRequest { DevOverride = true };
            LessonsController In(string environment) =>
                new(_db, new ConfigurationBuilder().Build(), new TestEnv(environment), new EnrollmentService(_db)) { ControllerContext = As("ali") };
            Assert.IsType<BadRequestObjectResult>(await In(Environments.Production).Complete(course.Id, video.Id, forced));
            Assert.IsType<OkObjectResult>(await In(Environments.Development).Complete(course.Id, video.Id, forced));
        }

        private sealed class TestEnv(string name) : IWebHostEnvironment
        {
            public string EnvironmentName { get; set; } = name;
            public string ApplicationName { get; set; } = "test";
            public string WebRootPath { get; set; } = "";
            public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
            public string ContentRootPath { get; set; } = "";
            public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        }
    }
}
