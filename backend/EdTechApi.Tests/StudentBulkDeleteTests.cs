using EdTechApi.API.Controllers;
using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace EdTechApi.Tests
{
    // Toplu öğrenci silme ya hepsini ya hiçbirini siler: biri kaydedilemezse öncekiler de silinmiş kalmaz. Bellek içi SQLite.
    public class StudentBulkDeleteTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly FailOnStudent _fail = new();
        private readonly int _a, _b;

        // kaydedilecek değişiklikler arasında FailId'li öğrenci varsa veritabanı hatası taklit edilir
        private sealed class FailOnStudent : SaveChangesInterceptor
        {
            public int? FailId;
            public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
                InterceptionResult<int> result, CancellationToken cancellationToken = default)
            {
                if (eventData.Context!.ChangeTracker.Entries<Student>().Any(e => e.State == EntityState.Modified && e.Entity.Id == FailId))
                    throw new DbUpdateException("simulated failure");
                return ValueTask.FromResult(result);
            }
        }

        public StudentBulkDeleteTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).AddInterceptors(_fail).Options);
            _db.Database.EnsureCreated();

            var users = new[]
            {
                new User { Username = "a", Role = "User", FirstName = "A", Email = "a@test" },
                new User { Username = "b", Role = "User", FirstName = "B", Email = "b@test" },
            };
            _db.Users.AddRange(users);
            _db.SaveChanges();
            var a = new Student { FirstName = "A", LastName = "A", Email = "a@test", StudentNumber = "S1", UserId = users[0].Id };
            var b = new Student { FirstName = "B", LastName = "B", Email = "b@test", StudentNumber = "S2", UserId = users[1].Id };
            _db.Students.AddRange(a, b);
            _db.SaveChanges();
            (_a, _b) = (a.Id, b.Id);
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private StudentsController Controller() => new(new StudentService(_db), _db);

        private AppDbContext Fresh() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

        [Fact]
        public async Task A_failure_on_one_student_leaves_all_of_them_in_place()
        {
            _fail.FailId = _b;

            await Assert.ThrowsAsync<DbUpdateException>(() => Controller().DeleteMultipleStudents([_a, _b]));

            using var db = Fresh();
            Assert.Equal(0, db.Students.IgnoreQueryFilters().Count(s => s.IsDeleted));
            Assert.Equal(0, db.Users.Count(u => u.Role == AccountRetirement.DeletedRole));
        }

        [Fact]
        public async Task Bulk_delete_removes_every_selected_student_and_closes_their_accounts()
        {
            await Controller().DeleteMultipleStudents([_a, _b]);

            using var db = Fresh();
            Assert.Equal(2, db.Students.IgnoreQueryFilters().Count(s => s.IsDeleted));
            Assert.Equal(2, db.Users.Count(u => u.Role == AccountRetirement.DeletedRole));
        }
    }
}
