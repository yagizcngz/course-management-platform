using EdTechApi.Core.Constants;
using System.ComponentModel.DataAnnotations;

namespace EdTechApi.Core.Entities
{
    public class Course
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int MaxCapacity { get; set; }

        // --- YENİ EKLENEN SÜTUNLAR ---
        public decimal Price { get; set; } // Fiyat tutmak için en güvenli tip decimal'dir
        public string Instructor { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty; // Kurs içeriği / açıklaması
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsFeatured { get; set; } = false;
        // Beginner, Intermediate, Advanced; boşsa "tüm seviyeler" sayılır
        // sınırlı uzunluk: nvarchar(max) sütunlar kurs listesindeki sıralamanın bellek ihtiyacını büyütüyor
        [MaxLength(20)]
        public string? Level { get; set; }
        // BranchOptions.SubCategories içinden, kategorisine ait bir alt kategori; boşsa "genel"
        [MaxLength(100)]
        public string? SubCategory { get; set; }
        // Alt kategorinin altında serbest konu etiketi (örn. "Python", "Figma"); katalogdaki Konu süzgeci
        [MaxLength(60)]
        public string? Topic { get; set; }
        // Anlatım dili ve virgülle ayrılmış altyazı dilleri (CourseLanguages kodları)
        [MaxLength(8)]
        public string Language { get; set; } = CourseLanguages.Default;
        [MaxLength(64)]
        public string? SubtitleLanguages { get; set; }

        // --- YENİ EKLENEN SÜTUN ---
        // Kurs kapak fotoğrafının göreli URL'i (örn. /uploads/course-images/xxx.png).
        // Boşsa frontend otomatik olarak stok bir fotoğraf gösterir.
        public string? ImageUrl { get; set; }

        // --- YENİ EKLENEN SÜTUN: Öğretmen ataması ---
        // Nullable: bir kursun mutlaka bir öğretmene atanmış olması gerekmiyor.
        // Üstteki "Instructor" serbest metin alanı geriye dönük uyumluluk için duruyor;
        // bir TeacherId seçildiğinde CourseService, Instructor'ı o öğretmenin adıyla
        // otomatik senkronize eder.
        public int? TeacherId { get; set; }
        public Teacher? Teacher { get; set; }

        public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

        // Soft-delete: "silme" işlemi artık satırı DB'den kaldırmıyor, sadece işaretliyor.
        // Böylece Raporlar sayfasındaki "Silinen Kurslar" gerçek veriye dayanabiliyor.
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
    }
}