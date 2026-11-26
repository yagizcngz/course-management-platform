using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    // Ayar anahtarı ve eğitmen numarası veritabanında benzersiz; boş numara (kayıt anında geçici) serbest. Bellek içi SQLite.
    public class UniqueKeyTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;

        public UniqueKeyTests()
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
        public void Duplicate_setting_key_is_rejected()
        {
            _db.SystemSettings.AddRange(new SystemSetting { SettingKey = "K", SettingValue = "1" }, new SystemSetting { SettingKey = "K", SettingValue = "2" });
            Assert.Throws<DbUpdateException>(() => _db.SaveChanges());
        }

        [Fact]
        public void Duplicate_teacher_number_is_rejected_but_empty_ones_are_allowed()
        {
            _db.Teachers.AddRange(
                new Teacher { FirstName = "A", LastName = "A", Email = "a@test", TeacherNumber = "" },
                new Teacher { FirstName = "B", LastName = "B", Email = "b@test", TeacherNumber = "" });
            _db.SaveChanges();

            _db.Teachers.AddRange(
                new Teacher { FirstName = "C", LastName = "C", Email = "c@test", TeacherNumber = "260000001" },
                new Teacher { FirstName = "D", LastName = "D", Email = "d@test", TeacherNumber = "260000001" });
            Assert.Throws<DbUpdateException>(() => _db.SaveChanges());
        }
    }
}
