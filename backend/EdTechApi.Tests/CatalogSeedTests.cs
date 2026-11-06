using EdTechApi.API.Helpers;
using EdTechApi.Core.Constants;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    public class CatalogSeedTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;

        public CatalogSeedTests()
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
        public void Seed_is_idempotent_and_keeps_edits()
        {
            _db.Categories.Add(new Category { Name = "Yazılım", Description = "Yazılım ve Programlama Eğitimleri" });
            _db.Categories.Add(new Category { Name = "Spor", Description = "Elle yazılmış açıklama" });
            _db.Teachers.Add(new Teacher { FirstName = "Eski", LastName = "Hoca", Email = "eski@test", TeacherNumber = "1", Branch = "Spor" });
            _db.SaveChanges();

            for (var i = 0; i < 2; i++)
            {
                CatalogSeed.SeedCategories(_db);
                CatalogSeed.SeedCatalog(_db);
            }

            Assert.Equal(BranchOptions.Defaults.Length, _db.Categories.Count());
            Assert.Equal("Elle yazılmış açıklama", _db.Categories.Single(c => c.Name == "Spor").Description);
            Assert.NotEqual("Yazılım ve Programlama Eğitimleri", _db.Categories.Single(c => c.Name == "Yazılım").Description);

            var courses = _db.Courses.ToList();
            Assert.True(courses.Count >= 18);
            Assert.Equal(courses.Count, courses.Select(c => c.Title).Distinct().Count());
            Assert.Contains(courses, c => c.Category == "Coğrafya");
            Assert.All(courses, c => Assert.True(_db.Lessons.Count(l => l.CourseId == c.Id) >= 3));

            var teachers = _db.Teachers.ToList();
            Assert.All(teachers, t => Assert.False(string.IsNullOrWhiteSpace(t.AboutMe)));
            // her kursun öğretmeni o kursun kategorisinde branşa sahip
            Assert.All(courses, c => Assert.Contains(c.Category,
                teachers.Single(t => t.Id == c.TeacherId).Branch!.Split(", ")));

            Assert.True(_db.Enrollments.Any());
            Assert.True(courses.Count(c => c.Category == "Matematik") >= 6);
            Assert.All(courses, c => Assert.Contains(c.Level, new[] { "Beginner", "Intermediate", "Advanced" }));
            // her kategoride en az dört kurs; Türkçe kursları da katalogda
            Assert.All(courses.GroupBy(c => c.Category), g => Assert.True(g.Count() >= 4, g.Key));
            Assert.True(courses.Count(c => c.Category == "Türk Dili ve Edebiyatı") >= 5);
        }

        [Fact]
        public void Seed_restores_soft_deleted_and_miscategorised_courses()
        {
            CatalogSeed.SeedCategories(_db);
            _db.Teachers.Add(new Teacher { FirstName = "Fen", LastName = "Hoca", Email = "fen@test", TeacherNumber = "9", Branch = "Fen Bilimleri" });
            _db.SaveChanges();
            var fen = _db.Teachers.Single(t => t.Email == "fen@test");
            _db.Courses.Add(new Course { Title = "Matematik", Category = "Fen Bilimleri", Description = "merhaba", TeacherId = fen.Id, Instructor = "Fen Hoca", MaxCapacity = 20, IsDeleted = true, DeletedAt = DateTime.UtcNow });
            _db.SaveChanges();

            CatalogSeed.SeedCatalog(_db);

            var math = _db.Courses.Include(c => c.Teacher).Single(c => c.Title == "Matematik");
            Assert.Equal("Matematik", math.Category);
            Assert.NotEqual("merhaba", math.Description);
            Assert.Contains("Matematik", math.Teacher!.Branch!);
            Assert.True(_db.Lessons.Count(l => l.CourseId == math.Id) >= 4);
        }

        [Fact]
        public void Backfill_fills_every_empty_profile_and_keeps_edits()
        {
            CatalogSeed.SeedCategories(_db);
            CatalogSeed.SeedCatalog(_db);
            var admin = new User { Username = "Admin", Role = "Admin", FirstName = "Admin" };
            var teacherUser = new User { Username = "t1", Role = "Teacher", FirstName = "Yeni", LastName = "Hoca", Email = "yeni@test", AboutMe = "Kendi yazdığım biyografi." };
            _db.Users.AddRange(admin, teacherUser);
            _db.SaveChanges();
            _db.Teachers.Add(new Teacher { FirstName = "Yeni", LastName = "Hoca", Email = "yeni@test", TeacherNumber = "t1", UserId = teacherUser.Id });
            _db.Students.Add(new Student { FirstName = "Boş", LastName = "Öğrenci", Email = "bos@test", StudentNumber = "s1" });
            _db.SaveChanges();

            CatalogSeed.BackfillProfiles(_db);
            CatalogSeed.BackfillProfiles(_db);

            Assert.All(_db.Teachers.ToList(), t =>
            {
                Assert.False(string.IsNullOrWhiteSpace(t.ProfilePictureUrl));
                Assert.False(string.IsNullOrWhiteSpace(t.AboutMe));
                Assert.False(string.IsNullOrWhiteSpace(t.Branch));
            });
            Assert.All(_db.Students.ToList(), s =>
                Assert.False(string.IsNullOrWhiteSpace(s.ProfilePictureUrl) || string.IsNullOrWhiteSpace(s.AboutMe)));
            Assert.All(_db.Users.ToList(), u =>
                Assert.False(string.IsNullOrWhiteSpace(u.ProfilePictureUrl) || string.IsNullOrWhiteSpace(u.AboutMe)));
            Assert.Equal("Kendi yazdığım biyografi.", _db.Users.Single(u => u.Username == "t1").AboutMe);
            Assert.Equal(_db.Teachers.Single(t => t.UserId == teacherUser.Id).ProfilePictureUrl,
                _db.Users.Single(u => u.Username == "t1").ProfilePictureUrl);
        }
    }
}
