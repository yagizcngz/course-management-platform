using EdTechApi.API.Helpers;
using EdTechApi.Business.Services;
using EdTechApi.Core.Constants;
using EdTechApi.Core.DTOs;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
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
            // alt kategoriler kursun kendi kategorisinden; yeni kategoriler de dolu
            Assert.All(courses.Where(c => c.SubCategory != null),
                c => Assert.Contains(c.SubCategory!, BranchOptions.SubCategoriesOf(c.Category)));
            Assert.True(courses.Count(c => c.SubCategory != null) >= courses.Count - 1);
            // taksonomideki her alt kategoride en az bir kurs var
            Assert.All(BranchOptions.SubCategories.SelectMany(kv => kv.Value),
                sub => Assert.True(courses.Any(c => c.SubCategory == sub), sub));
            Assert.True(courses.Count(c => c.Category == "Hukuk & Kamu Yönetimi") >= 4);
            Assert.True(courses.Count(c => c.Category == "Mühendislik & Robotik") >= 4);
        }

        [Fact]
        public void Seed_rebalances_enrollments_and_backs_paid_ones_with_wallet_history()
        {
            CatalogSeed.SeedCategories(_db);
            CatalogSeed.SeedCatalog(_db);
            // eski seed'in bıraktığı gibi bir öğrenciyi 20 kursa yaz
            var student = _db.Students.Single(s => s.Email == "ali.vural@ogrenci.example");
            foreach (var c in _db.Courses.ToList().Where(c => !_db.Enrollments.Any(e => e.StudentId == student.Id && e.CourseId == c.Id)).Take(20))
                _db.Enrollments.Add(new Enrollment { StudentId = student.Id, CourseId = c.Id });
            _db.SaveChanges();

            CatalogSeed.SeedCatalog(_db);
            var txCount = _db.WalletTransactions.Count();
            CatalogSeed.SeedCatalog(_db);
            Assert.Equal(txCount, _db.WalletTransactions.Count());

            var seedStudents = _db.Students.Where(s => s.Email.EndsWith("@ogrenci.example")).ToList();
            Assert.All(seedStudents, s =>
                Assert.InRange(_db.Enrollments.Count(e => e.StudentId == s.Id), 2, 5));
            Assert.All(seedStudents, s => Assert.NotNull(s.UserId));

            var tx = _db.WalletTransactions.ToList();
            Assert.Contains(tx, t => t.Type == "Purchase");
            Assert.Contains(tx, t => t.Type == "Earning");
            Assert.Contains(tx, t => t.Type == "Refund");
            Assert.Contains(tx, t => t.Type == "EarningReversal");
            // her etkin ücretli kaydın bir satın alması var; bakiye hareketlerin toplamı ve eksi değil
            foreach (var e in _db.Enrollments.Include(e => e.Course).Include(e => e.Student).Where(e => e.Course.Price > 0).ToList())
                Assert.Contains(tx, t => t.Type == "Purchase" && t.CourseId == e.CourseId && t.UserId == e.Student.UserId);
            foreach (var u in _db.Users.ToList())
            {
                Assert.Equal(tx.Where(t => t.UserId == u.Id).Sum(t => t.Amount), u.Balance);
                Assert.True(u.Balance >= 0, u.Username);
            }
            Assert.All(_db.Teachers.Where(t => t.Email.EndsWith("@edtech.example")).ToList(),
                t => Assert.True(t.CreatedAt < DateTime.UtcNow.AddDays(-250)));
        }

        [Fact]
        public async Task Completing_every_lesson_marks_the_enrollment_completed()
        {
            CatalogSeed.SeedCategories(_db);
            CatalogSeed.SeedCatalog(_db);
            // seed ilerlemesi: bitmiş ve devam eden kayıtlar birlikte var
            Assert.Contains(_db.Enrollments, e => e.Status == EnrollmentService.Completed);
            Assert.Contains(_db.Enrollments, e => e.Status == EnrollmentService.InProgress);

            var service = new EnrollmentService(_db);
            var student = new Student { FirstName = "Yeni", LastName = "Öğrenci", Email = "yeni@test", StudentNumber = "x1" };
            _db.Students.Add(student);
            var course = _db.Courses.First();
            _db.Enrollments.Add(new Enrollment { Student = student, CourseId = course.Id });
            _db.SaveChanges();
            var lessons = _db.Lessons.Where(l => l.CourseId == course.Id).Select(l => l.Id).ToList();

            CourseProgress p = null!;
            foreach (var id in lessons.Append(lessons[0])) p = await service.CompleteLessonAsync(student.Id, course.Id, id);
            Assert.Equal(100, p.Percent);
            Assert.Equal(lessons.Count, _db.LessonCompletions.Count(c => c.StudentId == student.Id));
            Assert.Equal(EnrollmentService.Completed, _db.Enrollments.Single(e => e.StudentId == student.Id).Status);
            var mine = (await service.GetStudentEnrollmentsAsync(student.Id)).Single();
            Assert.Equal(100, mine.ProgressPercent);
            Assert.NotNull(mine.CompletedAt);

            // yeni ders eklenince kurs yeniden yüzde 100'ün altına iner
            _db.Lessons.Add(new Lesson { CourseId = course.Id, Title = "Ek ders" });
            _db.SaveChanges();
            Assert.True((await service.GetProgressAsync(student.Id, new[] { course.Id }))[course.Id].Percent < 100);
            await Assert.ThrowsAsync<ArgumentException>(() => service.CompleteLessonAsync(student.Id, course.Id + 999, lessons[0]));
        }

        [Fact]
        public void Demo_accounts_start_with_progress_and_courses()
        {
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Seed:DemoUsers"] = "true", ["Seed:DemoPassword"] = "demo-pass-123"
            }).Build();
            DataSeeder.Run(_db, config, isDevelopment: true);
            DataSeeder.Run(_db, config, isDevelopment: true);

            var student = _db.Students.Single(s => s.User!.Username == "demo_student");
            var enrollments = _db.Enrollments.Where(e => e.StudentId == student.Id).ToList();
            Assert.InRange(enrollments.Count, 2, 5);
            Assert.Contains(enrollments, e => e.Status == EnrollmentService.Completed);
            Assert.Contains(enrollments, e => e.Status == EnrollmentService.InProgress);
            var user = _db.Users.Single(u => u.Username == "demo_student");
            Assert.Equal(_db.WalletTransactions.Where(t => t.UserId == user.Id).ToList().Sum(t => t.Amount), user.Balance);
            Assert.True(_db.Courses.Count(c => c.Teacher!.User!.Username == "demo_teacher") >= 1);
        }

        [Fact]
        public void Seed_keeps_valid_subcategory_and_fixes_invalid_one()
        {
            CatalogSeed.SeedCategories(_db);
            CatalogSeed.SeedCatalog(_db);
            var calc = _db.Courses.Single(c => c.Title == "Kalkülüs ve Analiz");
            var geo = _db.Courses.Single(c => c.Title == "Matematik Geometri");
            calc.SubCategory = "TYT-AYT Matematik"; // yöneticinin geçerli seçimi
            geo.SubCategory = "Makine Öğrenmesi";   // başka kategoriye ait, geçersiz
            _db.SaveChanges();

            CatalogSeed.SeedCatalog(_db);

            Assert.Equal("TYT-AYT Matematik", _db.Courses.Single(c => c.Id == calc.Id).SubCategory);
            Assert.Equal("Geometri & Trigonometri", _db.Courses.Single(c => c.Id == geo.Id).SubCategory);
        }

        [Fact]
        public void Subcategory_normalisation_is_scoped_to_category()
        {
            Assert.Equal("Analiz & Kalkülüs", BranchOptions.NormalizeSubCategory("matematik", " analiz & kalkülüs "));
            Assert.Equal("Olasılık & İstatistik", BranchOptions.NormalizeSubCategory("Matematik", "olasılık & istatistik"));
            Assert.Null(BranchOptions.NormalizeSubCategory("Matematik", "Makine Öğrenmesi"));
            Assert.Null(BranchOptions.NormalizeSubCategory("Matematik", ""));
            Assert.Null(BranchOptions.NormalizeSubCategory("Yok", "Analiz & Kalkülüs"));
            Assert.All(BranchOptions.All, name => Assert.NotEmpty(BranchOptions.SubCategoriesOf(name)));
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
            var admin = new User { Username = "Admin", Role = "Admin", FirstName = "Admin", AboutMe = "admin" };
            var teacherUser = new User { Username = "t1", Role = "Teacher", FirstName = "Yeni", LastName = "Hoca", Email = "yeni@test", AboutMe = "Kendi yazdığım biyografi." };
            _db.Users.AddRange(admin, teacherUser);
            _db.SaveChanges();
            _db.Teachers.Add(new Teacher { FirstName = "Yeni", LastName = "Hoca", Email = "yeni@test", TeacherNumber = "t1", UserId = teacherUser.Id });
            _db.Students.Add(new Student { FirstName = "Boş", LastName = "Öğrenci", Email = "bos@test", StudentNumber = "s1" });
            _db.Teachers.Add(new Teacher { FirstName = "Silinmiş", LastName = "Hoca", Email = "sil@test", TeacherNumber = "t2", IsDeleted = true });
            _db.SaveChanges();

            CatalogSeed.BackfillProfiles(_db);
            CatalogSeed.BackfillProfiles(_db);

            Assert.All(_db.Teachers.IgnoreQueryFilters().ToList(), t =>
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
            Assert.NotEqual("admin", _db.Users.Single(u => u.Username == "Admin").AboutMe);
            Assert.Equal(_db.Teachers.Single(t => t.UserId == teacherUser.Id).ProfilePictureUrl,
                _db.Users.Single(u => u.Username == "t1").ProfilePictureUrl);
        }
    }
}
