using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    // Öğretmen branşı yalnızca yönetici onayıyla değişir; bellek içi SQLite.
    public class BranchChangeRequestTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly TeacherService _teachers;
        private readonly Teacher _teacher;

        public BranchChangeRequestTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();

            _db.Categories.AddRange(new Category { Name = "Genel" }, new Category { Name = "Yazılım" }, new Category { Name = "Müzik" });
            var user = new User { Username = "t", Role = "Teacher", FirstName = "T", Email = "t@test" };
            _db.Users.Add(user);
            _db.SaveChanges();
            _teacher = new Teacher { FirstName = "T", LastName = "T", Email = "t@test", TeacherNumber = "T1", Branch = "Genel", UserId = user.Id };
            _db.Teachers.Add(_teacher);
            _db.SaveChanges();
            _db.Courses.Add(new Course { Title = "C", MaxCapacity = 10, Category = "Genel", TeacherId = _teacher.Id });
            _db.SaveChanges();

            _teachers = new TeacherService(_db);
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        [Fact]
        public async Task A_branch_change_waits_for_an_admin()
        {
            var request = await _teachers.RequestBranchChangeAsync(_teacher.Id, "genel, yazılım");
            Assert.Equal(("Genel, Yazılım", "Pending"), (request.RequestedBranch, request.Status));
            Assert.Equal("Genel", _db.Teachers.AsNoTracking().Single().Branch);

            // a second request replaces the pending one
            var second = await _teachers.RequestBranchChangeAsync(_teacher.Id, "Genel, Müzik");
            Assert.Equal(["Cancelled", "Pending"], _db.BranchChangeRequests.OrderBy(r => r.Id).Select(r => r.Status).ToArray());

            await _teachers.ReviewBranchRequestAsync(second.Id, approve: true);
            Assert.Equal("Genel, Müzik", _db.Teachers.AsNoTracking().Single().Branch);
            await Assert.ThrowsAsync<InvalidOperationException>(() => _teachers.ReviewBranchRequestAsync(second.Id, approve: false));
        }

        [Fact]
        public async Task A_branch_with_courses_cannot_be_dropped_and_unknown_branches_are_refused()
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() => _teachers.RequestBranchChangeAsync(_teacher.Id, "Yazılım"));
            await Assert.ThrowsAsync<ArgumentException>(() => _teachers.RequestBranchChangeAsync(_teacher.Id, "Genel, Astroloji"));
            await Assert.ThrowsAsync<ArgumentException>(() => _teachers.RequestBranchChangeAsync(_teacher.Id, " "));
            await Assert.ThrowsAsync<InvalidOperationException>(() => _teachers.RequestBranchChangeAsync(_teacher.Id, "genel"));

            var request = await _teachers.RequestBranchChangeAsync(_teacher.Id, "Genel, Müzik");
            await _teachers.ReviewBranchRequestAsync(request.Id, approve: false);
            Assert.Equal("Genel", _db.Teachers.AsNoTracking().Single().Branch);
            Assert.Equal("Rejected", (await _teachers.GetLatestBranchRequestAsync(_teacher.Id))!.Status);
        }
    }
}
