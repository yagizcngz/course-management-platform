using EdTechApi.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.DataAccess.Context
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Student> Students { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Enrollment> Enrollments { get; set; }
        
        // Yeni eklediğimiz Users tablosu
        public DbSet<User> Users { get; set; } 

        // Yeni eklediğimiz Teachers (Öğretmenler) tablosu
        public DbSet<Teacher> Teachers { get; set; }

        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<TeachingRequest> TeachingRequests { get; set; }
        public DbSet<SupportRequest> SupportRequests { get; set; }
        public DbSet<WalletTransaction> WalletTransactions { get; set; }
        public DbSet<Lesson> Lessons { get; set; }
        public DbSet<TeacherApplication> TeacherApplications { get; set; }
        public DbSet<LessonCompletion> LessonCompletions { get; set; }
        public DbSet<CourseCompletion> CourseCompletions { get; set; }
        public DbSet<CourseRating> CourseRatings { get; set; }
        public DbSet<BranchChangeRequest> BranchChangeRequests { get; set; }
        public DbSet<ForumThread> ForumThreads { get; set; }
        public DbSet<ForumPost> ForumPosts { get; set; }
        public DbSet<ForumPostLike> ForumPostLikes { get; set; }
        public DbSet<Friendship> Friendships { get; set; }
        public DbSet<DirectMessage> DirectMessages { get; set; }

        // Bütün tarihler UTC yazılır (DateTime.UtcNow) ama SQL Server datetime2 türü bilgisini saklamaz; okunan değer
        // Unspecified olur ve JSON'a "Z"siz çıkınca tarayıcı yerel saat sanır (Türkiye'de 3 saat kayma). Okurken UTC işaretlenir.
        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
            configurationBuilder.Properties<DateTime?>().HaveConversion<UtcDateTimeConverter>();
        }

        private sealed class UtcDateTimeConverter() : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
            v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 1. Öğrenci numarasının benzersiz (Unique) olması kuralı:
             modelBuilder.Entity<Student>()
               .HasIndex(s => s.StudentNumber)
                .IsUnique();

            // 2. Soft-delete global query filter'ları: IsDeleted=true olan satırlar
            //    normal sorgularda (GetAll, FindAsync vb.) otomatik olarak gizlenir.
            //    "Silinenleri" görmek için servislerde IgnoreQueryFilters() kullanılıyor.
            modelBuilder.Entity<Student>().HasQueryFilter(s => !s.IsDeleted);
            modelBuilder.Entity<Course>().HasQueryFilter(c => !c.IsDeleted);
            modelBuilder.Entity<Enrollment>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Teacher>().HasQueryFilter(t => !t.IsDeleted);
            modelBuilder.Entity<Lesson>().HasQueryFilter(l => !l.IsDeleted);

            modelBuilder.Entity<User>().Property(u => u.Balance).HasPrecision(18, 2);
            modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
            modelBuilder.Entity<User>().HasIndex(u => u.Role);
            modelBuilder.Entity<User>().Property(u => u.FeaturedBadges).HasMaxLength(400);
            modelBuilder.Entity<WalletTransaction>().Property(t => t.Amount).HasPrecision(18, 2);
            modelBuilder.Entity<WalletTransaction>().HasIndex(t => new { t.UserId, t.CreatedAt });
            // bir satın almanın en fazla bir iadesi, bir öğretmen payı ve bir pay geri alımı olur: eşzamanlı iki iade
            // isteğinden ikincisi veritabanında reddedilir (bakiye iki kez artmaz)
            modelBuilder.Entity<WalletTransaction>()
                .HasIndex(t => new { t.RelatedTransactionId, t.Type })
                .IsUnique()
                .HasFilter("[RelatedTransactionId] IS NOT NULL");

            // Aynı öğrenci aynı kursa yalnızca bir aktif kayıt (soft-delete edilenler hariç)
            modelBuilder.Entity<Enrollment>()
                .HasIndex(e => new { e.StudentId, e.CourseId })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");

            // Bir ders öğrenci başına bir kez tamamlanır
            modelBuilder.Entity<LessonCompletion>().HasIndex(c => new { c.StudentId, c.LessonId }).IsUnique();
            modelBuilder.Entity<LessonCompletion>().HasOne<Student>().WithMany().HasForeignKey(c => c.StudentId);

            // Bitirilen kurs öğrenci başına bir kez sayılır; Course'a FK yok, kurs kalıcı silinse de kayıt kalır
            modelBuilder.Entity<CourseCompletion>().HasIndex(c => new { c.StudentId, c.CourseId }).IsUnique();
            modelBuilder.Entity<CourseCompletion>().HasOne<Student>().WithMany().HasForeignKey(c => c.StudentId);

            // 3. Course - Teacher ilişkisi (Course.TeacherId nullable FK):
            //    Bir öğretmen (hard-delete ile) silinirse buna bağlı kursların TeacherId'si
            //    otomatik olarak null'a çekilir, kurs kaydı etkilenmez.
            modelBuilder.Entity<CourseRating>().HasIndex(r => new { r.StudentId, r.CourseId }).IsUnique();
            modelBuilder.Entity<CourseRating>().HasIndex(r => r.CourseId);
            modelBuilder.Entity<CourseRating>().HasOne<Student>().WithMany().HasForeignKey(r => r.StudentId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<CourseRating>().HasOne<Course>().WithMany().HasForeignKey(r => r.CourseId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<CourseRating>().ToTable(t => t.HasCheckConstraint("CK_CourseRatings_Stars", "[Stars] BETWEEN 1 AND 5"));

            modelBuilder.Entity<BranchChangeRequest>().Property(r => r.RequestedBranch).HasMaxLength(400);
            modelBuilder.Entity<BranchChangeRequest>().Property(r => r.CurrentBranch).HasMaxLength(400);
            modelBuilder.Entity<BranchChangeRequest>().Property(r => r.Status).HasMaxLength(16);
            modelBuilder.Entity<BranchChangeRequest>().HasIndex(r => new { r.Status, r.CreatedAt });
            modelBuilder.Entity<BranchChangeRequest>().HasOne(r => r.Teacher).WithMany().HasForeignKey(r => r.TeacherId).OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Course>()
                .HasOne(c => c.Teacher)
                .WithMany(t => t.Courses)
                .HasForeignKey(c => c.TeacherId)
                .OnDelete(DeleteBehavior.SetNull);

            // Topluluk: kullanıcıya giden FK'lerin hiçbiri zincirleme silmez (SQL Server çoklu zincir yolunu reddeder);
            // kalıcı temizlik (SoftDeleteCleanupService) bu satırları kendisi ayıklar
            modelBuilder.Entity<ForumThread>().Property(t => t.Title).HasMaxLength(160);
            modelBuilder.Entity<ForumThread>().Property(t => t.Topic).HasMaxLength(32);
            modelBuilder.Entity<ForumThread>().HasIndex(t => new { t.Topic, t.LastActivityAt });
            modelBuilder.Entity<ForumThread>().HasOne(t => t.Author).WithMany().HasForeignKey(t => t.AuthorId).OnDelete(DeleteBehavior.NoAction);
            modelBuilder.Entity<ForumPost>().Property(p => p.Body).HasMaxLength(4000);
            modelBuilder.Entity<ForumPost>().HasOne(p => p.Thread).WithMany(t => t.Posts).HasForeignKey(p => p.ThreadId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ForumPost>().HasOne(p => p.Author).WithMany().HasForeignKey(p => p.AuthorId).OnDelete(DeleteBehavior.NoAction);
            modelBuilder.Entity<ForumPostLike>().HasKey(l => new { l.PostId, l.UserId });
            modelBuilder.Entity<ForumPostLike>().HasOne<ForumPost>().WithMany(p => p.Likes).HasForeignKey(l => l.PostId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ForumPostLike>().HasOne<User>().WithMany().HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Friendship>().HasIndex(f => new { f.RequesterId, f.AddresseeId }).IsUnique();
            modelBuilder.Entity<Friendship>().HasIndex(f => f.AddresseeId);
            modelBuilder.Entity<Friendship>().Property(f => f.Status).HasMaxLength(16);
            modelBuilder.Entity<Friendship>().HasOne(f => f.Requester).WithMany().HasForeignKey(f => f.RequesterId).OnDelete(DeleteBehavior.NoAction);
            modelBuilder.Entity<Friendship>().HasOne(f => f.Addressee).WithMany().HasForeignKey(f => f.AddresseeId).OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<DirectMessage>().Property(m => m.Body).HasMaxLength(2000);
            modelBuilder.Entity<DirectMessage>().HasIndex(m => new { m.SenderId, m.RecipientId, m.CreatedAt });
            modelBuilder.Entity<DirectMessage>().HasIndex(m => new { m.RecipientId, m.ReadAt });
            modelBuilder.Entity<DirectMessage>().HasOne<User>().WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.NoAction);
            modelBuilder.Entity<DirectMessage>().HasOne<User>().WithMany().HasForeignKey(m => m.RecipientId).OnDelete(DeleteBehavior.NoAction);

            // NOT: Daha önce burada BCrypt.HashPassword(...) ile hash'lenmiş bir "admin" seed
            // kullanıcısı vardı, ancak BCrypt her çağrıldığında farklı bir salt/hash ürettiği
            // için (deterministik değil), EF Core'un migration karşılaştırmasını bozup
            // "PendingModelChangesWarning" hatasına yol açıyordu. HasData içindeki değerler
            // sabit olmak zorunda. Zaten "superadmin" hesabı /api/auth/register üzerinden
            // normal şekilde oluşturulup düzgün hash'lenmiş halde veritabanında duruyor,
            // bu yüzden buradaki seed'e ihtiyaç yok — kaldırıldı.

            base.OnModelCreating(modelBuilder);
        }
    }
}