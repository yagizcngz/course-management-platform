using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Helpers
{
    // Başlangıç verileri: ilk yönetici ve kategoriler (her ortamda); demo katalog ve demo hesaplar (yalnızca Development, Seed:DemoUsers=true).
    public static class DataSeeder
    {
        public static void Run(AppDbContext db, IConfiguration config, bool isDevelopment)
        {
            var adminUser = config["Seed:AdminUsername"];
            var adminPass = config["Seed:AdminPassword"];
            if (!string.IsNullOrWhiteSpace(adminUser) && !string.IsNullOrWhiteSpace(adminPass)
                && !db.Users.Any(u => u.Role == "Admin") && !db.Users.Any(u => u.Username == adminUser))
            {
                db.Users.Add(NewUser(adminUser, adminPass, "Admin", "Admin", "", config["Seed:AdminEmail"] ?? ""));
                db.SaveChanges();
            }

            CatalogSeed.SeedCategories(db);
            var demo = isDevelopment && config["Seed:DemoUsers"] == "true";
            if (!demo) return;
            CatalogSeed.SeedCatalog(db);

            var demoPass = config["Seed:DemoPassword"];
            if (!string.IsNullOrWhiteSpace(demoPass)) SeedDemoAccounts(db, demoPass);
            // demo hesaplar dahil, avatarı veya biyografisi boş kalan her profil doldurulur
            CatalogSeed.BackfillProfiles(db);
        }

        private static void SeedDemoAccounts(AppDbContext db, string demoPass)
        {
            // silinmiş (soft-delete) demo öğretmen/öğrenci profilleri geri yüklenir; demo hesaplar her zaman kullanılabilir kalır
            foreach (var t in db.Teachers.IgnoreQueryFilters().Where(t => t.IsDeleted && t.User != null && t.User.Username == "demo_teacher"))
            { t.IsDeleted = false; t.DeletedAt = null; }
            foreach (var s in db.Students.IgnoreQueryFilters().Where(s => s.IsDeleted && s.User != null && s.User.Username == "demo_student"))
            { s.IsDeleted = false; s.DeletedAt = null; }
            db.SaveChanges();

            if (!db.Users.Any(u => u.Username == "demo_admin"))
            {
                db.Users.Add(NewUser("demo_admin", demoPass, "Admin", "Demo", "Admin", "demo_admin@example.test"));
                db.SaveChanges();
            }

            if (!db.Users.Any(u => u.Username == "demo_teacher"))
            {
                var user = NewUser("demo_teacher", demoPass, "Teacher", "Demo", "Teacher", "demo_teacher@example.test");
                db.Users.Add(user);
                db.SaveChanges();
                var branch = db.Categories.Select(c => c.Name).FirstOrDefault() ?? "Genel";
                var teacher = new Teacher
                {
                    FirstName = user.FirstName, LastName = user.LastName, Email = user.Email,
                    Branch = branch, UserId = user.Id, CreatedAt = DateTime.UtcNow
                };
                db.Teachers.Add(teacher);
                db.SaveChanges();
                teacher.TeacherNumber = DateTime.UtcNow.ToString("yy") + teacher.Id.ToString().PadLeft(7, '0');
                db.SaveChanges();
            }

            if (!db.Users.Any(u => u.Username == "demo_student"))
            {
                var user = NewUser("demo_student", demoPass, "User", "Demo", "Student", "demo_student@example.test");
                user.Balance = 1000m; // satın alma akışını hemen denemek için
                db.Users.Add(user);
                db.SaveChanges();
                var student = new Student
                {
                    FirstName = user.FirstName, LastName = user.LastName, Email = user.Email,
                    UserId = user.Id, CreatedAt = DateTime.UtcNow
                };
                db.Students.Add(student);
                db.SaveChanges();
                student.StudentNumber = DateTime.UtcNow.ToString("yy") + student.Id.ToString().PadLeft(7, '0');
                db.WalletTransactions.Add(new WalletTransaction { UserId = user.Id, Amount = 1000m, Type = "TopUp", Description = "Demo bakiye" });
                db.SaveChanges();
            }

            // demo profiller de seed eğitmen/öğrencileri gibi aylar önce katılmış görünür
            var teacherJoined = DateTime.UtcNow.AddDays(-330);
            foreach (var t in db.Teachers.Where(t => t.User != null && t.User.Username == "demo_teacher" && t.CreatedAt > teacherJoined))
                t.CreatedAt = teacherJoined;
            var studentJoined = DateTime.UtcNow.AddDays(-200);
            foreach (var s in db.Students.Where(s => s.User != null && s.User.Username == "demo_student" && s.CreatedAt > studentJoined))
                s.CreatedAt = studentJoined;
            db.SaveChanges();
        }

        private static User NewUser(string username, string password, string role, string first, string last, string email) => new()
        {
            Username = username,
            Password = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            FirstName = first,
            LastName = last,
            Email = email
        };
    }
}
