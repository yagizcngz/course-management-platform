using EdTechApi.Business.Services;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Tests
{
    // Gerçek ilişkisel davranış (ExecuteUpdate, transaction, filtreli unique index) için bellek içi SQLite.
    public class WalletServiceTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AppDbContext _db;
        private readonly WalletService _wallet;
        private readonly User _studentUser;
        private readonly User _teacherUser;
        private readonly Course _course;

        public WalletServiceTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
            _db.Database.EnsureCreated();

            _studentUser = new User { Username = "s", Role = "User", FirstName = "S", Email = "s@test" };
            _teacherUser = new User { Username = "t", Role = "Teacher", FirstName = "T", Email = "t@test" };
            _db.Users.AddRange(_studentUser, _teacherUser);
            _db.SaveChanges();

            var teacher = new Teacher { FirstName = "T", LastName = "T", Email = "t@test", TeacherNumber = "T1", Branch = "Genel", UserId = _teacherUser.Id };
            _db.Teachers.Add(teacher);
            _db.Students.Add(new Student { FirstName = "S", LastName = "S", Email = "s@test", StudentNumber = "S1", UserId = _studentUser.Id });
            _db.SaveChanges();

            _course = new Course { Title = "C", Price = 100m, MaxCapacity = 10, Category = "Genel", TeacherId = teacher.Id };
            _db.Courses.Add(_course);
            _db.SaveChanges();

            _wallet = new WalletService(_db, new EnrollmentService(_db));
        }

        public void Dispose()
        {
            _db.Dispose();
            _connection.Dispose();
        }

        private decimal BalanceOf(User u) => _db.Users.AsNoTracking().Single(x => x.Id == u.Id).Balance;
        private bool IsEnrolled() => _db.Enrollments.Any(e => e.CourseId == _course.Id);

        [Fact]
        public async Task A_purchase_cannot_be_refunded_twice_even_concurrently()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 200m);
            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);
            var purchase = _db.WalletTransactions.Single(t => t.Type == "Purchase");
            await _wallet.RefundCourseAsync(_studentUser, _course.Id);

            // a racing request that slipped past the service checks writes the same refund row
            _db.WalletTransactions.Add(new WalletTransaction
            {
                UserId = _studentUser.Id, Amount = 100m, Type = "Refund", CourseId = _course.Id, RelatedTransactionId = purchase.Id
            });
            await Assert.ThrowsAsync<DbUpdateException>(() => _db.SaveChangesAsync());
        }

        [Fact]
        public async Task Deleting_a_buyer_keeps_the_sales_history_and_frees_the_username()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 200m);
            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);
            var student = _db.Students.Single(s => s.UserId == _studentUser.Id);

            await new StudentService(_db).DeleteStudentAsync(student.Id);

            Assert.Equal(3, _db.WalletTransactions.Count()); // top-up, purchase, teacher earning
            Assert.False(_db.Users.Any(u => u.Username == "s" || u.Email == "s@test"));
            Assert.Equal(AccountRetirement.DeletedRole, _db.Users.Single(u => u.Id == _studentUser.Id).Role);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-5)]
        [InlineData(10_000.01)]
        [InlineData(1.234)]
        public async Task TopUp_rejects_invalid_amounts(decimal amount)
        {
            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.TopUpAsync(_studentUser.Id, amount));
            Assert.Equal(0m, BalanceOf(_studentUser));
        }

        [Fact]
        public async Task TopUp_adds_balance_and_logs_transaction()
        {
            Assert.Equal(250m, await _wallet.TopUpAsync(_studentUser.Id, 250m));
            Assert.Single(_db.WalletTransactions.Where(t => t.UserId == _studentUser.Id && t.Type == "TopUp"));
        }

        [Fact]
        public async Task Purchase_debits_student_credits_teacher_share_and_enrolls()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 150m);

            var balance = await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);

            Assert.Equal(50m, balance);
            Assert.Equal(70m, BalanceOf(_teacherUser)); // varsayılan %70
            Assert.True(IsEnrolled());
        }

        [Fact]
        public async Task Purchase_uses_teacher_share_setting()
        {
            _db.SystemSettings.Add(new SystemSetting { SettingKey = "TEACHER_SHARE_PERCENT", SettingValue = "50" });
            _db.SaveChanges();
            await _wallet.TopUpAsync(_studentUser.Id, 100m);

            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);

            Assert.Equal(50m, BalanceOf(_teacherUser));
        }

        [Fact]
        public async Task Purchase_with_insufficient_balance_changes_nothing()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 99m);

            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.PurchaseCourseAsync(_studentUser, _course.Id));

            Assert.Equal(99m, BalanceOf(_studentUser));
            Assert.Equal(0m, BalanceOf(_teacherUser));
            Assert.False(IsEnrolled());
        }

        [Fact]
        public async Task Purchase_twice_is_rejected()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 300m);
            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);

            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.PurchaseCourseAsync(_studentUser, _course.Id));
            Assert.Equal(200m, BalanceOf(_studentUser));
        }

        [Fact]
        public async Task Purchase_rolls_back_when_course_is_full()
        {
            _course.MaxCapacity = 0;
            _db.SaveChanges();
            await _wallet.TopUpAsync(_studentUser.Id, 100m);

            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.PurchaseCourseAsync(_studentUser, _course.Id));

            Assert.Equal(100m, BalanceOf(_studentUser));
            Assert.Empty(_db.WalletTransactions.Where(t => t.Type == "Purchase"));
        }

        [Fact]
        public async Task Teacher_cannot_buy_own_course()
        {
            await _wallet.TopUpAsync(_teacherUser.Id, 100m);
            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.PurchaseCourseAsync(_teacherUser, _course.Id));
        }

        [Fact]
        public async Task Refund_restores_balances_unenrolls_and_allows_rebuy()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 100m);
            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);

            var balance = await _wallet.RefundCourseAsync(_studentUser, _course.Id);

            Assert.Equal(100m, balance);
            Assert.Equal(0m, BalanceOf(_teacherUser));
            Assert.False(IsEnrolled());
            Assert.False(await _wallet.HasActivePurchaseAsync(_studentUser.Id, _course.Id));

            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);
            Assert.True(IsEnrolled());
            Assert.Equal(0m, BalanceOf(_studentUser));
        }

        [Fact]
        public async Task Refund_after_window_is_rejected()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 100m);
            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);
            var purchase = _db.WalletTransactions.Single(t => t.Type == "Purchase");
            purchase.CreatedAt = DateTime.UtcNow.AddDays(-8);
            _db.SaveChanges();

            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.RefundCourseAsync(_studentUser, _course.Id));
            Assert.Equal(0m, BalanceOf(_studentUser));
        }

        [Fact]
        public async Task Refund_twice_is_rejected()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 100m);
            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);
            await _wallet.RefundCourseAsync(_studentUser, _course.Id);

            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.RefundCourseAsync(_studentUser, _course.Id));
            Assert.Equal(100m, BalanceOf(_studentUser));
        }

        // Kursun tek dersini bitirir: kurs tamamlanmış olur
        private async Task CompleteCourseAsync()
        {
            var lesson = new Lesson { CourseId = _course.Id, Title = "L1", Order = 1 };
            _db.Lessons.Add(lesson);
            await _db.SaveChangesAsync();
            var student = _db.Students.Single(s => s.UserId == _studentUser.Id);
            await new EnrollmentService(_db).CompleteLessonAsync(student.Id, _course.Id, lesson.Id);
        }

        [Fact]
        public async Task A_completed_course_left_without_a_purchase_stays_owned_and_cannot_be_bought_again()
        {
            // ücretsizken katılıp bitirdiği kurs sonradan ücretlenmiş, öğrenci de kurstan ayrılmış
            var student = _db.Students.Single(s => s.UserId == _studentUser.Id);
            var enrollments = new EnrollmentService(_db);
            await enrollments.EnrollStudentAsync(student.Id, _course.Id);
            await CompleteCourseAsync();
            await enrollments.LeaveCourseAsync(student.Id, _course.Id);
            await _wallet.TopUpAsync(_studentUser.Id, 200m);

            Assert.True(await _wallet.OwnsCourseAsync(_studentUser.Id, _course.Id));
            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.PurchaseCourseAsync(_studentUser, _course.Id));
            Assert.Equal(200m, BalanceOf(_studentUser));
        }

        [Fact]
        public async Task Purchase_while_already_enrolled_is_rejected_without_charging()
        {
            var student = _db.Students.Single(s => s.UserId == _studentUser.Id);
            await new EnrollmentService(_db).EnrollStudentAsync(student.Id, _course.Id);
            await _wallet.TopUpAsync(_studentUser.Id, 200m);

            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.PurchaseCourseAsync(_studentUser, _course.Id));
            Assert.Equal(200m, BalanceOf(_studentUser));
            Assert.False(_db.WalletTransactions.Any(t => t.Type == "Purchase"));
        }

        [Fact]
        public async Task A_completed_purchase_cannot_be_refunded()
        {
            await _wallet.TopUpAsync(_studentUser.Id, 200m);
            await _wallet.PurchaseCourseAsync(_studentUser, _course.Id);
            Assert.Contains(_course.Id, await _wallet.GetRefundableCourseIdsAsync(_studentUser.Id));
            await CompleteCourseAsync();

            Assert.DoesNotContain(_course.Id, await _wallet.GetRefundableCourseIdsAsync(_studentUser.Id));
            await Assert.ThrowsAsync<ArgumentException>(() => _wallet.RefundCourseAsync(_studentUser, _course.Id));
            Assert.Equal(100m, BalanceOf(_studentUser));
        }
    }
}
