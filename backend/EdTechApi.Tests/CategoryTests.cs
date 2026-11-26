using EdTechApi.API.Controllers;
using EdTechApi.API.Helpers;
using EdTechApi.Core.Constants;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EdTechApi.Tests
{
    // Courses, branches and applications store a category by name: renaming must move them, deleting must not orphan them.
    public class CategoryTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly Category _math, _empty;

        public CategoryTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();

            _math = new Category { Name = "Matematik" };
            _empty = new Category { Name = "Boş" };
            var user = new User { Username = "u", Role = "User", Email = "u@test" };
            _db.AddRange(_math, _empty, new Category { Name = "Fizik" }, user);
            _db.SaveChanges();
            _db.Teachers.AddRange(
                new Teacher { FirstName = "A", LastName = "A", Email = "a@test", TeacherNumber = "T1", Branch = "Matematik, Fizik" },
                new Teacher { FirstName = "B", LastName = "B", Email = "b@test", TeacherNumber = "T2", Branch = "Matematik Tarihi" });
            _db.Courses.AddRange(
                new Course { Title = "Live", Category = "Matematik", MaxCapacity = 5 },
                new Course { Title = "Deleted", Category = "Matematik", MaxCapacity = 5, IsDeleted = true });
            _db.TeacherApplications.Add(new TeacherApplication { UserId = user.Id, Branch = "Matematik", AboutMe = "x" });
            _db.SaveChanges();
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private CategoriesController Categories() => new(_db);

        [Fact]
        public async Task Renaming_moves_courses_branches_and_applications()
        {
            Assert.IsType<OkObjectResult>(await Categories().UpdateCategory(_math.Id, new Category { Id = _math.Id, Name = "Sayısal" }));

            var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            Assert.All(db.Courses.IgnoreQueryFilters().ToList(), c => Assert.Equal("Sayısal", c.Category));
            Assert.Equal(new[] { "Matematik Tarihi", "Sayısal, Fizik" }, db.Teachers.Select(t => t.Branch).OrderBy(b => b).ToArray());
            Assert.Equal("Sayısal", db.TeacherApplications.Single().Branch);
        }

        [Fact]
        public async Task A_category_in_use_cannot_be_deleted()
        {
            var refused = Assert.IsType<BadRequestObjectResult>(await Categories().DeleteCategory(_math.Id));
            Assert.Contains("1 kurs, 1 eğitmen", (string)refused.Value!);
            Assert.True(_db.Categories.Any(c => c.Id == _math.Id));

            Assert.IsType<OkObjectResult>(await Categories().DeleteCategory(_empty.Id));
        }

        [Fact]
        public async Task A_restart_does_not_bring_back_a_renamed_default()
        {
            var config = new ConfigurationBuilder().Build();
            Assert.IsType<OkObjectResult>(await Categories().UpdateCategory(_math.Id, new Category { Id = _math.Id, Name = "Sayısal" }));

            DataSeeder.Run(_db, config, isDevelopment: false);

            Assert.False(_db.Categories.Any(c => c.Name == "Matematik"));
        }

        [Fact]
        public void A_new_default_from_a_later_version_is_added_once()
        {
            using var connection = new SqliteConnection("DataSource=:memory:");
            connection.Open();
            using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
            db.Database.EnsureCreated();
            var config = new ConfigurationBuilder().Build();

            DataSeeder.Run(db, config, isDevelopment: false);
            Assert.Equal(BranchOptions.All.Length, db.Categories.Count());

            // pretend "Spor" arrived in a later version: it was never offered and does not exist yet
            db.Categories.Remove(db.Categories.Single(c => c.Name == "Spor"));
            var marker = db.SystemSettings.Single(s => s.SettingKey == CatalogSeed.OfferedDefaultsKey);
            marker.SettingValue = string.Join('\n', BranchOptions.All.Where(n => n != "Spor"));
            db.SaveChanges();

            DataSeeder.Run(db, config, isDevelopment: false);
            Assert.True(db.Categories.Any(c => c.Name == "Spor"));

            // the admin deletes it: it stays deleted
            db.Categories.Remove(db.Categories.Single(c => c.Name == "Spor"));
            db.SaveChanges();
            DataSeeder.Run(db, config, isDevelopment: false);
            Assert.False(db.Categories.Any(c => c.Name == "Spor"));
            Assert.Equal(BranchOptions.All.Length - 1, db.Categories.Count());
        }
    }
}
