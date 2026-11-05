using EdTechApi.Core.Constants;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Helpers
{
    // Kategoriler (her ortamda) ve demo katalog (öğretmen, öğrenci, kurs, ders, kayıt; yalnızca Development).
    // İdempotent: kategoriler ada, öğretmen/öğrenci e-postaya, kurslar başlığa, dersler kurs+başlığa göre eşleşir.
    // Seed kayıtları her açılışta "etkin" hale getirilir: soft-delete edilmişse geri yüklenir, kategorisi seed'deki
    // kategoriye çekilir (arama ve filtreler buna dayanır), açıklama yalnızca boş/yer tutucuysa güncellenir.
    public static class CatalogSeed
    {
        private record SeedTeacher(string Email, string First, string Last, string Branch, string About);
        private record SeedCourse(string Title, string Category, string TeacherEmail, decimal Price, int Capacity,
            string Description, (string Title, string Description)[] Lessons);
        private record SeedStudent(string Email, string First, string Last);

        /// <summary>Eksik kategorileri ekler, boş/eski kısa açıklamaları günceller. Eklenen kategori sayısını döner.</summary>
        public static int SeedCategories(AppDbContext db)
        {
            var existing = db.Categories.ToList();
            var added = 0;
            foreach (var (name, description) in BranchOptions.Defaults)
            {
                var cat = existing.FirstOrDefault(c => string.Equals(c.Name, name, StringComparison.OrdinalIgnoreCase));
                if (cat == null)
                {
                    db.Categories.Add(new Category { Name = name, Description = description });
                    added++;
                }
                else if (string.IsNullOrWhiteSpace(cat.Description) || BranchOptions.LegacyDescriptions.Contains(cat.Description))
                {
                    cat.Description = description;
                }
            }
            db.SaveChanges();
            return added;
        }

        public static void SeedCatalog(AppDbContext db)
        {
            var teachers = db.Teachers.IgnoreQueryFilters().ToList();
            foreach (var s in Teachers)
            {
                var t = teachers.FirstOrDefault(x => string.Equals(x.Email, s.Email, StringComparison.OrdinalIgnoreCase));
                if (t == null)
                {
                    t = new Teacher
                    {
                        FirstName = s.First, LastName = s.Last, Email = s.Email, Branch = s.Branch,
                        AboutMe = s.About, ProfilePictureUrl = Avatar(s.Email), CreatedAt = DateTime.UtcNow
                    };
                    db.Teachers.Add(t);
                    db.SaveChanges();
                    t.TeacherNumber = DateTime.UtcNow.ToString("yy") + t.Id.ToString().PadLeft(7, '0');
                    teachers.Add(t);
                    continue;
                }
                t.IsDeleted = false;
                t.DeletedAt = null;
                // seed branşları korunur, öğretmenin sonradan eklediği branşlar silinmez
                t.Branch = string.Join(", ", Split(t.Branch).Union(Split(s.Branch), StringComparer.OrdinalIgnoreCase));
                if (IsBlankBio(t.AboutMe)) t.AboutMe = s.About;
                if (string.IsNullOrWhiteSpace(t.ProfilePictureUrl)) t.ProfilePictureUrl = Avatar(s.Email);
            }
            db.SaveChanges();

            var courses = db.Courses.IgnoreQueryFilters().ToList();
            var lessons = db.Lessons.IgnoreQueryFilters().ToList();
            var seeded = new List<Course>();
            foreach (var s in Courses)
            {
                var teacher = teachers.First(x => x.Email == s.TeacherEmail);
                // aynı başlıkta hem silinmiş hem etkin kurs varsa etkin olan tercih edilir
                var c = courses.Where(x => string.Equals(x.Title.Trim(), s.Title, StringComparison.OrdinalIgnoreCase))
                    .OrderBy(x => x.IsDeleted).FirstOrDefault();
                if (c == null)
                {
                    c = new Course
                    {
                        Title = s.Title, Category = s.Category, Price = s.Price, MaxCapacity = s.Capacity,
                        Description = s.Description, TeacherId = teacher.Id, Instructor = FullName(teacher),
                        CreatedAt = DateTime.UtcNow
                    };
                    db.Courses.Add(c);
                    db.SaveChanges();
                    courses.Add(c);
                }
                else
                {
                    c.IsDeleted = false;
                    c.DeletedAt = null;
                    c.Category = s.Category;
                    if (IsPlaceholder(c.Description, c.Title)) c.Description = s.Description;
                    if (c.MaxCapacity <= 0) c.MaxCapacity = s.Capacity;
                    // öğretmen yalnızca kendi branşındaki kursa atanabilir (TeachersController kuralıyla aynı)
                    var current = teachers.FirstOrDefault(x => x.Id == c.TeacherId);
                    if (current == null || current.IsDeleted || !Split(current.Branch).Contains(c.Category, StringComparer.OrdinalIgnoreCase))
                    {
                        c.TeacherId = teacher.Id;
                        c.Instructor = FullName(teacher);
                    }
                }
                if (string.IsNullOrWhiteSpace(c.Level) && Levels.TryGetValue(s.Title, out var level)) c.Level = level;
                // alt kategori boşsa veya artık kategorisine ait değilse seed'dekiyle doldurulur; geçerli seçim korunur
                if (BranchOptions.NormalizeSubCategory(c.Category, c.SubCategory) == null)
                    c.SubCategory = SubCategoryOf.TryGetValue(s.Title, out var sub) ? sub : null;
                seeded.Add(c);

                // müfredat: seed derslerinden eksik olanlar eklenir, silinmiş olanlar geri yüklenir
                var own = lessons.Where(l => l.CourseId == c.Id).ToList();
                for (var i = 0; i < s.Lessons.Length; i++)
                {
                    var (title, description) = s.Lessons[i];
                    var l = own.FirstOrDefault(x => string.Equals(x.Title.Trim(), title, StringComparison.OrdinalIgnoreCase));
                    if (l == null)
                    {
                        l = new Lesson { CourseId = c.Id, Title = title, Description = description, Order = i + 1 };
                        db.Lessons.Add(l);
                        lessons.Add(l);
                    }
                    else if (l.IsDeleted)
                    {
                        l.IsDeleted = false;
                        l.DeletedAt = null;
                    }
                }
            }
            db.SaveChanges();

            SeedStudentsAndEnrollments(db, seeded);
            FillMissingTeacherBios(db);
        }

        // "merhaba" gibi test metinleri: boş, başlıkla aynı veya cümle kuramayacak kadar kısa açıklamalar
        private static bool IsPlaceholder(string? description, string title) =>
            string.IsNullOrWhiteSpace(description) || description.Trim() == title.Trim() || description.Trim().Length < 40;

        // "admin", "test" gibi deneme yazıları da boş sayılır; gerçek bir biyografi bundan uzundur
        private static bool IsBlankBio(string? bio) => string.IsNullOrWhiteSpace(bio) || bio.Trim().Length < 20;

        // Demo öğrenciler (giriş hesabı yok) ve kurslara deterministik dağılan kayıtlar; kapasite aşılmaz.
        private static void SeedStudentsAndEnrollments(AppDbContext db, List<Course> courses)
        {
            var existing = db.Students.IgnoreQueryFilters().ToList();
            var students = new List<Student>();
            foreach (var s in Students)
            {
                var st = existing.FirstOrDefault(x => string.Equals(x.Email, s.Email, StringComparison.OrdinalIgnoreCase));
                if (st == null)
                {
                    // StudentNumber benzersiz indeksli; gerçek numara Id'ye bağlı olduğu için önce geçici değer
                    st = new Student { FirstName = s.First, LastName = s.Last, Email = s.Email, StudentNumber = "tmp-" + s.Email, CreatedAt = DateTime.UtcNow };
                    db.Students.Add(st);
                    db.SaveChanges();
                    st.StudentNumber = DateTime.UtcNow.ToString("yy") + st.Id.ToString().PadLeft(7, '0');
                }
                else
                {
                    st.IsDeleted = false;
                    st.DeletedAt = null;
                }
                students.Add(st);
            }
            db.SaveChanges();

            var ids = courses.Select(c => c.Id).ToList();
            var enrollments = db.Enrollments.IgnoreQueryFilters().Where(e => ids.Contains(e.CourseId)).ToList();
            for (var i = 0; i < courses.Count; i++)
            {
                var course = courses[i];
                var active = enrollments.Count(e => e.CourseId == course.Id && !e.IsDeleted);
                var want = 3 + (i * 7) % 10;
                for (var k = 0; k < want && active < course.MaxCapacity; k++)
                {
                    var st = students[(i * 5 + k * 3) % students.Count];
                    // silinmiş kayıt öğrencinin/yöneticinin kararıdır, geri yüklenmez
                    if (enrollments.Any(x => x.CourseId == course.Id && x.StudentId == st.Id)) continue;
                    var e = new Enrollment
                    {
                        CourseId = course.Id, StudentId = st.Id, Grade = 55 + (i * 13 + k * 7) % 45,
                        EnrollmentDate = DateTime.UtcNow.AddDays(-((i * 11 + k * 5) % 120))
                    };
                    db.Enrollments.Add(e);
                    enrollments.Add(e);
                    active++;
                }
            }
            db.SaveChanges();
        }

        // Seed listesinde olmayan (ör. panelden eklenmiş) öğretmenlerin boş biyografilerini branşlarına göre doldurur.
        private static void FillMissingTeacherBios(AppDbContext db)
        {
            var descriptions = db.Categories.ToList()
                .ToDictionary(c => c.Name, c => c.Description ?? "", StringComparer.OrdinalIgnoreCase);
            foreach (var t in db.Teachers.IgnoreQueryFilters().Include(x => x.User).ToList().Where(x => IsBlankBio(x.AboutMe)))
            {
                var branches = Branches(t);
                var area = branches.Length > 0 ? string.Join(" ve ", branches) : "genel eğitim";
                var detail = branches.Select(b => descriptions.GetValueOrDefault(b)).FirstOrDefault(d => !string.IsNullOrWhiteSpace(d));
                t.AboutMe = $"{FullName(t)}, platformumuzda {area} alanında ders veren eğitmenimizdir. "
                    + (detail != null ? $"Uzmanlık alanı: {detail} " : "")
                    + "Derslerinde konuyu adım adım kurar, her bölümü örnek ve alıştırmalarla pekiştirir; öğrencilerinin sorularına ders sonrasında da yanıt verir.";
                if (t.User != null && IsBlankBio(t.User.AboutMe)) t.User.AboutMe = t.AboutMe;
            }
            db.SaveChanges();
        }

        /// <summary>
        /// Demo veritabanında boş kalan profil alanlarını doldurur: her öğretmen, öğrenci ve giriş hesabına avatar
        /// ve kısa biyografi, öğretmenlere branş. Yalnızca boş alanlara yazar; kullanıcının girdiği değer ezilmez.
        /// </summary>
        public static void BackfillProfiles(AppDbContext db)
        {
            var teachers = db.Teachers.IgnoreQueryFilters().Include(t => t.Courses).ToList();
            foreach (var t in teachers.Where(t => string.IsNullOrWhiteSpace(t.Branch)))
            {
                var fromCourses = t.Courses.Select(c => c.Category).Where(c => !string.IsNullOrWhiteSpace(c)).Distinct().ToList();
                t.Branch = fromCourses.Count > 0 ? string.Join(", ", fromCourses) : "Genel";
            }
            db.SaveChanges();
            FillMissingTeacherBios(db);
            foreach (var t in teachers.Where(t => string.IsNullOrWhiteSpace(t.ProfilePictureUrl)))
                t.ProfilePictureUrl = Avatar(t.Email, $"{t.FirstName}.{t.LastName}");

            var students = db.Students.IgnoreQueryFilters().ToList();
            var studentAreas = db.Enrollments
                .Select(e => new { e.StudentId, e.Course.Category }).ToList()
                .GroupBy(x => x.StudentId)
                .ToDictionary(g => g.Key, g => g.GroupBy(x => x.Category).OrderByDescending(c => c.Count()).Select(c => c.Key).Take(2).ToList());
            foreach (var s in students)
            {
                if (string.IsNullOrWhiteSpace(s.ProfilePictureUrl)) s.ProfilePictureUrl = Avatar(s.Email, $"{s.FirstName}.{s.LastName}");
                if (!IsBlankBio(s.AboutMe)) continue;
                var name = $"{s.FirstName} {s.LastName}".Trim();
                s.AboutMe = studentAreas.TryGetValue(s.Id, out var areas) && areas.Count > 0
                    ? $"{name}, E-Kurs'ta {string.Join(" ve ", areas)} alanlarındaki kurslara devam eden bir öğrenci. Haftalık çalışma planıyla ilerliyor, ders notlarını düzenli tutuyor ve takıldığı yerleri eğitmenlerine soruyor."
                    : $"{name}, E-Kurs'ta ilgi alanlarına uygun kursları keşfeden bir öğrenci. Kendine bir öğrenme planı çıkarıyor ve ilk kursunu seçmek için katalogdaki ders içeriklerini inceliyor.";
            }
            db.SaveChanges();

            // giriş hesabı, bağlı öğretmen/öğrenci profilinin görselini ve biyografisini paylaşır
            foreach (var u in db.Users.ToList())
            {
                var teacher = teachers.FirstOrDefault(t => t.UserId == u.Id);
                var student = students.FirstOrDefault(s => s.UserId == u.Id);
                if (string.IsNullOrWhiteSpace(u.ProfilePictureUrl))
                    u.ProfilePictureUrl = teacher?.ProfilePictureUrl ?? student?.ProfilePictureUrl ?? Avatar(u.Email, u.Username);
                if (IsBlankBio(u.AboutMe))
                    u.AboutMe = teacher?.AboutMe ?? student?.AboutMe ?? AccountBio(u);
                if (teacher != null && string.IsNullOrWhiteSpace(teacher.ProfilePictureUrl)) teacher.ProfilePictureUrl = u.ProfilePictureUrl;
                if (student != null && string.IsNullOrWhiteSpace(student.ProfilePictureUrl)) student.ProfilePictureUrl = u.ProfilePictureUrl;
            }
            db.SaveChanges();
        }

        // profili (öğretmen/öğrenci kaydı) olmayan hesaplar: yöneticiler ve henüz bağlanmamış hesaplar
        private static string AccountBio(User u)
        {
            var name = $"{u.FirstName} {u.LastName}".Trim();
            if (name.Length == 0) name = u.Username;
            return u.Role is "Admin" or "SuperAdmin" or "superadmin"
                ? $"{name}, E-Kurs platform yöneticisi. Kurs kataloğunu ve kategorileri düzenliyor, eğitmen başvurularını değerlendiriyor, duyuruları yayımlıyor ve destek taleplerini yanıtlıyor."
                : $"{name}, E-Kurs kullanıcısı. Platformdaki kursları ve eğitmenleri inceleyerek kendine uygun bir öğrenme yolu seçiyor.";
        }

        private static string[] Branches(Teacher t) => Split(t.Branch);

        private static string[] Split(string? branch) =>
            (branch ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        private static string FullName(Teacher t) => $"{t.FirstName} {t.LastName}".Trim();

        // shortcut: dış avatar servisi (DiceBear); çevrimdışı/üretim için yerel /uploads görselleriyle değiştirilebilir
        private static string Avatar(string email, string? fallback = null)
        {
            var seed = email.Contains('@') ? email.Split('@')[0] : fallback ?? email;
            return $"https://api.dicebear.com/9.x/notionists/svg?seed={Uri.EscapeDataString(seed)}&backgroundColor=ece4d2";
        }

        private const string Domain = "@edtech.example";

        private const string Beginner = "Beginner", Intermediate = "Intermediate", Advanced = "Advanced";

        // seed kurslarının seviyesi; yalnızca boş seviyeye yazılır, yöneticinin seçimi korunur
        private static readonly Dictionary<string, string> Levels = new(StringComparer.OrdinalIgnoreCase)
        {
            ["İleri Seviye C# ve .NET API"] = Advanced, ["Java"] = Beginner, ["Veri Yapıları"] = Intermediate,
            ["Algoritmalar"] = Intermediate, ["React ile Modern Web Geliştirme"] = Intermediate, ["Python"] = Beginner,
            ["SQL ve Veritabanı Tasarımı"] = Intermediate,
            ["Matematik"] = Beginner, ["Temel Matematik"] = Beginner, ["Matematik Geometri"] = Intermediate,
            ["Ayrık Matematik"] = Intermediate, ["Olasılık ve İstatistik"] = Intermediate,
            ["Kalkülüs ve Analiz"] = Advanced, ["Lineer Cebir"] = Advanced,
            ["Biyoloji"] = Beginner, ["Astronomiye Giriş"] = Beginner, ["LGS Fen Bilimleri Kampı"] = Intermediate,
            ["Fizik"] = Intermediate, ["Kimya"] = Intermediate, ["Genetik ve Moleküler Biyoloji"] = Advanced,
            ["Coğrafya"] = Beginner, ["Fiziki Coğrafya"] = Beginner, ["Türkiye Coğrafyası"] = Intermediate,
            ["Harita Bilgisi ve CBS"] = Intermediate, ["Jeopolitik ve Beşeri Coğrafya"] = Intermediate, ["Jeomorfoloji"] = Advanced,
            ["Tarih"] = Beginner, ["Sosyolojiye Giriş"] = Beginner, ["Cumhuriyet Tarihi"] = Intermediate,
            ["YKS Tarih Soru Kampı"] = Intermediate, ["Kent Sosyolojisi ve Saha Araştırması"] = Advanced,
            ["İngilizce A1-A2"] = Beginner, ["Almanca A1"] = Beginner, ["İspanyolca A1"] = Beginner, ["İngilizce"] = Intermediate,
            ["UI/UX Tasarımın Temelleri"] = Beginner, ["Grafik Tasarım ve Tipografi"] = Intermediate,
            ["Marka Kimliği ve Logo Tasarımı"] = Intermediate, ["Figma ile Prototipleme Atölyesi"] = Advanced,
            ["Karakalem ve Desen"] = Beginner, ["Sanat Tarihine Giriş"] = Beginner, ["Suluboya Atölyesi"] = Intermediate,
            ["Rönesans'tan Modernizme Sanat Tarihi"] = Advanced,
            ["Piyano Eğitimi"] = Beginner, ["Gitar Eğitimi"] = Beginner, ["Müzik Teorisi ve Kulak Eğitimi"] = Intermediate,
            ["Armoni ve Beste Atölyesi"] = Advanced,
            ["Beden Eğitimi"] = Beginner, ["Yoga ve Mobilite"] = Beginner, ["Fonksiyonel Antrenman"] = Intermediate,
            ["Sporcu Beslenmesi ve Performans"] = Intermediate,
            ["Etkili Çalışma Teknikleri"] = Beginner, ["Hızlı Okuma ve Not Alma Teknikleri"] = Beginner,
            ["YKS ve LGS Sınav Stratejileri"] = Beginner, ["Topluluk Önünde Konuşma"] = Intermediate,
            ["Python ile Veri Analizi"] = Beginner, ["Makine Öğrenmesine Giriş"] = Intermediate,
            ["Veri Görselleştirme ve Hikâye Anlatımı"] = Intermediate, ["Derin Öğrenme ve Sinir Ağları"] = Advanced,
            ["Mikroekonomiye Giriş"] = Beginner, ["Kişisel Finans ve Yatırım"] = Beginner, ["Muhasebenin Temelleri"] = Beginner,
            ["Makroekonomi ve Para Politikası"] = Intermediate,
            ["Türk Edebiyatına Giriş"] = Beginner, ["Felsefeye Giriş"] = Beginner, ["Mantık ve Eleştirel Düşünme"] = Intermediate,
            ["Dünya Edebiyatından Klasikler"] = Intermediate,
            ["Dijital Fotoğrafçılığın Temelleri"] = Beginner, ["Mobil Fotoğrafçılık ve Video Kurgu"] = Beginner,
            ["Sinema Dili ve Film Analizi"] = Intermediate, ["Kısa Film Yapımı"] = Advanced,
            ["Türkçe Dil Bilgisi ve Yazım Kuralları"] = Beginner, ["TYT-AYT Türkçe Paragraf ve Anlam Bilgisi"] = Intermediate,
            ["Akademik Türkçe ve Kompozisyon"] = Intermediate, ["Diksiyon ve Etkili Hitabet"] = Intermediate,
            ["Cumhuriyet Dönemi Türk Edebiyatı"] = Advanced, ["Osmanlı Türkçesi ve Metin Okumaları"] = Advanced,
            ["Psikolojiye Giriş"] = Beginner, ["Gelişim Psikolojisi"] = Intermediate, ["Bilişsel Bilime Giriş"] = Intermediate,
            ["Araştırma Yöntemleri ve Deney Tasarımı"] = Advanced,
            ["Anayasa Hukukuna Giriş"] = Beginner, ["İdare Hukuku ve Kamu Yönetimi"] = Intermediate,
            ["Borçlar ve Ticaret Hukukunun Temelleri"] = Intermediate, ["KVKK ve Bilişim Hukuku"] = Intermediate,
            ["Arduino ile Gömülü Sistemlere Giriş"] = Beginner, ["Temel Elektronik ve Devre Analizi"] = Beginner,
            ["SolidWorks ile CAD ve Mekanik Tasarım"] = Intermediate, ["ROS ile Robotik ve Kontrol Sistemleri"] = Advanced,
            ["Siber Güvenlik ve Ağ Temelleri"] = Beginner, ["Unity ile Oyun Geliştirme"] = Beginner,
            ["Flutter ile Mobil Uygulama Geliştirme"] = Intermediate, ["Docker, Kubernetes ve DevOps"] = Advanced,
            ["Büyük Veri ve Veri Mühendisliği"] = Advanced,
            ["Siyaset Bilimi ve Uluslararası İlişkilere Giriş"] = Beginner,
            ["Hukukun Temel Kavramları ve Anayasa Bilgisi"] = Beginner,
            ["Etik ve Estetiğe Giriş"] = Intermediate,
            ["Girişimcilik ve İş Stratejisi"] = Intermediate,
            ["IELTS ve Akademik İngilizce"] = Advanced,
            ["Blender ile 3B Modelleme ve Animasyon"] = Beginner,
            ["Seramik ve Heykel Atölyesi"] = Beginner,
            ["Ableton ile Müzik Prodüksiyonu"] = Intermediate,
            ["Hareket Bilimi ve Sakatlıktan Korunma"] = Intermediate,
            ["Araştırma Yöntemleri ve Bilimsel Etik"] = Intermediate,
        };

        // seed kurslarının alt kategorisi (BranchOptions.SubCategories içinden); "Topluluk Önünde Konuşma" bilerek genel kalır
        private static readonly Dictionary<string, string> SubCategoryOf = new(StringComparer.OrdinalIgnoreCase)
        {
            ["İleri Seviye C# ve .NET API"] = "Web Geliştirme (Frontend & Backend)", ["Java"] = "Web Geliştirme (Frontend & Backend)", ["React ile Modern Web Geliştirme"] = "Web Geliştirme (Frontend & Backend)", ["SQL ve Veritabanı Tasarımı"] = "Web Geliştirme (Frontend & Backend)",
            ["Veri Yapıları"] = "Veri Yapıları & Algoritmalar", ["Algoritmalar"] = "Veri Yapıları & Algoritmalar", ["Python"] = "Veri Yapıları & Algoritmalar",
            ["Siber Güvenlik ve Ağ Temelleri"] = "Siber Güvenlik & Ağ",
            ["Flutter ile Mobil Uygulama Geliştirme"] = "Mobil Uygulama Geliştirme",
            ["Docker, Kubernetes ve DevOps"] = "Bulut Mimarisi & DevOps",
            ["Unity ile Oyun Geliştirme"] = "Oyun Geliştirme",
            ["Matematik"] = "TYT-AYT Matematik", ["Temel Matematik"] = "TYT-AYT Matematik",
            ["Matematik Geometri"] = "Geometri & Trigonometri",
            ["Ayrık Matematik"] = "Lineer Cebir & Soyut Matematik", ["Lineer Cebir"] = "Lineer Cebir & Soyut Matematik",
            ["Olasılık ve İstatistik"] = "Olasılık & İstatistik",
            ["Kalkülüs ve Analiz"] = "Analiz & Kalkülüs",
            ["Fizik"] = "Klasik & Kuantum Fiziği",
            ["Kimya"] = "Genel & Organik Kimya",
            ["Biyoloji"] = "Moleküler Biyoloji & Genetik", ["Genetik ve Moleküler Biyoloji"] = "Moleküler Biyoloji & Genetik",
            ["Astronomiye Giriş"] = "Astronomi & Astrofizik",
            ["LGS Fen Bilimleri Kampı"] = "YKS Fen Bilimleri",
            ["Fiziki Coğrafya"] = "Fiziki Coğrafya & Jeomorfoloji", ["Jeomorfoloji"] = "Fiziki Coğrafya & Jeomorfoloji", ["Coğrafya"] = "Fiziki Coğrafya & Jeomorfoloji",
            ["Türkiye Coğrafyası"] = "Türkiye Coğrafyası & Jeopolitik",
            ["Harita Bilgisi ve CBS"] = "CBS & Harita Okuma",
            ["Jeopolitik ve Beşeri Coğrafya"] = "Beşeri & Ekonomik Coğrafya",
            ["Tarih"] = "Türk & Dünya Tarihi", ["Cumhuriyet Tarihi"] = "Türk & Dünya Tarihi", ["YKS Tarih Soru Kampı"] = "Türk & Dünya Tarihi",
            ["Sosyolojiye Giriş"] = "Sosyoloji & Toplum Bilimleri", ["Kent Sosyolojisi ve Saha Araştırması"] = "Sosyoloji & Toplum Bilimleri",
            ["İngilizce A1-A2"] = "Genel İngilizce (A1–C1)", ["İngilizce"] = "Genel İngilizce (A1–C1)",
            ["Almanca A1"] = "Almanca",
            ["İspanyolca A1"] = "İspanyolca & Fransızca",
            ["UI/UX Tasarımın Temelleri"] = "UI/UX & Ürün Tasarımı", ["Figma ile Prototipleme Atölyesi"] = "UI/UX & Ürün Tasarımı",
            ["Grafik Tasarım ve Tipografi"] = "Grafik Tasarım & Tipografi",
            ["Marka Kimliği ve Logo Tasarımı"] = "Marka Kimliği & İllüstrasyon",
            ["Karakalem ve Desen"] = "Karakalem & Desen Atölyesi",
            ["Sanat Tarihine Giriş"] = "Sanat Tarihi & Eser Analizi", ["Rönesans'tan Modernizme Sanat Tarihi"] = "Sanat Tarihi & Eser Analizi",
            ["Suluboya Atölyesi"] = "Renk Kuramı & Yağlıboya",
            ["Piyano Eğitimi"] = "Piyano & Klavye",
            ["Gitar Eğitimi"] = "Gitar & Telli Çalgılar",
            ["Müzik Teorisi ve Kulak Eğitimi"] = "Müzik Teorisi, Armoni & Solfej", ["Armoni ve Beste Atölyesi"] = "Müzik Teorisi, Armoni & Solfej",
            ["Beden Eğitimi"] = "Fonksiyonel Antrenman & Kondisyon", ["Fonksiyonel Antrenman"] = "Fonksiyonel Antrenman & Kondisyon",
            ["Yoga ve Mobilite"] = "Zihin-Beden & Esneklik",
            ["Sporcu Beslenmesi ve Performans"] = "Beslenme & Sporcu Sağlığı",
            ["Etkili Çalışma Teknikleri"] = "Öğrenmeyi Öğrenme & Hafıza Teknikleri", ["Hızlı Okuma ve Not Alma Teknikleri"] = "Öğrenmeyi Öğrenme & Hafıza Teknikleri",
            ["YKS ve LGS Sınav Stratejileri"] = "Zaman Yönetimi & Verimlilik",
            ["Python ile Veri Analizi"] = "Veri Analizi & Görselleştirme", ["Veri Görselleştirme ve Hikâye Anlatımı"] = "Veri Analizi & Görselleştirme",
            ["Makine Öğrenmesine Giriş"] = "Makine Öğrenmesi",
            ["Derin Öğrenme ve Sinir Ağları"] = "Derin Öğrenme & NLP",
            ["Büyük Veri ve Veri Mühendisliği"] = "Büyük Veri & Veri Mühendisliği",
            ["Mikroekonomiye Giriş"] = "Mikro & Makroekonomi", ["Makroekonomi ve Para Politikası"] = "Mikro & Makroekonomi",
            ["Kişisel Finans ve Yatırım"] = "Finansal Piyasalar & Yatırım",
            ["Muhasebenin Temelleri"] = "Muhasebe & Kurumsal Finans",
            ["Türk Edebiyatına Giriş"] = "Dünya Edebiyatı & Karşılaştırmalı Metinler", ["Dünya Edebiyatından Klasikler"] = "Dünya Edebiyatı & Karşılaştırmalı Metinler",
            ["Felsefeye Giriş"] = "Klasik & Modern Felsefe",
            ["Mantık ve Eleştirel Düşünme"] = "Mantık & Eleştirel Düşünme",
            ["Dijital Fotoğrafçılığın Temelleri"] = "Dijital Fotoğrafçılık & Işık",
            ["Sinema Dili ve Film Analizi"] = "Sinema Dili & Film Analizi",
            ["Kısa Film Yapımı"] = "Senaryo & Kısa Film Yapımı",
            ["Mobil Fotoğrafçılık ve Video Kurgu"] = "Video Kurgu & Renk Düzenleme",
            ["TYT-AYT Türkçe Paragraf ve Anlam Bilgisi"] = "Paragraf & Anlam Bilgisi",
            ["Türkçe Dil Bilgisi ve Yazım Kuralları"] = "Türkçe Dil Bilgisi & Yazım",
            ["Akademik Türkçe ve Kompozisyon"] = "Akademik Yazım & Hitabet", ["Diksiyon ve Etkili Hitabet"] = "Akademik Yazım & Hitabet",
            ["Cumhuriyet Dönemi Türk Edebiyatı"] = "Modern Türk Edebiyatı",
            ["Osmanlı Türkçesi ve Metin Okumaları"] = "Divan & Halk Edebiyatı",
            ["Psikolojiye Giriş"] = "Davranış Bilimleri",
            ["Gelişim Psikolojisi"] = "Gelişim & Sosyal Psikoloji",
            ["Bilişsel Bilime Giriş"] = "Bilişsel Psikoloji & Nörobilim",
            ["Araştırma Yöntemleri ve Deney Tasarımı"] = "Deneysel Araştırma Yöntemleri",
            ["Anayasa Hukukuna Giriş"] = "Anayasa & İdare Hukuku", ["İdare Hukuku ve Kamu Yönetimi"] = "Anayasa & İdare Hukuku",
            ["Borçlar ve Ticaret Hukukunun Temelleri"] = "Borçlar & Ticaret Hukuku",
            ["KVKK ve Bilişim Hukuku"] = "Bilişim & Kişisel Veriler Hukuku",
            ["Arduino ile Gömülü Sistemlere Giriş"] = "Gömülü Sistemler & Elektronik", ["Temel Elektronik ve Devre Analizi"] = "Gömülü Sistemler & Elektronik",
            ["ROS ile Robotik ve Kontrol Sistemleri"] = "Robotik & Kontrol Sistemleri",
            ["SolidWorks ile CAD ve Mekanik Tasarım"] = "CAD & Mekanik Tasarım",
            ["Siyaset Bilimi ve Uluslararası İlişkilere Giriş"] = "Siyaset Bilimi & Uluslararası İlişkiler",
            ["Hukukun Temel Kavramları ve Anayasa Bilgisi"] = "Temel Hukuk & Anayasa",
            ["Etik ve Estetiğe Giriş"] = "Etik & Estetik",
            ["Girişimcilik ve İş Stratejisi"] = "Girişimcilik & Strateji",
            ["IELTS ve Akademik İngilizce"] = "Akademik & İş İngilizcesi (IELTS/TOEFL)",
            ["Blender ile 3B Modelleme ve Animasyon"] = "3B Modelleme & Hareketli Grafik",
            ["Seramik ve Heykel Atölyesi"] = "Heykel & Seramik",
            ["Ableton ile Müzik Prodüksiyonu"] = "Müzik Prodüksiyonu & Ses Tasarımı",
            ["Hareket Bilimi ve Sakatlıktan Korunma"] = "Hareket Bilimi & Sakatlık Önleme",
            ["Araştırma Yöntemleri ve Bilimsel Etik"] = "Araştırma Yöntemleri & Bilimsel Etik",
        };

        private static readonly SeedTeacher[] Teachers =
        {
            new("emre.aydin" + Domain, "Emre", "Aydın", "Yazılım",
                "Kıdemli backend geliştirici. Bilgisayar Mühendisliği lisansını ODTÜ'de tamamladı; on iki yıldır fintech ve e-ticaret şirketlerinde .NET, Java ve dağıtık sistemler üzerine çalışıyor. Ölçeklenebilir API tasarımı, temiz mimari ve test odaklı geliştirme konularında ekiplere mentorluk yapıyor. Derslerinde her konuyu gerçek bir proje üzerinde, kod incelemesi yaparak anlatıyor."),
            new("zeynep.arslan" + Domain, "Zeynep", "Arslan", "Yazılım, Matematik",
                "Algoritmalar ve ayrık matematik eğitmeni. Boğaziçi Üniversitesi Matematik bölümünden mezun, Bilgisayar Bilimleri yüksek lisansını kombinatoryal optimizasyon üzerine yaptı. Uluslararası programlama yarışmalarında takım koçluğu yapıyor. Soyut kavramları görselleştirerek ve adım adım çözümlerle anlatmasıyla tanınıyor."),
            new("mehmet.ozturk" + Domain, "Mehmet", "Öztürk", "Matematik",
                "Yirmi yıllık deneyime sahip matematik öğretmeni. Hacettepe Üniversitesi Matematik Eğitimi mezunu; lise ve üniversite hazırlık düzeyinde geometri, analiz ve problem çözme dersleri veriyor. Hazırladığı soru bankaları birçok dershanede kullanılıyor. Öğrencinin önce \"neden\"i kavramasını, sonra pratiği hızlandırmasını hedefliyor."),
            new("elif.sahin" + Domain, "Elif", "Şahin", "Fen Bilimleri",
                "Moleküler biyolog ve kimya eğitmeni. İstanbul Üniversitesi Biyoloji bölümünden sonra genetik üzerine doktora yaptı; üç yıl üniversite laboratuvarında araştırma görevlisi olarak çalıştı. Hücre biyolojisi, genetik ve organik kimya konularını günlük hayattan ve laboratuvardan örneklerle anlatıyor."),
            new("can.yildiz" + Domain, "Can", "Yıldız", "Fen Bilimleri",
                "Fizik öğretmeni ve amatör astronom. İTÜ Fizik Mühendisliği mezunu; on yıldır lise ve üniversite hazırlık fiziği öğretiyor. Gözlemevlerinde halk günleri düzenliyor, gökyüzü gözlem kampları yönetiyor. Mekanikten optiğe kadar her konuyu basit deney düzenekleri ve simülasyonlarla canlandırıyor."),
            new("ayse.demir" + Domain, "Ayşe", "Demir", "Coğrafya",
                "Fiziki coğrafya ve jeomorfoloji uzmanı. Ankara Üniversitesi DTCF Coğrafya bölümünde doktorasını karst jeomorfolojisi üzerine yaptı. On beş yıldır arazi çalışmaları yürütüyor; Toroslar ve İç Anadolu'da yer şekillerinin oluşumunu inceleyen projelerde yer aldı. Derslerinde fotoğraf, profil çizimi ve arazi gözlemlerini birlikte kullanıyor."),
            new("burak.kaya" + Domain, "Burak", "Kaya", "Coğrafya",
                "Harita mühendisi ve CBS uzmanı. Yıldız Teknik Üniversitesi Harita Mühendisliği mezunu; belediyeler ve afet yönetimi kurumları için mekânsal analiz projelerinde çalıştı. QGIS ve uzaktan algılama eğitimleri veriyor. Türkiye coğrafyasını haritalar ve gerçek veri setleri üzerinden okumayı öğretiyor."),
            new("selin.koc" + Domain, "Selin", "Koç", "Sosyal Bilimler",
                "Tarihçi ve sosyal bilimler eğitmeni. Hacettepe Üniversitesi Tarih bölümünde Osmanlı modernleşmesi üzerine yüksek lisans yaptı; arşiv belgeleriyle çalışma konusunda deneyimli. Tarihi ezber yerine kaynak okuma, neden-sonuç ilişkisi ve tartışma üzerinden öğretiyor."),
            new("merve.celik" + Domain, "Merve", "Çelik", "Yabancı Dil",
                "CELTA sertifikalı İngilizce öğretmeni. Ankara Üniversitesi İngiliz Dili ve Edebiyatı mezunu; iki yıl Londra'da dil okulunda öğretmenlik yaptı. Başlangıç seviyesinden iş İngilizcesine kadar iletişim odaklı dersler veriyor; konuşma pratiğine ve doğru telaffuza özel önem veriyor."),
            new("hakan.polat" + Domain, "Hakan", "Polat", "Yabancı Dil",
                "Almanca öğretmeni ve çevirmen. Münih'te büyüdü, İstanbul Üniversitesi Alman Dili ve Edebiyatı bölümünü bitirdi. Goethe-Institut sınavlarına hazırlık ve Almanya'da eğitim/iş hayatına uyum dersleri veriyor."),
            new("deniz.aksoy" + Domain, "Deniz", "Aksoy", "Tasarım",
                "Ürün tasarımcısı. Bilkent Grafik Tasarım mezunu; ajans ve teknoloji şirketlerinde on yıl boyunca mobil uygulama ve web ürünleri tasarladı. Kullanıcı araştırması, Figma ile prototipleme, tasarım sistemleri ve tipografi konularında atölyeler yürütüyor."),
            new("leyla.erdem" + Domain, "Leyla", "Erdem", "Sanat",
                "Ressam ve sanat tarihi eğitmeni. Mimar Sinan Güzel Sanatlar Üniversitesi Resim bölümü mezunu; eserleri karma ve kişisel sergilerde yer aldı. Karakalem, desen ve renk kuramı atölyeleri veriyor; sanat tarihini eserlerin önünde durup bakmayı öğreterek anlatıyor."),
            new("ozan.gunes" + Domain, "Ozan", "Güneş", "Müzik",
                "Piyanist ve gitar eğitmeni. İstanbul Üniversitesi Devlet Konservatuvarı piyano bölümü mezunu; oda müziği ve caz gruplarıyla konserler veriyor. On yıldır her yaştan öğrenciye nota okuma, armoni ve enstrüman tekniği öğretiyor."),
            new("kerem.tan" + Domain, "Kerem", "Tan", "Spor",
                "Beden eğitimi öğretmeni ve sertifikalı kuvvet-kondisyon antrenörü. Marmara Üniversitesi Spor Bilimleri mezunu; amatör kulüplerde atletizm antrenörlüğü yaptı. Doğru hareket tekniği, sakatlık önleme ve sürdürülebilir antrenman planlaması üzerine dersler veriyor."),
            new("gizem.ucar" + Domain, "Gizem", "Uçar", "Genel",
                "Eğitim bilimci ve öğrenme koçu. Boğaziçi Üniversitesi Rehberlik ve Psikolojik Danışmanlık mezunu, eğitim psikolojisi üzerine yüksek lisans yaptı. Etkili çalışma yöntemleri, zaman yönetimi ve sınav kaygısıyla başa çıkma konularında öğrencilere ve velilere seminerler veriyor."),
            new("selim.karaca" + Domain, "Selim", "Karaca", "Matematik",
                "Analiz ve lineer cebir öğretim görevlisi. ODTÜ Matematik bölümünde fonksiyonel analiz üzerine doktora yaptı; on yıldır mühendislik fakültelerinde Calculus ve Lineer Cebir dersleri veriyor. Tanımı ve teoremi önce bir resimle, sonra ispatla anlatmayı seviyor; derslerinde her kavramı mühendislikteki bir uygulamaya bağlıyor."),
            new("nazli.ergin" + Domain, "Nazlı", "Ergin", "Matematik, Veri Bilimi & Yapay Zeka",
                "İstatistikçi ve veri bilimci. Hacettepe Üniversitesi İstatistik bölümünü bitirdi, Bayesçi yöntemler üzerine yüksek lisans yaptı. Sağlık ve perakende sektörlerinde deney tasarımı ve tahmin modelleri kurdu. Olasılığı zar ve kartlarla, istatistiği gerçek veri setleriyle öğretiyor."),
            new("baris.ozkan" + Domain, "Barış", "Özkan", "Veri Bilimi & Yapay Zeka, Yazılım",
                "Makine öğrenmesi mühendisi. Sabancı Üniversitesi Bilgisayar Mühendisliği mezunu; görüntü işleme ve öneri sistemleri üzerine sekiz yıl çalıştı, açık kaynak ML kütüphanelerine katkı veriyor. Modelleri kara kutu olarak değil, matematiğini ve hatalarını göstererek anlatıyor."),
            new("irem.yalcin" + Domain, "İrem", "Yalçın", "Veri Bilimi & Yapay Zeka",
                "Veri analisti ve görselleştirme uzmanı. İTÜ Endüstri Mühendisliği mezunu; e-ticaret ve medya şirketlerinde SQL, Python ve pano tasarımıyla karar destek sistemleri kurdu. Veriden doğru soruyu sormayı ve sonucu herkesin anlayacağı bir grafikle anlatmayı öğretiyor."),
            new("tolga.sezer" + Domain, "Tolga", "Sezer", "Ekonomi & Finans",
                "Ekonomist. Bilkent Üniversitesi İktisat bölümünde lisans ve yüksek lisansını tamamladı; bir yatırım bankasında makroekonomik araştırma bölümünde yedi yıl çalıştı. Arz-talepten para politikasına kadar ekonomiyi günlük haberler ve güncel verilerle okumayı öğretiyor."),
            new("ceren.aktas" + Domain, "Ceren", "Aktaş", "Ekonomi & Finans",
                "Serbest muhasebeci mali müşavir ve finans eğitmeni. Marmara Üniversitesi İşletme mezunu; KOBİ'lere muhasebe ve finansal planlama danışmanlığı veriyor. Bilanço okumayı, bütçe yapmayı ve yatırım kararlarını sade bir dille, örnek tablolar üzerinden anlatıyor."),
            new("orhan.yesil" + Domain, "Orhan", "Yeşil", "Edebiyat & Felsefe",
                "Edebiyat öğretmeni ve deneme yazarı. İstanbul Üniversitesi Türk Dili ve Edebiyatı bölümünde Cumhuriyet dönemi romanı üzerine yüksek lisans yaptı. Yazıları edebiyat dergilerinde yayımlanıyor. Metni yüksek sesle okumayı, satır arasını tartışmayı ve öğrencinin kendi yorumunu yazmasını önemsiyor."),
            new("ece.bulut" + Domain, "Ece", "Bulut", "Edebiyat & Felsefe",
                "Felsefe eğitmeni. Boğaziçi Üniversitesi Felsefe bölümünden sonra bilgi felsefesi üzerine doktora yaptı. Antik Yunan'dan çağdaş felsefeye büyük soruları, klasik metinlerden kısa bölümler okuyarak ve argümanları adım adım çözümleyerek tartışıyor."),
            new("cem.oral" + Domain, "Cem", "Oral", "Fotoğrafçılık & Sinema",
                "Belgesel fotoğrafçısı. Mimar Sinan Güzel Sanatlar Üniversitesi Fotoğraf bölümü mezunu; çalışmaları ulusal dergilerde ve sergilerde yer aldı. Pozlama üçgeninden kompozisyona, sokak fotoğrafından düzenlemeye kadar teknik bilgiyi bakmayı öğrenmekle birlikte veriyor."),
            new("asli.tuna" + Domain, "Aslı", "Tuna", "Fotoğrafçılık & Sinema",
                "Yönetmen ve senarist. Kadir Has Üniversitesi Sinema ve Televizyon bölümünü bitirdi; kısa filmleri ulusal festivallerde gösterildi. Film analizi ve kısa film yapımı atölyeleri yürütüyor; senaryodan kurguya bir filmin nasıl kurulduğunu sahne sahne gösteriyor."),
            new("onur.balci" + Domain, "Onur", "Balcı", "Sosyal Bilimler",
                "Sosyolog. ODTÜ Sosyoloji bölümünde kentleşme ve göç üzerine doktora yaptı; saha araştırmalarında görüşme ve gözlem yöntemleriyle çalışıyor. Toplumsal olayları kavramlar ve gündelik hayattan örneklerle birlikte okumayı öğretiyor."),
            new("sena.yurt" + Domain, "Sena", "Yurt", "Yabancı Dil",
                "İspanyolca öğretmeni ve çevirmen. Ankara Üniversitesi İspanyol Dili ve Edebiyatı mezunu; Madrid'de bir yıl Erasmus, iki yıl dil okulunda öğretmenlik yaptı. DELE sınavlarına hazırlık ve iletişim odaklı başlangıç dersleri veriyor."),
            new("hatice.sonmez" + Domain, "Hatice", "Sönmez", "Türk Dili ve Edebiyatı",
                "İstanbul Üniversitesi Türk Dili ve Edebiyatı Bölümünden mezun olduktan sonra Marmara Üniversitesinde pedagojik formasyon eğitimini tamamladı. On dört yıldır ortaöğretim ve lise düzeyinde Türkçe öğretmenliği yapmaktadır. Çalışmalarında özellikle YKS ve LGS Türkçe hazırlığı, paragrafta yapı ve anlam bilgisi, sözcükte ve cümlede anlam konularına odaklanır. Derslerinde ezbere dayalı yöntemler yerine metin çözümleme, soru kalıplarını mantıksal olarak analiz etme ve akademik kompozisyon kurgulama tekniklerini uygulamalı biçimde işler."),
            new("kemal.erol" + Domain, "Kemal", "Erol", "Türk Dili ve Edebiyatı",
                "Boğaziçi Üniversitesi Türk Dili ve Edebiyatı Bölümünden lisans, Ankara Üniversitesinden yeni Türk edebiyatı alanında yüksek lisans derecesini aldı. On altı yıldır üniversite ve araştırma kurumlarında edebiyat tarihi ve Osmanlı Türkçesi dersleri vermektedir. Uzmanlık alanları arasında erken ve geç Cumhuriyet dönemi Türk edebiyatı, edebi akımlar ve Osmanlı paleografyası yer alır. Eğitimlerinde matbu ve rîka hatlı arşiv belgeleri üzerinden metin okuma çalışmaları yürütür; edebi eserleri dönemin toplumsal ve kültürel bağlamıyla ele alır."),
            new("derya.oktem" + Domain, "Derya", "Öktem", "Türk Dili ve Edebiyatı, Genel",
                "Hacettepe Üniversitesi Ankara Devlet Konservatuvarı Tiyatro Bölümünden mezun oldu. On sekiz yıl boyunca Devlet Tiyatrolarında oyuncu ve TRT radyolarında seslendirme sanatçısı olarak görev yaptı. Bireysel ve kurumsal düzeyde diksiyon, doğru nefes, fonetik, artikülasyon ve sahne konuşması eğitimleri vermektedir. Derslerinde diyafram kullanımını teknik egzersizlerle pekiştirir; katılımcıların konuşma kayıtlarını çözümleyerek vurgu, tonlama, beden dili ve ikna edici hitabet becerilerini birebir uygulamalarla geliştirir."),
            new("aylin.kara" + Domain, "Aylin", "Kara", "Psikoloji & Bilişsel Bilimler",
                "Orta Doğu Teknik Üniversitesi Psikoloji Bölümünü tamamladıktan sonra Ege Üniversitesinde gelişim psikolojisi alanında yüksek lisans yaptı. On iki yıldır gelişim psikolojisi ve sosyal psikoloji alanlarında akademik araştırmalar yürütmekte ve dersler vermektedir. Çocukluktan yetişkinliğe bilişsel değişim, bağlanma kuramları ve grup dinamikleri üzerine yoğunlaşır. Derslerinde klasik kuramsal yaklaşımları çağdaş ampirik araştırmalarla birleştirir; katılımcılara vaka çözümlemeleri ve gözlem protokolleri üzerinden analitik bakış kazandırır."),
            new("volkan.sener" + Domain, "Volkan", "Şener", "Psikoloji & Bilişsel Bilimler",
                "İstanbul Teknik Üniversitesindeki mühendislik lisansının ardından Boğaziçi Üniversitesi Bilişsel Bilim yüksek lisans programını tamamladı. On yıldır bilişsel bilim, nörobilişsel modelleme ve deneysel araştırma yöntemleri konularında dersler vermektedir. İnsan belleği, dikkat mekanizmaları ve karar verme süreçlerinin deneysel yollarla incelenmesi üzerine çalışır. Eğitimlerinde katılımcılara hipotez kurma, bilgisayarlı deney tasarımı ve toplanan davranışsal verilerin istatistiksel olarak modellenmesi adımlarını uygulamalı olarak aktarır."),
            new("serkan.yavuz" + Domain, "Serkan", "Yavuz", "Hukuk & Kamu Yönetimi",
                "Ankara Üniversitesi Hukuk Fakültesinden mezun oldu, kamu hukuku alanında yüksek lisansını tamamladı. On beş yıl serbest avukatlık ve kamu kurumlarında hukuk müşavirliği yaptı. Anayasa yargısı, idari işlemler, sözleşmeler ve kişisel verilerin korunması konularında eğitimler verir. Derslerinde her kuralı gerekçesi ve güncel mahkeme kararlarıyla birlikte anlatır, katılımcılara somut olay çözme alışkanlığı kazandırır."),
            new("melis.korkut" + Domain, "Melis", "Korkut", "Mühendislik & Robotik",
                "İstanbul Teknik Üniversitesi Kontrol ve Otomasyon Mühendisliğinden mezun oldu, mekatronik alanında yüksek lisans yaptı. Endüstriyel otomasyon ve otonom mobil robot projelerinde on yıl Ar-Ge mühendisi olarak çalıştı. Gömülü yazılım, devre tasarımı, ROS ve CAD konularında atölye eğitimleri verir. Derslerinde her kavramı çalışan bir prototip üzerinde gösterir; katılımcılar kursu kendi kurdukları bir devre veya mekanizmayla bitirir."),
            new("kaan.ersoy" + Domain, "Kaan", "Ersoy", "Yazılım",
                "Hacettepe Üniversitesi Bilgisayar Mühendisliğinden mezun oldu. Bir bankanın siber güvenlik ekibinde sızma testi uzmanı, ardından bir oyun stüdyosunda mobil ve oyun geliştirici olarak çalıştı; son altı yıldır bulut altyapısı ve DevOps danışmanlığı yapıyor. Derslerinde güvenli kod, otomasyon ve yayına alma süreçlerini gerçek projeler üzerinden anlatır, her bölümü yayında çalışan küçük bir uygulamayla bitirir."),
        };

        private const string StudentDomain = "@ogrenci.example";

        private static readonly SeedStudent[] Students =
        {
            new("ali.vural" + StudentDomain, "Ali", "Vural"), new("ayse.korkmaz" + StudentDomain, "Ayşe", "Korkmaz"),
            new("berk.altun" + StudentDomain, "Berk", "Altun"), new("buse.yilmaz" + StudentDomain, "Buse", "Yılmaz"),
            new("can.erdogan" + StudentDomain, "Can", "Erdoğan"), new("defne.kurt" + StudentDomain, "Defne", "Kurt"),
            new("efe.sahin" + StudentDomain, "Efe", "Şahin"), new("elif.ozdemir" + StudentDomain, "Elif", "Özdemir"),
            new("emir.aslan" + StudentDomain, "Emir", "Aslan"), new("ezgi.dogan" + StudentDomain, "Ezgi", "Doğan"),
            new("furkan.kilic" + StudentDomain, "Furkan", "Kılıç"), new("gamze.cetin" + StudentDomain, "Gamze", "Çetin"),
            new("hakan.koc" + StudentDomain, "Hakan", "Koç"), new("ipek.aydin" + StudentDomain, "İpek", "Aydın"),
            new("kaan.ozturk" + StudentDomain, "Kaan", "Öztürk"), new("lara.gunes" + StudentDomain, "Lara", "Güneş"),
            new("mert.yildirim" + StudentDomain, "Mert", "Yıldırım"), new("nehir.acar" + StudentDomain, "Nehir", "Acar"),
            new("ozan.tekin" + StudentDomain, "Ozan", "Tekin"), new("pelin.sari" + StudentDomain, "Pelin", "Sarı"),
            new("rana.ucar" + StudentDomain, "Rana", "Uçar"), new("sarp.keskin" + StudentDomain, "Sarp", "Keskin"),
            new("selin.avci" + StudentDomain, "Selin", "Avcı"), new("tuna.bozkurt" + StudentDomain, "Tuna", "Bozkurt"),
            new("umut.cakir" + StudentDomain, "Umut", "Çakır"), new("yaren.polat" + StudentDomain, "Yaren", "Polat"),
            new("yusuf.demirci" + StudentDomain, "Yusuf", "Demirci"), new("zehra.kaya" + StudentDomain, "Zehra", "Kaya"),
        };

        private static readonly SeedCourse[] Courses =
        {
            // --- Yazılım ---
            new("İleri Seviye C# ve .NET API", "Yazılım", "emre.aydin" + Domain, 1499m, 40,
                "C# dilinin ileri özelliklerini ve ASP.NET Core ile üretim kalitesinde REST API geliştirmeyi öğrenin. Async/await, LINQ, generic yapılar, bağımlılık enjeksiyonu, EF Core, JWT kimlik doğrulama ve katmanlı mimariyi tek bir proje üzerinden kuruyoruz. Temel C# bilen ve backend geliştiriciliğe adım atmak isteyenler için. Kurs sonunda test edilmiş, belgelenmiş bir API'yi baştan sona yazabileceksiniz.",
                new[] {
                    ("C#'ta modern dil özellikleri", "Record, pattern matching, nullable referans tipleri ve LINQ ile daha kısa, daha güvenli kod."),
                    ("Async programlama", "Task, async/await ve iptal belirteçleri; I/O ağırlıklı işlerde iş parçacığı tüketmeden çalışma."),
                    ("ASP.NET Core ile REST API", "Controller, routing, model doğrulama ve hata yönetimi middleware'i."),
                    ("EF Core ve veri erişimi", "DbContext, migration'lar, ilişkiler ve sorgu performansı."),
                    ("Kimlik doğrulama ve yayın", "JWT ile rol tabanlı yetkilendirme, ayar yönetimi ve uygulamayı yayına alma."),
                }),
            new("Java", "Yazılım", "emre.aydin" + Domain, 999m, 40,
                "Java ile nesne yönelimli programlamayı sıfırdan öğrenin. Sınıflar, kalıtım, arayüzler, koleksiyonlar, istisna yönetimi ve akışlar (Streams) konularını küçük uygulamalarla işliyoruz. Programlamaya yeni başlayanlar ve üniversitede Java dersi alan öğrenciler için uygundur.",
                new[] {
                    ("Java'ya giriş ve geliştirme ortamı", "JDK kurulumu, ilk program, değişkenler ve kontrol yapıları."),
                    ("Nesne yönelimli programlama", "Sınıf, nesne, kapsülleme, kalıtım ve çok biçimlilik."),
                    ("Koleksiyonlar ve generics", "List, Set, Map ve tip güvenli veri yapıları."),
                    ("İstisnalar ve Streams API", "Hata yönetimi ve fonksiyonel tarzda veri işleme."),
                }),
            new("Veri Yapıları", "Yazılım", "zeynep.arslan" + Domain, 899m, 50,
                "Yazılımın temelini oluşturan veri yapılarını hem kavramsal hem de kod düzeyinde öğrenin. Diziler, bağlı listeler, yığın ve kuyruklar, ağaçlar, hash tabloları ve graflar; her birinin zaman ve bellek maliyetleriyle birlikte. Teknik mülakatlara hazırlananlar ve bilgisayar mühendisliği öğrencileri için.",
                new[] {
                    ("Karmaşıklık analizi", "Big-O gösterimi ve bir yapının maliyetini okumak."),
                    ("Diziler, bağlı listeler, yığın ve kuyruk", "Doğrusal yapılar ve hangi durumda hangisinin seçileceği."),
                    ("Ağaçlar ve yığın (heap)", "İkili arama ağacı, dengeli ağaçlar ve öncelik kuyrukları."),
                    ("Hash tabloları ve graflar", "Çakışma çözümü, graf gösterimleri ve gezinme."),
                }),
            new("Algoritmalar", "Yazılım", "zeynep.arslan" + Domain, 999m, 50,
                "Problem çözme becerinizi sistematik hale getirin. Sıralama ve arama, böl ve yönet, açgözlü algoritmalar, dinamik programlama ve graf algoritmalarını örnek problemlerle çalışıyoruz. Veri yapılarını bilen ve yarışma programlamasına ya da mülakatlara hazırlanan öğrenciler için.",
                new[] {
                    ("Sıralama ve arama", "Merge sort, quick sort ve ikili arama; doğruluk ve maliyet."),
                    ("Böl ve yönet, açgözlü yaklaşım", "Problemi parçalamak ve yerel en iyi seçimin ne zaman işe yaradığı."),
                    ("Dinamik programlama", "Alt problemler, memoization ve tablo doldurma."),
                    ("Graf algoritmaları", "BFS, DFS, Dijkstra ve minimum yayılan ağaç."),
                }),
            new("React ile Modern Web Geliştirme", "Yazılım", "emre.aydin" + Domain, 1299m, 45,
                "React 19 ve TypeScript ile hızlı, erişilebilir ve bakımı kolay arayüzler geliştirin. Bileşen tasarımı, hook'lar, durum yönetimi, veri çekme, yönlendirme ve form işlemleri; bitirme projesi olarak bir kurs kataloğu uygulaması. HTML, CSS ve temel JavaScript bilen geliştiriciler için.",
                new[] {
                    ("Bileşenler ve JSX", "Props, bileşen bölme ve TypeScript ile tip güvenliği."),
                    ("Hook'lar ve durum", "useState, useEffect, özel hook'lar ve sık yapılan hatalar."),
                    ("Veri çekme ve yönlendirme", "API'den veri alma, yükleme/hata durumları ve dosya tabanlı rotalar."),
                    ("Formlar ve erişilebilirlik", "Kontrollü formlar, doğrulama ve klavye ile kullanılabilir arayüz."),
                    ("Bitirme projesi", "Kurs kataloğu uygulamasını uçtan uca kurmak ve yayınlamak."),
                }),
            // --- Matematik ---
            new("Matematik", "Matematik", "mehmet.ozturk" + Domain, 699m, 60,
                "Lise matematiğinin temel konularını sağlam bir zemine oturtun: sayılar, denklemler, fonksiyonlar, polinomlar, üstel ve logaritmik ifadeler. Her konu sezgisel anlatım, çözümlü örnek ve seviyeli soru setleriyle ilerler. Üniversite sınavına hazırlanan ve eksiklerini kapatmak isteyen öğrenciler için.",
                new[] {
                    ("Sayılar ve cebirsel ifadeler", "Bölünebilme, üslü-köklü ifadeler ve çarpanlara ayırma."),
                    ("Denklemler ve eşitsizlikler", "Birinci ve ikinci dereceden denklemler, mutlak değer."),
                    ("Fonksiyonlar", "Tanım, grafik okuma, bileşke ve ters fonksiyon."),
                    ("Üstel ve logaritmik fonksiyonlar", "Kurallar, grafikler ve gerçek hayat problemleri."),
                }),
            new("Matematik Geometri", "Matematik", "mehmet.ozturk" + Domain, 749m, 60,
                "Üçgenlerden çembere, katı cisimlerden analitik geometriye uzanan kapsamlı bir geometri kursu. Şekil çizerek düşünmeyi, yardımcı eleman kullanmayı ve ispat mantığını öğrenirsiniz. Sınav hazırlığındaki lise öğrencileri ve geometride kendini zayıf hissedenler için.",
                new[] {
                    ("Açılar ve üçgenler", "Temel teoremler, benzerlik ve eşlik."),
                    ("Dörtgenler ve çokgenler", "Alan ve çevre hesapları, özel dörtgenler."),
                    ("Çember ve daire", "Teğet, kiriş, açı ve alan ilişkileri."),
                    ("Analitik geometri", "Koordinat düzleminde doğru ve çember denklemleri."),
                }),
            new("Ayrık Matematik", "Matematik", "zeynep.arslan" + Domain, 849m, 50,
                "Bilgisayar bilimlerinin matematiksel temeli: mantık, ispat teknikleri, kümeler, bağıntılar, kombinatorik, graf teorisi ve özyineleme. Her konu yazılımdaki karşılığıyla birlikte anlatılır. Bilgisayar ve yazılım mühendisliği öğrencileri ile algoritmalara sağlam bir temel isteyenler için.",
                new[] {
                    ("Önermeler mantığı ve ispat", "Doğruluk tabloları, tümevarım ve çelişkiyle ispat."),
                    ("Kümeler, bağıntılar ve fonksiyonlar", "Denklik bağıntıları ve sayılabilirlik."),
                    ("Kombinatorik", "Permütasyon, kombinasyon, güvercin yuvası ilkesi."),
                    ("Graf teorisi", "Euler ve Hamilton yolları, ağaçlar ve boyama."),
                }),
            // --- Fen Bilimleri ---
            new("Fizik", "Fen Bilimleri", "can.yildiz" + Domain, 799m, 60,
                "Mekanikten elektriğe, dalgalardan optiğe lise fiziğinin tamamı. Formül ezberi yerine olayın arkasındaki modeli kurmayı, birim analizini ve grafik yorumlamayı öğretiyoruz. Basit deneyler ve simülasyonlarla desteklenen dersler; sınav hazırlığındaki öğrenciler için.",
                new[] {
                    ("Hareket ve kuvvet", "Newton yasaları, sürtünme ve serbest cisim diyagramları."),
                    ("İş, enerji ve momentum", "Korunum yasaları ve çarpışmalar."),
                    ("Elektrik ve manyetizma", "Devreler, Ohm yasası ve manyetik alan."),
                    ("Dalgalar ve optik", "Ses ve ışık dalgaları, kırılma ve mercekler."),
                }),
            new("Kimya", "Fen Bilimleri", "elif.sahin" + Domain, 749m, 60,
                "Atomun yapısından kimyasal tepkimelere, asit-bazdan organik kimyaya temel kimya. Konular laboratuvar örnekleri ve günlük hayattan bağlantılarla işlenir; mol hesapları adım adım pekiştirilir. Lise öğrencileri ve sağlık bilimlerine hazırlananlar için.",
                new[] {
                    ("Atom ve periyodik sistem", "Elektron dizilimi ve periyodik özellikler."),
                    ("Kimyasal bağlar ve tepkimeler", "İyonik ve kovalent bağ, denkleştirme ve mol kavramı."),
                    ("Asitler, bazlar ve tuzlar", "pH, nötrleşme ve tampon çözeltiler."),
                    ("Organik kimyaya giriş", "Hidrokarbonlar ve fonksiyonel gruplar."),
                }),
            new("Biyoloji", "Fen Bilimleri", "elif.sahin" + Domain, 749m, 60,
                "Hücreden ekosisteme canlıların yapısını ve işleyişini öğrenin. Hücre biyolojisi, kalıtım, insan fizyolojisi ve ekoloji konuları güncel araştırmalardan örneklerle anlatılır. Lise öğrencileri ve tıp, eczacılık gibi bölümlere hazırlananlar için.",
                new[] {
                    ("Hücre ve organeller", "Hücre zarı, madde geçişi ve hücre bölünmesi."),
                    ("Kalıtım ve genetik", "Mendel genetiği, DNA, gen ifadesi ve mutasyonlar."),
                    ("İnsan fizyolojisi", "Sinir, dolaşım ve sindirim sistemleri."),
                    ("Ekoloji", "Ekosistem, besin zinciri ve biyolojik çeşitlilik."),
                }),
            new("Astronomiye Giriş", "Fen Bilimleri", "can.yildiz" + Domain, 599m, 80,
                "Gökyüzünü okumayı öğrenin: takımyıldızlar, Güneş Sistemi, yıldızların yaşamı ve evrenin büyük ölçekli yapısı. Teleskop seçimi ve basit gözlem planlama dersleriyle birlikte. Ön bilgi gerekmez; meraklı her yaştan öğrenci için.",
                new[] {
                    ("Gök küresi ve takımyıldızlar", "Yön bulma, gökyüzü haritaları ve mevsimsel değişim."),
                    ("Güneş Sistemi", "Gezegenler, uydular ve küçük cisimler."),
                    ("Yıldızların yaşamı", "Doğum, ana kol, kırmızı dev, beyaz cüce ve kara delik."),
                    ("Gözlem pratiği", "Dürbün ve teleskopla gözlem, ışık kirliliği."),
                }),
            // --- Coğrafya ---
            new("Fiziki Coğrafya", "Coğrafya", "ayse.demir" + Domain, 699m, 60,
                "Yeryüzünü şekillendiren doğal sistemleri bir bütün olarak inceleyin: Dünya'nın şekli ve hareketleri, iklim elemanları, su döngüsü, toprak ve bitki örtüsü. Harita, grafik ve uydu görüntüleriyle zenginleştirilmiş dersler; lise öğrencileri ve coğrafyaya ilgi duyan herkes için.",
                new[] {
                    ("Dünya'nın şekli ve hareketleri", "Eksen eğikliği, mevsimler ve saat dilimleri."),
                    ("İklim bilgisi", "Sıcaklık, basınç, rüzgâr ve yağış; iklim tipleri."),
                    ("Su döngüsü ve hidrografya", "Akarsular, göller ve yeraltı suları."),
                    ("Toprak ve bitki örtüsü", "Toprak oluşumu ve biyomlar."),
                }),
            new("Jeomorfoloji", "Coğrafya", "ayse.demir" + Domain, 799m, 40,
                "Dağlar, vadiler, kıyılar ve mağaralar nasıl oluşur? İç ve dış kuvvetlerin yer şekilleri üzerindeki etkisini, Türkiye'den arazi örnekleriyle inceleyin. Topoğrafik profil çizimi ve fotoğraf yorumlama alıştırmaları içerir. Coğrafya öğrencileri ve ileri düzey lise öğrencileri için.",
                new[] {
                    ("İç kuvvetler", "Levha tektoniği, kıvrılma, kırılma, deprem ve volkanizma."),
                    ("Akarsu ve rüzgâr aşındırması", "Vadi tipleri, delta ve kumul oluşumu."),
                    ("Karstik ve buzul şekilleri", "Mağara, polye, sirk ve moren."),
                    ("Kıyı şekilleri", "Falez, tombolo, lagün ve kıyı tipleri."),
                    ("Arazi çalışması", "Topoğrafik profil çizimi ve yer şekli yorumlama."),
                }),
            new("Türkiye Coğrafyası", "Coğrafya", "burak.kaya" + Domain, 749m, 60,
                "Türkiye'nin konumunu, yer şekillerini, iklimini, nüfusunu ve ekonomik faaliyetlerini bölge bölge inceleyin. Güncel istatistikler ve tematik haritalarla Türkiye'yi mekânsal bir bakışla okumayı öğrenirsiniz. Sınavlara hazırlanan öğrenciler ve Türkiye'yi daha yakından tanımak isteyenler için.",
                new[] {
                    ("Konum ve yer şekilleri", "Matematik ve özel konum, dağlar, ovalar ve platolar."),
                    ("İklim ve bitki örtüsü", "İklim tipleri ve bölgesel farklar."),
                    ("Nüfus ve yerleşme", "Nüfus dağılışı, göç ve kentleşme."),
                    ("Ekonomik faaliyetler", "Tarım, sanayi, enerji ve turizm."),
                }),
            new("Harita Bilgisi ve CBS", "Coğrafya", "burak.kaya" + Domain, 999m, 35,
                "Harita okumadan mekânsal analize: ölçek, projeksiyon, koordinat sistemleri ve izohips okuma ile başlayıp QGIS kullanarak Coğrafi Bilgi Sistemleri ile kendi tematik haritalarınızı üretin. Coğrafya ve şehir planlama öğrencileri, harita ile çalışan profesyoneller için.",
                new[] {
                    ("Ölçek ve projeksiyonlar", "Haritada uzaklık ve alan hesapları, projeksiyon türleri."),
                    ("Koordinat sistemleri", "Enlem-boylam, UTM ve GPS ile konum belirleme."),
                    ("İzohips haritaları", "Eş yükselti eğrileri, eğim ve profil çıkarma."),
                    ("CBS'ye giriş: QGIS", "Vektör ve raster veri, katmanlar ve öznitelik tabloları."),
                    ("Mekânsal analiz", "Tampon, çakıştırma ve tematik harita üretimi."),
                }),
            new("Coğrafya", "Coğrafya", "ayse.demir" + Domain, 599m, 60,
                "Fiziki, beşerî ve ekonomik coğrafyanın temel kavramlarını tek kursta toplayan genel bir başlangıç. Doğa ile insan arasındaki etkileşimi harita okuma ve güncel örneklerle inceleyin. Lise öğrencileri ve coğrafyaya yeni başlayanlar için.",
                new[] {
                    ("Coğrafyanın konusu ve haritalar", "Coğrafi bakış açısı ve harita okuma temelleri."),
                    ("Doğal sistemler", "Yer şekilleri, iklim ve su kaynakları."),
                    ("Beşerî sistemler", "Nüfus, yerleşme ve göç."),
                    ("Küresel ortam", "Bölgeler, ülkeler ve çevre sorunları."),
                }),
            // --- Sosyal Bilimler ---
            new("Tarih", "Sosyal Bilimler", "selin.koc" + Domain, 649m, 60,
                "İlk çağ uygarlıklarından Osmanlı'ya ve yakın çağa uzanan bir tarih yolculuğu. Olayları kaynaklarıyla birlikte okumayı, dönemler arası bağlantı kurmayı ve neden-sonuç ilişkisini yorumlamayı öğrenirsiniz. Lise öğrencileri ve tarih meraklıları için.",
                new[] {
                    ("Tarih bilimi ve ilk uygarlıklar", "Kaynak türleri, Mezopotamya, Mısır ve Anadolu uygarlıkları."),
                    ("İlk Türk devletleri ve İslam tarihi", "Orta Asya'dan Anadolu'ya göçler."),
                    ("Osmanlı Devleti", "Kuruluştan dağılmaya siyasi ve toplumsal yapı."),
                    ("Yakın çağ", "Sanayi Devrimi, ulus devletler ve dünya savaşları."),
                }),
            new("Cumhuriyet Tarihi", "Sosyal Bilimler", "selin.koc" + Domain, 599m, 60,
                "Millî Mücadele'den günümüze Türkiye Cumhuriyeti'nin kuruluşu ve gelişimi. İnkılaplar, dış politika ve toplumsal dönüşüm, dönemin belgeleri ve basınından örneklerle ele alınır. Üniversite İnkılap Tarihi dersine ve sınavlara hazırlananlar için.",
                new[] {
                    ("Millî Mücadele", "Kongreler, TBMM'nin açılışı ve cepheler."),
                    ("Cumhuriyetin ilanı ve inkılaplar", "Siyasi, hukuki ve toplumsal yenilikler."),
                    ("Atatürk dönemi dış politika", "Lozan ve sonrası diplomasi."),
                    ("Çok partili hayata geçiş", "1945 sonrası siyasi ve toplumsal gelişmeler."),
                }),
            // --- Yabancı Dil ---
            new("İngilizce A1-A2", "Yabancı Dil", "merve.celik" + Domain, 799m, 30,
                "Sıfırdan başlayanlar için iletişim odaklı İngilizce. Kendinizi tanıtmaktan alışverişe, yol tarifinden geçmiş deneyimleri anlatmaya kadar günlük durumlarda konuşabilecek düzeye gelirsiniz. Temel dilbilgisi, sık kullanılan 1000 kelime ve bol konuşma pratiği.",
                new[] {
                    ("Tanışma ve günlük ifadeler", "Selamlaşma, kendini tanıtma ve sayılar."),
                    ("Şimdiki ve geniş zaman", "Rutinleri ve şu an olanları anlatmak."),
                    ("Geçmiş zaman", "Deneyimleri ve geçmiş olayları anlatmak."),
                    ("Gündelik hayat senaryoları", "Alışveriş, yol tarifi ve restoranda sipariş."),
                }),
            new("İngilizce", "Yabancı Dil", "merve.celik" + Domain, 899m, 30,
                "B1-B2 seviyesine ulaşmak isteyenler için kapsamlı İngilizce. Akıcı konuşma, akademik okuma, e-posta ve rapor yazma becerilerini geliştirirken ileri dilbilgisi yapılarını bağlam içinde öğrenirsiniz. Temel İngilizcesi olan öğrenciler ve iş hayatında İngilizce kullananlar için.",
                new[] {
                    ("Zamanların ileri kullanımı", "Perfect ve continuous yapılar, anlatı zamanları."),
                    ("Koşul cümleleri ve edilgen yapı", "Varsayımlar ve resmî anlatım."),
                    ("Okuma ve yazma", "Makale okuma, e-posta ve kısa rapor yazımı."),
                    ("Akıcı konuşma", "Tartışma, sunum ve fikir savunma pratiği."),
                }),
            new("Almanca A1", "Yabancı Dil", "hakan.polat" + Domain, 849m, 25,
                "Almancaya sağlam bir başlangıç. Telaffuz, artikeller, temel cümle yapısı ve günlük konuşma kalıplarıyla Goethe A1 sınavına hazırlanırsınız. Almanya'da eğitim veya çalışma planlayanlar için pratik bir giriş.",
                new[] {
                    ("Alfabe ve telaffuz", "Sesler, vurgu ve tanışma kalıpları."),
                    ("Artikeller ve isimler", "der, die, das ve çoğul yapılar."),
                    ("Fiiller ve cümle yapısı", "Fiil çekimi ve temel cümle düzeni."),
                    ("Gündelik konuşmalar", "Alışveriş, randevu alma ve yol sorma."),
                }),
            // --- Tasarım ---
            new("UI/UX Tasarımın Temelleri", "Tasarım", "deniz.aksoy" + Domain, 1199m, 35,
                "Kullanıcı ihtiyacından ekran tasarımına uzanan süreci uçtan uca öğrenin. Kullanıcı araştırması, bilgi mimarisi, wireframe, Figma ile prototipleme ve kullanılabilirlik testi; bitirme projesi olarak bir mobil uygulama akışı. Tasarıma geçmek isteyen geliştiriciler ve yeni başlayan tasarımcılar için.",
                new[] {
                    ("UX süreci ve kullanıcı araştırması", "Görüşme, persona ve kullanıcı yolculuğu."),
                    ("Bilgi mimarisi ve wireframe", "Ekran akışları ve düşük çözünürlüklü taslaklar."),
                    ("Figma ile arayüz tasarımı", "Bileşenler, auto layout ve tasarım sistemi."),
                    ("Prototip ve kullanılabilirlik testi", "Etkileşimli prototip ve geri bildirimle yineleme."),
                }),
            new("Grafik Tasarım ve Tipografi", "Tasarım", "deniz.aksoy" + Domain, 999m, 35,
                "Görsel iletişimin temel ilkelerini öğrenin: kompozisyon, renk, görsel hiyerarşi ve tipografi. Afiş, logo ve marka kimliği çalışmalarıyla portfolyonuza eklenecek işler üretirsiniz. Tasarıma ilgi duyan ve temel bir portfolyo oluşturmak isteyenler için.",
                new[] {
                    ("Tasarım ilkeleri", "Denge, kontrast, hizalama ve yakınlık."),
                    ("Renk kuramı", "Renk uyumları ve marka renkleri."),
                    ("Tipografi", "Yazı karakteri seçimi, eşleştirme ve okunabilirlik."),
                    ("Marka kimliği projesi", "Logo, kartvizit ve afiş tasarımı."),
                }),
            // --- Sanat ---
            new("Karakalem ve Desen", "Sanat", "leyla.erdem" + Domain, 699m, 20,
                "Gözlemle çizim yapmayı temelden öğrenin. Çizgi, oran, perspektif, ışık-gölge ve doku çalışmalarıyla natürmort, mekân ve figür çizimine ilerliyoruz. Hiç çizim deneyimi olmayanlar ve güzel sanatlar sınavlarına hazırlananlar için.",
                new[] {
                    ("Çizgi ve oran", "Kalem tutuşu, ölçü alma ve temel formlar."),
                    ("Perspektif", "Tek ve iki kaçış noktalı perspektif."),
                    ("Işık ve gölge", "Ton skalası, hacim ve doku."),
                    ("Figür çizimi", "İnsan oranları ve hareketli figür eskizleri."),
                }),
            new("Sanat Tarihine Giriş", "Sanat", "leyla.erdem" + Domain, 549m, 80,
                "Mağara resimlerinden çağdaş sanata, eserleri dönemleri ve bağlamlarıyla birlikte okuyun. Rönesans, Barok, Empresyonizm ve modern sanat akımlarını başyapıtlar üzerinden inceliyor; bir eseri nasıl \"bakarak\" anlayacağınızı öğreniyoruz. Sanata meraklı herkes için.",
                new[] {
                    ("Antik dünya ve Orta Çağ", "Mısır, Yunan, Roma ve Bizans sanatı."),
                    ("Rönesans ve Barok", "Perspektifin doğuşu ve dramatik ışık."),
                    ("19. yüzyıl ve Empresyonizm", "Akademiden açık havaya resim."),
                    ("Modern ve çağdaş sanat", "Kübizmden kavramsal sanata."),
                }),
            // --- Müzik ---
            new("Piyano Eğitimi", "Müzik", "ozan.gunes" + Domain, 1099m, 15,
                "Nota okumadan iki elle parça çalmaya, her seviyeye uygun piyano eğitimi. Doğru oturuş ve el pozisyonu, ritim, gam ve akorlarla tekniğinizi kurar; klasik ve popüler eserlerle repertuvar oluşturursunuz. Yeni başlayanlar ve ara verip yeniden başlamak isteyenler için.",
                new[] {
                    ("Klavye ve nota okuma", "Oturuş, el pozisyonu, porte ve nota değerleri."),
                    ("Ritim ve iki el koordinasyonu", "Ölçü, tempo ve basit eşlikler."),
                    ("Gamlar ve akorlar", "Majör-minör gamlar ve temel akor dizileri."),
                    ("İlk repertuvar", "Klasik ve popüler eserlerden seçmeler."),
                }),
            new("Gitar Eğitimi", "Müzik", "ozan.gunes" + Domain, 899m, 20,
                "Akustik gitarla temel akorlardan ritim kalıplarına, tab okumadan basit solo çalmaya. Sevdiğiniz şarkıları eşlik ederek çalabilecek düzeye gelirsiniz. Hiç gitar çalmamış olanlar için.",
                new[] {
                    ("Gitarı tanımak ve akort", "Tutuş, akort ve ilk akorlar."),
                    ("Ritim kalıpları", "Tempo, tellere vuruş ve geçişler."),
                    ("Barre akorlar ve tab okuma", "Klavye üzerinde akorları taşımak."),
                    ("Şarkı eşliği ve basit solo", "Pentatonik gam ve doğaçlamaya giriş."),
                }),
            // --- Spor ---
            new("Beden Eğitimi", "Spor", "kerem.tan" + Domain, 499m, 40,
                "Temel motor becerilerden takım sporlarına, okul beden eğitimi müfredatının kuramsal ve uygulamalı içeriği. Isınma, esneklik, dayanıklılık ve oyun kuralları; sağlıklı yaşam alışkanlıklarıyla birlikte. Öğrenciler ve beden eğitimi öğretmen adayları için.",
                new[] {
                    ("Isınma ve esneklik", "Dinamik ısınma ve germe teknikleri."),
                    ("Temel motor beceriler", "Koşu, sıçrama, atma ve denge."),
                    ("Takım sporları", "Basketbol, voleybol ve futbolun temel kuralları."),
                    ("Sağlıklı yaşam", "Beslenme, uyku ve düzenli hareket."),
                }),
            new("Fonksiyonel Antrenman", "Spor", "kerem.tan" + Domain, 599m, 30,
                "Günlük hayatta daha güçlü ve sakatlıktan uzak olmak için fonksiyonel antrenman. Temel hareket kalıplarını doğru teknikle öğrenir, kendi seviyenize göre haftalık bir program kurarsınız. Ekipmansız ya da az ekipmanla, evde veya salonda uygulanabilir.",
                new[] {
                    ("Hareket kalıpları", "Squat, hinge, itme, çekme ve taşıma."),
                    ("Core ve denge", "Gövde stabilitesi ve tek bacak çalışmaları."),
                    ("Kondisyon", "Aralıklı antrenman ve dayanıklılık."),
                    ("Program yazma", "Yüklenme, dinlenme ve ilerleme planı."),
                }),
            // --- Genel ---
            new("Etkili Çalışma Teknikleri", "Genel", "gizem.ucar" + Domain, 399m, 100,
                "Daha az sürede daha kalıcı öğrenmek için bilimsel çalışma yöntemleri. Aralıklı tekrar, kendini sınama, not alma teknikleri, zaman yönetimi ve sınav kaygısıyla başa çıkma. Her yaştan öğrenci ve kendini geliştirmek isteyen yetişkinler için.",
                new[] {
                    ("Öğrenme nasıl çalışır?", "Bellek, dikkat ve unutma eğrisi."),
                    ("Aralıklı tekrar ve kendini sınama", "Kalıcı öğrenme için kanıtlanmış yöntemler."),
                    ("Not alma ve zaman yönetimi", "Cornell yöntemi, Pomodoro ve haftalık plan."),
                    ("Sınav kaygısı", "Kaygıyı tanımak ve sınav gününe hazırlık."),
                }),
            new("Topluluk Önünde Konuşma", "Genel", "gizem.ucar" + Domain, 549m, 40,
                "Sunum yaparken heyecanı yönetmeyi, fikrini net bir yapıyla anlatmayı ve dinleyiciyi etkilemeyi öğrenin. Konuşma yapısı, ses ve beden dili, slayt tasarımı ve soru-cevap yönetimi; her derste kısa bir konuşma kaydı ve geri bildirim. Öğrenciler, akademisyenler ve iş hayatında sunum yapanlar için.",
                new[] {
                    ("Heyecanı tanımak", "Sahne kaygısının nedenleri ve nefes teknikleri."),
                    ("Konuşmanın yapısı", "Açılış, ana fikir, kanıt ve güçlü bir kapanış."),
                    ("Ses ve beden dili", "Tempo, vurgu, duruş ve göz teması."),
                    ("Sade slaytlar", "Bir slayt, bir fikir: görsel destek tasarlamak."),
                    ("Soru-cevap ve doğaçlama", "Beklenmedik sorulara sakin ve kısa yanıt vermek."),
                }),
            // --- Matematik (ek) ---
            new("Temel Matematik", "Matematik", "mehmet.ozturk" + Domain, 499m, 80,
                "Matematikte eksiği olan herkes için sıfırdan sağlam bir temel: doğal sayılar, kesirler, ondalık sayılar, oran-orantı, yüzdeler ve cebire ilk adım. Her konu günlük hayattan örneklerle başlar, kısa alıştırmalarla pekişir. Ortaokul öğrencileri, sınava yeniden hazırlananlar ve matematiğe yeniden başlamak isteyen yetişkinler için.",
                new[] {
                    ("Sayılar ve dört işlem", "Doğal ve tam sayılar, işlem önceliği ve zihinden işlem."),
                    ("Kesirler ve ondalık sayılar", "Genişletme, sadeleştirme ve kesirlerle işlemler."),
                    ("Oran, orantı ve yüzdeler", "Doğru-ters orantı, indirim ve faiz problemleri."),
                    ("Bölünebilme, EBOB ve EKOK", "Asal çarpanlar ve günlük hayat problemleri."),
                    ("Cebire giriş", "Değişken kavramı, ifadeler ve basit denklemler."),
                    ("Problem çözme stratejileri", "Tabloyla, şekille ve geriye doğru çalışarak çözmek."),
                }),
            new("Kalkülüs ve Analiz", "Matematik", "selim.karaca" + Domain, 1099m, 50,
                "Limit, türev ve integralin mantığını sezgiyle kurun, ardından teknikleri sistemli biçimde öğrenin. Değişim hızı, optimizasyon, alan ve hacim hesapları; diziler ve serilerle analize giriş. Üniversite birinci sınıf Calculus dersini alan mühendislik ve fen öğrencileri ile sınavda türev-integral konularını derinleştirmek isteyenler için.",
                new[] {
                    ("Fonksiyonlar ve limit", "Sezgisel limit, epsilon-delta tanımı ve süreklilik."),
                    ("Türev ve türev kuralları", "Değişim hızı, zincir kuralı ve kapalı türev."),
                    ("Türevin uygulamaları", "Ekstremum, optimizasyon ve grafik çizimi."),
                    ("Belirli ve belirsiz integral", "Riemann toplamları ve analizin temel teoremi."),
                    ("İntegral teknikleri", "Değişken değiştirme, kısmi integral ve basit kesirler."),
                    ("İntegralin uygulamaları", "Alan, dönel cisim hacmi ve yay uzunluğu."),
                    ("Diziler ve seriler", "Yakınsaklık testleri ve Taylor serileri."),
                }),
            new("Lineer Cebir", "Matematik", "selim.karaca" + Domain, 999m, 50,
                "Vektörler, matrisler ve doğrusal dönüşümlerle uzayı düşünmeyi öğrenin. Denklem sistemlerinden özdeğerlere kadar her kavram geometrik bir resimle ve bilgisayar grafikleri, veri bilimi ve mühendislikten uygulamalarla anlatılır. Mühendislik, fizik ve veri bilimi öğrencileri için.",
                new[] {
                    ("Vektörler ve geometri", "Vektör işlemleri, iç çarpım ve izdüşüm."),
                    ("Doğrusal denklem sistemleri", "Gauss eliminasyonu ve basamak biçim."),
                    ("Matrisler ve determinant", "Matris çarpımı, ters matris ve determinantın anlamı."),
                    ("Vektör uzayları", "Alt uzay, taban, boyut ve rank."),
                    ("Doğrusal dönüşümler", "Döndürme, yansıma ve ölçekleme matrisleri."),
                    ("Özdeğerler ve özvektörler", "Köşegenleştirme ve uygulamaları."),
                    ("Uygulamalar", "En küçük kareler, PCA'ya giriş ve bilgisayar grafikleri."),
                }),
            new("Olasılık ve İstatistik", "Matematik", "nazli.ergin" + Domain, 949m, 60,
                "Belirsizliği ölçmeyi ve veriden güvenilir sonuç çıkarmayı öğrenin. Sayma, olasılık kuralları, rastgele değişkenler ve dağılımlardan güven aralığı ve hipotez testlerine uzanan bir yol; her konu gerçek bir veri seti ve basit bir simülasyonla desteklenir. Üniversite öğrencileri ve veri bilimine hazırlananlar için.",
                new[] {
                    ("Betimsel istatistik", "Ortalama, medyan, varyans ve grafiklerle veri özeti."),
                    ("Olasılığın temelleri", "Örnek uzay, koşullu olasılık ve Bayes teoremi."),
                    ("Rastgele değişkenler", "Beklenen değer, varyans ve kesikli dağılımlar."),
                    ("Sürekli dağılımlar", "Normal dağılım ve merkezi limit teoremi."),
                    ("Tahmin ve güven aralıkları", "Örneklem dağılımı ve aralık tahmini."),
                    ("Hipotez testleri", "p-değeri, t-testi ve sık yapılan yorum hataları."),
                    ("Korelasyon ve regresyon", "İki değişken arasındaki ilişkiyi modellemek."),
                }),
            // --- Yazılım (ek) ---
            new("Python", "Yazılım", "emre.aydin" + Domain, 799m, 60,
                "Programlamaya Python ile başlayın. Değişkenler, koşullar, döngüler, fonksiyonlar, veri yapıları, dosya işlemleri ve modüller; her bölüm küçük bir otomasyon projesiyle biter. Hiç kod yazmamış olanlar, veri bilimine veya backend geliştirmeye hazırlananlar için.",
                new[] {
                    ("Kurulum ve ilk program", "Python, sanal ortamlar ve editör kurulumu."),
                    ("Değişkenler, koşullar ve döngüler", "Temel veri tipleri ve akış kontrolü."),
                    ("Fonksiyonlar", "Parametreler, dönüş değerleri ve kapsam."),
                    ("Listeler, sözlükler ve kümeler", "Veri yapılarını seçmek ve dönüştürmek."),
                    ("Dosyalar ve modüller", "CSV/JSON okuma-yazma ve paket kullanımı."),
                    ("Mini proje: otomasyon", "Bir klasördeki dosyaları düzenleyen betik yazmak."),
                }),
            new("SQL ve Veritabanı Tasarımı", "Yazılım", "emre.aydin" + Domain, 899m, 50,
                "İlişkisel veritabanlarını tasarlamayı ve SQL ile veriyi sorgulamayı öğrenin. Tablolar, anahtarlar, normalizasyon, JOIN'ler, gruplama, alt sorgular, indeksler ve işlemler; örnek bir e-ticaret veritabanı üzerinden. Backend geliştiriciler ve veri analistleri için.",
                new[] {
                    ("İlişkisel model", "Tablo, satır, birincil ve yabancı anahtar."),
                    ("Temel sorgular", "SELECT, WHERE, ORDER BY ve sayfalama."),
                    ("JOIN ve gruplama", "İç ve dış birleştirmeler, GROUP BY ve HAVING."),
                    ("Alt sorgular ve pencere fonksiyonları", "Sıralama, kümülatif toplam ve CTE."),
                    ("Normalizasyon", "Veri tekrarını önleyen şema tasarımı."),
                    ("İndeksler ve işlemler", "Sorgu performansı, transaction ve kilitlenme."),
                }),
            // --- Veri Bilimi & Yapay Zeka ---
            new("Python ile Veri Analizi", "Veri Bilimi & Yapay Zeka", "irem.yalcin" + Domain, 1199m, 50,
                "Ham veriyi temizleyip anlamlı bir hikâyeye dönüştürün. NumPy ve pandas ile veri işleme, eksik ve hatalı veriyle başa çıkma, gruplama ve birleştirme; Matplotlib ve seaborn ile görselleştirme. Temel Python bilen ve veriyle karar vermek isteyen herkes için; kurs bir analiz raporuyla biter.",
                new[] {
                    ("Veri bilimi süreci", "Soru sormak, veri toplamak ve Jupyter ile çalışmak."),
                    ("NumPy temelleri", "Diziler, vektörel işlemler ve yayınlama."),
                    ("pandas ile veri işleme", "DataFrame, filtreleme, gruplama ve birleştirme."),
                    ("Veri temizleme", "Eksik değerler, aykırı gözlemler ve tip dönüşümleri."),
                    ("Görselleştirme", "Doğru grafiği seçmek ve okunur grafik tasarlamak."),
                    ("Analiz projesi", "Gerçek bir veri setinden rapor hazırlamak."),
                }),
            new("Makine Öğrenmesine Giriş", "Veri Bilimi & Yapay Zeka", "baris.ozkan" + Domain, 1499m, 40,
                "Bir modelin veriden nasıl öğrendiğini matematiği ve kodu ile birlikte anlayın. Regresyon, sınıflandırma, karar ağaçları, kümeleme, model değerlendirme ve aşırı öğrenme; scikit-learn ile uçtan uca projeler. Python ve temel istatistik bilen, yapay zekâ alanına adım atmak isteyenler için.",
                new[] {
                    ("Makine öğrenmesi nedir?", "Denetimli ve denetimsiz öğrenme, veri ayırma."),
                    ("Doğrusal ve lojistik regresyon", "Kayıp fonksiyonu ve gradyan inişi."),
                    ("Karar ağaçları ve topluluk yöntemleri", "Random forest ve gradient boosting."),
                    ("Model değerlendirme", "Çapraz doğrulama, kesinlik, duyarlılık ve ROC."),
                    ("Kümeleme ve boyut indirgeme", "k-means ve PCA."),
                    ("Uçtan uca proje", "Özellik mühendisliği, model seçimi ve raporlama."),
                }),
            new("Derin Öğrenme ve Sinir Ağları", "Veri Bilimi & Yapay Zeka", "baris.ozkan" + Domain, 1699m, 35,
                "Yapay sinir ağlarını sıfırdan kurarak derin öğrenmenin nasıl çalıştığını görün. Geri yayılım, evrişimli ağlar, dil modelleri ve dikkat mekanizması; PyTorch ile görüntü sınıflandırma ve metin projeleri. Makine öğrenmesi temellerini bilen ve lineer cebire aşina olan öğrenciler için.",
                new[] {
                    ("Yapay nöron ve çok katmanlı ağ", "Aktivasyon fonksiyonları ve ileri besleme."),
                    ("Geri yayılım", "Türev zinciri ve optimizasyon algoritmaları."),
                    ("PyTorch ile eğitim döngüsü", "Tensörler, veri yükleyiciler ve düzenlileştirme."),
                    ("Evrişimli sinir ağları", "Görüntü sınıflandırma ve transfer öğrenme."),
                    ("Dil modelleri ve dikkat", "Kelime gömmeleri ve Transformer mimarisi."),
                    ("Sorumlu yapay zekâ", "Önyargı, açıklanabilirlik ve değerlendirme."),
                }),
            new("Veri Görselleştirme ve Hikâye Anlatımı", "Veri Bilimi & Yapay Zeka", "irem.yalcin" + Domain, 899m, 45,
                "Sayıları ikna edici ve dürüst bir anlatıya dönüştürün. Algı ilkeleri, grafik türleri, renk ve tipografi seçimi, pano tasarımı ve sunum; kötü grafikleri düzelterek öğrenme. Analistler, araştırmacılar ve rapor hazırlayan herkes için.",
                new[] {
                    ("Görsel algı", "Göz neyi önce görür: konum, uzunluk, renk."),
                    ("Doğru grafiği seçmek", "Karşılaştırma, dağılım, ilişki ve zaman serisi."),
                    ("Renk ve vurgu", "Erişilebilir paletler ve dikkat yönetimi."),
                    ("Pano tasarımı", "Gösterge seçimi ve düzen."),
                    ("Veriyle hikâye anlatmak", "Bağlam, çatışma ve sonuç."),
                }),
            // --- Ekonomi & Finans ---
            new("Mikroekonomiye Giriş", "Ekonomi & Finans", "tolga.sezer" + Domain, 749m, 60,
                "Fiyatlar nasıl oluşur, firmalar nasıl karar verir, piyasalar ne zaman başarısız olur? Arz-talep, esneklik, tüketici ve üretici teorisi, piyasa yapıları ve dışsallıkları güncel haberlerden örneklerle inceleyin. İktisat ve işletme öğrencileri ile ekonomiyi anlamak isteyen herkes için.",
                new[] {
                    ("Kıtlık ve seçim", "Fırsat maliyeti ve üretim olanakları eğrisi."),
                    ("Arz, talep ve denge", "Piyasa dengesi ve fiyat kontrolleri."),
                    ("Esneklik", "Fiyat değişimlerine tüketicinin tepkisi."),
                    ("Tüketici ve üretici kararları", "Fayda, maliyet ve kâr maksimizasyonu."),
                    ("Piyasa yapıları", "Tam rekabet, tekel ve oligopol."),
                    ("Piyasa başarısızlıkları", "Dışsallıklar, kamu malları ve devlet müdahalesi."),
                }),
            new("Makroekonomi ve Para Politikası", "Ekonomi & Finans", "tolga.sezer" + Domain, 849m, 60,
                "Enflasyon, faiz, büyüme ve döviz kuru arasındaki ilişkileri kavrayın. Milli gelir hesapları, merkez bankacılığı, maliye politikası ve dış ticaret; Türkiye ve dünya ekonomisinden güncel verilerle. Ekonomi haberlerini bilinçli okumak isteyenler için.",
                new[] {
                    ("Milli gelir ve büyüme", "GSYH nasıl ölçülür, neyi göstermez?"),
                    ("Enflasyon", "Nedenleri, ölçümü ve maliyetleri."),
                    ("Para ve merkez bankası", "Para arzı, politika faizi ve aktarım mekanizması."),
                    ("Maliye politikası", "Kamu harcamaları, vergiler ve bütçe açığı."),
                    ("Döviz kuru ve dış ticaret", "Cari denge ve kur rejimleri."),
                }),
            new("Kişisel Finans ve Yatırım", "Ekonomi & Finans", "ceren.aktas" + Domain, 699m, 80,
                "Bütçe yapmaktan birikim ve yatırım kararlarına kadar paranızı bilinçli yönetin. Gelir-gider takibi, acil durum fonu, kredi ve borç yönetimi, faiz ve enflasyon, mevduat, fon, hisse ve tahvilin mantığı ile risk-getiri dengesi. Yatırım tavsiyesi değil, kendi kararınızı verebilmeniz için finansal okuryazarlık.",
                new[] {
                    ("Bütçe ve nakit akışı", "Gelir-gider takibi ve harcama alışkanlıkları."),
                    ("Borç ve kredi", "Kredi kartı, faiz hesabı ve borç kapatma stratejileri."),
                    ("Faiz, enflasyon ve reel getiri", "Bileşik faiz ve paranın zaman değeri."),
                    ("Yatırım araçları", "Mevduat, fon, hisse senedi ve tahvil."),
                    ("Risk ve çeşitlendirme", "Risk profili ve portföy dağılımı."),
                    ("Uzun vadeli plan", "Emeklilik birikimi ve hedef bazlı tasarruf."),
                }),
            new("Muhasebenin Temelleri", "Ekonomi & Finans", "ceren.aktas" + Domain, 799m, 50,
                "İşletmenin dilini öğrenin: çift taraflı kayıt, hesap planı, yevmiye ve büyük defter, bilanço ve gelir tablosu. Küçük bir işletmenin bir yıllık kayıtlarını baştan sona tutarak finansal tabloları okumayı ve yorumlamayı öğrenirsiniz. İşletme öğrencileri ve girişimciler için.",
                new[] {
                    ("Muhasebenin temel kavramları", "Varlık, kaynak ve temel muhasebe denklemi."),
                    ("Çift taraflı kayıt", "Borç-alacak mantığı ve hesap planı."),
                    ("Yevmiye ve büyük defter", "Günlük işlemleri kaydetmek."),
                    ("Gelir tablosu", "Satışlar, giderler ve dönem kârı."),
                    ("Bilanço", "Finansal durumu okumak."),
                    ("Oran analizi", "Likidite, kârlılık ve borçluluk oranları."),
                }),
            // --- Edebiyat & Felsefe ---
            new("Türk Edebiyatına Giriş", "Edebiyat & Felsefe", "orhan.yesil" + Domain, 649m, 60,
                "Divan şiirinden Tanzimat'a, Millî Edebiyat'tan Cumhuriyet dönemi roman ve şiirine Türk edebiyatının ana dönemlerini temsilci metinlerle okuyun. Her derste bir metin yüksek sesle okunur, dönemi ve biçimiyle birlikte çözümlenir. Lise öğrencileri ve edebiyatı yeniden keşfetmek isteyen okurlar için.",
                new[] {
                    ("Edebiyat ve metin çözümleme", "Tür, biçim, tema ve anlatıcı."),
                    ("Divan ve Halk edebiyatı", "Gazel, koşma ve iki geleneğin dünyası."),
                    ("Tanzimat ve Servet-i Fünun", "Batılılaşma ve yeni türlerin doğuşu."),
                    ("Millî Edebiyat", "Dilde sadeleşme ve hikâyecilik."),
                    ("Cumhuriyet dönemi şiiri", "Garip'ten İkinci Yeni'ye."),
                    ("Cumhuriyet dönemi romanı", "Toplumcu gerçekçilikten modernizme."),
                }),
            new("Felsefeye Giriş", "Edebiyat & Felsefe", "ece.bulut" + Domain, 599m, 70,
                "Bilgi nedir, doğru eylem hangisidir, zihin nasıl çalışır? Felsefenin büyük sorularını Platon'dan Descartes'a, Kant'tan çağdaş düşünürlere kısa metin okumalarıyla tartışın. Argüman kurmayı ve değerlendirmeyi öğreten, ön bilgi gerektirmeyen bir giriş.",
                new[] {
                    ("Felsefe nedir?", "Soru sormak ve argüman kurmak."),
                    ("Bilgi felsefesi", "Şüphecilik, akılcılık ve deneycilik."),
                    ("Varlık ve zihin", "Zihin-beden problemi ve özgür irade."),
                    ("Ahlak felsefesi", "Erdem, ödev ve sonuççu etik."),
                    ("Siyaset felsefesi", "Adalet, özgürlük ve toplum sözleşmesi."),
                    ("Sanat ve güzellik", "Estetik yargı ve sanatın anlamı."),
                }),
            new("Mantık ve Eleştirel Düşünme", "Edebiyat & Felsefe", "ece.bulut" + Domain, 549m, 70,
                "Sağlam bir argümanı zayıf olandan ayırmayı öğrenin. Önerme mantığı, tümdengelim ve tümevarım, yaygın safsatalar, bilişsel yanlılıklar ve haber-kaynak değerlendirme; gündelik tartışmalardan örneklerle. Her yaştan öğrenci ve daha net düşünmek isteyen herkes için.",
                new[] {
                    ("Argümanın yapısı", "Öncül, sonuç ve geçerlilik."),
                    ("Önerme mantığı", "Bağlaçlar, doğruluk tabloları ve çıkarım kuralları."),
                    ("Tümevarım ve olasılıklı akıl yürütme", "Genelleme ve nedensellik."),
                    ("Safsatalar", "Adam karalama, korkuluk ve yanlış ikilem."),
                    ("Bilişsel yanlılıklar", "Doğrulama yanlılığı ve çapalama."),
                    ("Kaynak değerlendirme", "Haberi, veriyi ve iddiayı sınamak."),
                }),
            // --- Fotoğrafçılık & Sinema ---
            new("Dijital Fotoğrafçılığın Temelleri", "Fotoğrafçılık & Sinema", "cem.oral" + Domain, 899m, 30,
                "Otomatik moddan çıkın ve fotoğrafı bilerek çekin. Pozlama üçgeni, odak ve alan derinliği, ışık, kompozisyon ve renk; Lightroom ile temel düzenleme. Her derste bir çekim ödevi ve geri bildirim. Fotoğraf makinesi veya iyi bir telefonu olan yeni başlayanlar için.",
                new[] {
                    ("Makineyi tanımak", "Sensör, objektif ve çekim modları."),
                    ("Pozlama üçgeni", "Diyafram, enstantane ve ISO dengesi."),
                    ("Odak ve alan derinliği", "Keskinlik ve arka plan bulanıklığı."),
                    ("Işığı okumak", "Doğal ışık, saatler ve yön."),
                    ("Kompozisyon", "Üçler kuralı, çizgiler ve çerçeveleme."),
                    ("Düzenleme ve seçki", "Lightroom ile renk, ton ve portfolyo seçimi."),
                }),
            new("Sinema Dili ve Film Analizi", "Fotoğrafçılık & Sinema", "asli.tuna" + Domain, 749m, 60,
                "Bir filmi izlemekten okumaya geçin. Çerçeve, kamera hareketi, ışık, kurgu, ses ve anlatı yapısını klasik ve çağdaş filmlerden sahneler üzerinden çözümleyin. Sinemaseverler ve sinema-televizyon öğrencileri için.",
                new[] {
                    ("Sinemanın dili", "Plan, çekim ölçekleri ve kamera açıları."),
                    ("Mizansen", "Işık, dekor, kostüm ve oyunculuk."),
                    ("Kamera hareketi", "Pan, kaydırma ve uzun plan."),
                    ("Kurgu", "Süreklilik kurgusu ve montaj kuramları."),
                    ("Ses ve müzik", "Diegetik ses ve atmosfer."),
                    ("Film analizi yazmak", "Bir sahneyi baştan sona çözümlemek."),
                }),
            new("Kısa Film Yapımı", "Fotoğrafçılık & Sinema", "asli.tuna" + Domain, 1199m, 20,
                "Fikirden festivale bir kısa filmi baştan sona üretin. Senaryo, çekim planı, oyuncu yönetimi, telefonla ya da makineyle çekim, ses kaydı, kurgu ve renk düzenleme. Kurs sonunda 3-5 dakikalık kendi kısa filminiz hazır olur.",
                new[] {
                    ("Fikir ve senaryo", "Kısa film yapısı ve senaryo formatı."),
                    ("Ön hazırlık", "Çekim listesi, storyboard ve mekân seçimi."),
                    ("Çekim", "Kadraj, ışık ve oyuncu yönetimi."),
                    ("Ses kaydı", "Mikrofon seçimi ve ortam sesi."),
                    ("Kurgu", "Ritim, geçişler ve anlatı."),
                    ("Renk ve gösterim", "Renk düzenleme ve festival başvurusu."),
                }),
            // --- Diğer kategoriler (ek) ---
            new("Sosyolojiye Giriş", "Sosyal Bilimler", "onur.balci" + Domain, 599m, 60,
                "Toplumu bir arada tutan ve değiştiren güçleri inceleyin: kültür, aile, eğitim, kentleşme, göç ve eşitsizlik. Klasik kuramcılardan güncel araştırmalara, gündelik hayattan örneklerle sosyolojik bakış açısı kazanın. Lise ve üniversite öğrencileri için.",
                new[] {
                    ("Sosyolojik bakış", "Bireysel sorundan toplumsal yapıya."),
                    ("Kültür ve toplumsallaşma", "Değerler, normlar ve kimlik."),
                    ("Toplumsal tabakalaşma", "Sınıf, statü ve eşitsizlik."),
                    ("Kent ve göç", "Kentleşme ve göçün toplumsal etkileri."),
                    ("Araştırma yöntemleri", "Anket, görüşme ve gözlem."),
                }),
            new("İspanyolca A1", "Yabancı Dil", "sena.yurt" + Domain, 799m, 25,
                "İspanyolcaya iletişim odaklı bir başlangıç. Telaffuz, temel dilbilgisi ve günlük konuşma kalıplarıyla kendinizi tanıtır, ihtiyaçlarınızı anlatır, kısa diyaloglar kurarsınız. DELE A1 sınavına hazırlık için de uygundur.",
                new[] {
                    ("Alfabe ve telaffuz", "Sesler, vurgu ve selamlaşma."),
                    ("Ser ve estar", "Kimlik, durum ve yer bildirmek."),
                    ("Düzenli fiiller", "Şimdiki zaman çekimi ve günlük rutin."),
                    ("Sayılar, saat ve tarih", "Randevu almak ve plan yapmak."),
                    ("Gündelik konuşmalar", "Kafede, markette ve yolda."),
                }),
            new("Müzik Teorisi ve Kulak Eğitimi", "Müzik", "ozan.gunes" + Domain, 699m, 40,
                "Müziği okumayı, duymayı ve anlamayı öğrenin. Nota, ritim, aralıklar, gamlar, akorlar ve armoninin temelleri; her derste kulak eğitimi ve solfej alıştırmaları. Enstrüman çalan veya çalmak isteyen herkes için.",
                new[] {
                    ("Nota ve ritim", "Porte, anahtarlar ve ölçü."),
                    ("Aralıklar", "Aralıkları tanımak ve duymak."),
                    ("Gamlar ve tonalite", "Majör, minör ve donanımlar."),
                    ("Akorlar", "Üç ve dört sesli akorlar."),
                    ("Armoniye giriş", "Kadanslar ve akor dizileri."),
                    ("Kulak eğitimi", "Dikte, solfej ve melodi tanıma."),
                }),
            new("Suluboya Atölyesi", "Sanat", "leyla.erdem" + Domain, 749m, 20,
                "Suyun ve rengin akışını kontrol etmeyi öğrenin. Malzeme seçimi, ıslak üzerine ıslak ve kuru fırça teknikleri, renk karışımları, ışık ve boşluk kullanımı; manzara, natürmort ve botanik çalışmalar. Çizim deneyimi olan veya olmayan herkes için.",
                new[] {
                    ("Malzemeyi tanımak", "Kâğıt, fırça ve pigment seçimi."),
                    ("Temel teknikler", "Düz, geçişli ve ıslak üzerine ıslak boyama."),
                    ("Renk karışımları", "Sınırlı paletle uyumlu renkler."),
                    ("Işık ve beyaz alan", "Kâğıdın beyazını korumak."),
                    ("Manzara ve botanik çalışmalar", "Katman katman resim kurmak."),
                }),
            new("Yoga ve Mobilite", "Spor", "kerem.tan" + Domain, 499m, 40,
                "Esnekliği, eklem hareket açıklığını ve nefes farkındalığını geliştirin. Masa başında geçen günlerin etkisini azaltan, her seviyeye uygun yoga akışları ve mobilite rutinleri; evde ekipmansız uygulanabilir.",
                new[] {
                    ("Nefes ve duruş", "Diyafram nefesi ve nötr omurga."),
                    ("Kalça ve bel mobilitesi", "Oturmanın etkilerini dengelemek."),
                    ("Omuz ve göğüs açıklığı", "Masa başı duruşuna karşı rutinler."),
                    ("Denge ve güç akışları", "Ayakta duruşlar ve geçişler."),
                    ("Kişisel rutin", "Haftalık mobilite programı kurmak."),
                }),
            // --- Türk Dili ve Edebiyatı ---
            new("TYT-AYT Türkçe Paragraf ve Anlam Bilgisi", "Türk Dili ve Edebiyatı", "hatice.sonmez" + Domain, 749m, 80,
                "YKS adayları için hazırlanan bu orta ve ileri düzey kursta öğrenciler paragraf sorularını süre baskısı altında doğru ve hızlı çözme becerisi kazanır. Ana düşünce, yardımcı düşünceler, anlatım teknikleri ve paragrafta yapı çözümlemeleri derinlemesine ele alınır. Sınavda zaman yönetimini sağlamak ve çeldirici seçenekleri hızla elemek isteyen lise son sınıf öğrencileri ile mezun adaylar hedeflenmektedir.",
                new[] {
                    ("Paragrafta ana düşünce ve konu tespiti", "Metnin ana fikrini ilk okumada saptama ve anahtar kelimeleri doğru belirleme yöntemleri."),
                    ("Yardımcı düşünceler ve olumsuz köklü sorular", "Soru kökündeki ayrıntıları yakalama ve şıkları metinle eşleştirerek eleme adımları."),
                    ("Paragrafın yapısı ve akışı bozan cümleler", "Düşüncenin akışını bozan ifadeleri bulma, iki paragrafa bölme ve yer değiştirme teknikleri."),
                    ("Süre yönetimi ve deneme stratejileri", "YKS Türkçe testinde 40 soruyu kırk beş dakikada tamamlamaya yönelik süre ve odaklanma pratikleri."),
                }),
            new("Türkçe Dil Bilgisi ve Yazım Kuralları", "Türk Dili ve Edebiyatı", "hatice.sonmez" + Domain, 599m, 80,
                "LGS ve TYT sınavlarına hazırlanan öğrenciler için tasarlanan bu başlangıç ve orta düzey eğitimde sözcük türleri, ekler, cümle ögeleri ve güncel TDK yazım kuralları sistematik olarak işlenir. Katılımcılar dil bilgisi sorularında kalıplaşmış hatalardan kurtulur ve kuralları metin üzerinde uygulayabilir. Sınavlarda tam net hedefleyen ve temel Türkçe bilgisini eksiksiz oturtmak isteyen tüm öğrenciler içindir.",
                new[] {
                    ("Sözcükte yapı ve ek kök analizi", "Yapım ve çekim eklerinin işlevleri ile sözcüğün yapısını doğru ayrıştırma yolları."),
                    ("Sözcük türleri ve eylemsiler", "İsim, sıfat, zamir ve zarf ayrımları ile fiilimsilerin cümledeki görevlerini tanıma."),
                    ("Cümlenin ögeleri ve vurgu", "Yüklem merkezli öge bulma sırası ve ara sözlerin öge tahlilindeki yerini kavrama."),
                    ("Yazım kuralları ve noktalama işaretleri", "Büyük harflerin kullanımı, birleşik sözcükler ve sık karıştırılan noktalama kuralları."),
                }),
            new("Akademik Türkçe ve Kompozisyon", "Türk Dili ve Edebiyatı", "hatice.sonmez" + Domain, 799m, 40,
                "Üniversite öğrencileri ve tez yazım sürecindeki araştırmacılar için hazırlanan bu orta düzey kursta akademik dilin kuralları, metin yapısı ve kompozisyon geliştirme incelenir. Katılımcılar akademik bir makalenin veya denemenin argümantasyon yapısını kurabilir, intihalden kaçınarak kaynak gösterebilir ve akıcı metinler üretebilir. Bilimsel yazı dilini yetkinleştirmek isteyen tüm lisans ve lisansüstü öğrencilerine yöneliktir.",
                new[] {
                    ("Akademik yazımın temel ilkeleri", "Nesnel üslup, terim kullanımı ve akademik metin türlerinin yapısal özellikleri."),
                    ("Paragraf kurgusu ve argüman geliştirme", "Giriş, gelişme ve sonuç paragraflarında tez cümlesini destekleyen kanıtları sıralama."),
                    ("Alıntılama ve kaynakça yönetimi", "Doğrudan ve dolaylı aktarım kuralları ile akademik dürüstlük ilkelerini benimseme."),
                    ("Metin düzenleme ve son okuma", "Yazılan metni anlatım bozuklukları, akıcılık ve biçimsel tutarlılık açısından gözden geçirme."),
                }),
            new("Cumhuriyet Dönemi Türk Edebiyatı", "Türk Dili ve Edebiyatı", "kemal.erol" + Domain, 899m, 50,
                "Edebiyat fakültesi öğrencileri ve edebiyat meraklıları için tasarlanan bu ileri düzey kursta 1923 sonrasından günümüze Türk edebiyatının dönüşümü çözümlenir. Katılımcılar Garip, İkinci Yeni, Toplumcu Gerçekçilik gibi akımların kuramsal zeminini kavrar ve dönemin başat roman ile şiirlerini edebi kuramlar ışığında tahlil edebilir. Türk edebiyatının modernleşme sürecini derinlemesine incelemek isteyen araştırmacılara hitap eder.",
                new[] {
                    ("Milli Edebiyat zevkini sürdüren şiir ve nesir", "Cumhuriyetin ilk yıllarında Anadolu teması ve memleket edebiyatı anlayışının analizi."),
                    ("Toplumcu gerçekçi roman ve öykü", "Köy ve kasaba gerçekliğini işleyen yazarların tematik ve biçimsel yaklaşımları."),
                    ("Garip hareketi ve İkinci Yeni şiiri", "Şiirde biçimsel devrimler, imge dünyası ve modern Türk şiirinin dönüşüm durakları."),
                    ("1980 sonrası Türk romanında postmodernizm", "Üstkurmaca, metinlerarasılık ve çoğulcu anlatım tekniklerinin eserler üzerinden incelenmesi."),
                }),
            new("Osmanlı Türkçesi ve Metin Okumaları", "Türk Dili ve Edebiyatı", "kemal.erol" + Domain, 1099m, 30,
                "Tarih ve edebiyat araştırmacıları için hazırlanan bu ileri düzey eğitimde Osmanlı Türkçesiyle kaleme alınmış matbu ve el yazması metinlerin okunması öğretilir. Katılımcılar Arapça ve Farsça kökenli dil kurallarını öğrenir, rîka ve nesih hat türlerini ayırt edebilir ve arşiv belgelerini bağımsız olarak çözümleyebilir. Tarihsel kaynakları doğrudan orijinal metinlerinden okumayı amaçlayan araştırmacılar içindir.",
                new[] {
                    ("Arapça ve Farsça unsurların gramer yapısı", "Bablara göre kelime türetme, terkipler ve Osmanlı Türkçesinde sıkça geçen kalıplar."),
                    ("Matbu metin okumaları ve gazete çevirileri", "Geç dönem Osmanlı basını ve edebi mecmualarından seçilmiş matbu metinlerin çözümlenmesi."),
                    ("Rîka hattına giriş ve harf bağlantıları", "El yazısı belgelerin paleografik özellikleri, harf birleşimleri ve kısaltma işaretleri."),
                    ("Arşiv vesikaları ve ferman okuma pratiği", "Osmanlı arşivlerindeki resmi yazışmalar, beratlar ve şeriyye sicili kayıtlarının transkripsiyonu."),
                }),
            new("Diksiyon ve Etkili Hitabet", "Türk Dili ve Edebiyatı", "derya.oktem" + Domain, 849m, 25,
                "Topluluk önünde konuşan profesyoneller ve öğrenciler için tasarlanan bu orta düzey uygulamalı atölyede sesin doğru kullanımı ve hitabet sanatı işlenir. Katılımcılar doğru diyafram nefesi almayı, Türkçenin ses ve vurgu kurallarını uygulamayı, heyecanlarını yöneterek ikna edici sunumlar yapmayı öğrenir. İletişim becerilerini güçlendirmek ve sahnede güvenle var olmak isteyen herkese yöneliktir.",
                new[] {
                    ("Diyafram nefesi ve sesin anatomisi", "Doğru solunum tekniğiyle sesi yormadan gür ve net çıkarma çalışmaları."),
                    ("Fonetik kuralları ve doğru telaffuz", "Türkçede açık ve kapalı e sesleri, daralma ve harflerin boğumlanma noktaları."),
                    ("Cümle vurgusu ve tonlama dinamikleri", "Anlatıma duygu ve inandırıcılık katan tonlama iniş çıkışlarını metin üzerinde çalışma."),
                    ("Beden dili ve sahne heyecanını yönetme", "Topluluk önünde konuşurken postür, el jestleri ve sahne stresini dengeleme pratikleri."),
                }),

            // --- Psikoloji & Bilişsel Bilimler ---
            new("Psikolojiye Giriş", "Psikoloji & Bilişsel Bilimler", "aylin.kara" + Domain, 799m, 60,
                "Psikoloji bilimine ilgi duyanlar için hazırlanan bu başlangıç düzeyindeki kursta insan davranışı ve zihinsel süreçlerin temel kuramları incelenir. Katılımcılar biyolojik temellerden öğrenmeye, bellekten sosyal psikolojiye kadar ana psikoloji ekollerini kavrar ve insan davranışlarını bilimsel bir çerçevede değerlendirebilir. Zihnin işleyişini temel kavramlarla anlamak isteyen tüm meraklılara uygundur.",
                new[] {
                    ("Psikolojinin tarihi ve temel yaklaşımlar", "Yapısalcılıktan davranışçılığa ve bilişsel devrime uzanan kuramsal akımların özeti."),
                    ("Davranışın biyolojik temelleri ve algı", "Sinir sistemi, nörotransmitterler ve duyusal bilgilerin zihinde örgütlenme ilkeleri."),
                    ("Öğrenme kuramları ve bellek sistemleri", "Klasik ve edimsel koşullanma ile kısa ve uzun süreli bellek yapıları."),
                    ("Sosyal psikoloji ve grup dinamikleri", "Sosyal etki, uyma davranışı, tutumlar ve önyargıların oluşum mekanizmaları."),
                }),
            new("Gelişim Psikolojisi", "Psikoloji & Bilişsel Bilimler", "aylin.kara" + Domain, 899m, 50,
                "Eğitimciler ve psikoloji öğrencileri için geliştirilen bu orta düzey kursta doğumdan yetişkinliğe kadar bireyin zihinsel, duygusal ve sosyal gelişimi ele alınır. Katılımcılar Piaget, Vygotsky ve Erikson gibi öncü kuramcıların modellerini analiz edebilir ve gelişim evrelerindeki kilit dönüm noktalarını vaka örnekleri üzerinden yorumlayabilir. İnsan gelişiminin evrelerini derinlemesine öğrenmek isteyenlere yöneliktir.",
                new[] {
                    ("Bilişsel gelişim kuramları", "Piaget evreleri ve Vygotsky sosyokültürel yaklaşımının temel kavramları."),
                    ("Bağlanma kuramı ve duygusal gelişim", "Bowlby ve Ainsworth modelleri ışığında güvenli ve kaygılı bağlanma türleri."),
                    ("Psikososyal gelişim ve kimlik arayışı", "Erikson yaşam boyu gelişim evreleri ve ergenlikte kimlik kazanımı süreci."),
                    ("Ahlak gelişimi ve yetişkinlik evreleri", "Kohlberg ahlak kuramı ve yetişkinlikten yaşlılığa bilişsel ve sosyal değişimler."),
                }),
            new("Bilişsel Bilime Giriş", "Psikoloji & Bilişsel Bilimler", "volkan.sener" + Domain, 949m, 50,
                "Yapay zeka, bilişim ve psikoloji alanlarında çalışanlar için hazırlanan bu orta düzey kursta zihnin bilgi işleme süreçleri disiplinlerarası bir bakışla ele alınır. Katılımcılar sinirbilim, yapay zeka ve bilişsel psikolojinin kesişiminde zihinsel modeller kurabilir ve algı ile düşünme süreçlerini hesaplamalı yöntemlerle açıklayabilir. Zihnin çalışma mekanizmasını çok yönlü incelemek isteyenlere yöneliktir.",
                new[] {
                    ("Bilişsel bilimlerin disiplinlerarası temelleri", "Felsefe, yapay zeka, dilbilim ve sinirbilimin zihin araştırmalarındaki ortak paydası."),
                    ("Hesaplamalı zihin kuramı ve bilgi işleme", "Zihinsel temsiller, sembolik sistemler ve bağlantıcı yapay sinir ağı yaklaşımları."),
                    ("Dikkat ve görsel algının bilişsel modelleri", "Seçici dikkat filtreleri, nesne tanıma kuramları ve görme sisteminin hesaplamalı yapısı."),
                    ("Karar verme ve uslamlama süreçleri", "Bilişsel yanılgılar, sezgisel yöntemler ve olasılıksal akıl yürütme mekanizmaları."),
                }),
            new("Araştırma Yöntemleri ve Deney Tasarımı", "Psikoloji & Bilişsel Bilimler", "volkan.sener" + Domain, 1099m, 30,
                "Davranış ve biliş bilimlerinde tez veya makale yazan araştırmacılar için hazırlanan bu ileri düzey kursta deneysel metodoloji ve veri analizi işlenir. Katılımcılar test edilebilir hipotezler kurgulayabilir, karıştırıcı değişkenleri kontrol eden laboratuvar deneyleri tasarlayabilir ve toplanan verileri doğru testlerle analiz edebilir. Bilimsel araştırmalarını bağımsız yürütmek isteyen lisansüstü öğrencilere hitap eder.",
                new[] {
                    ("Bilimsel araştırma sorusu ve hipotez kurma", "Bağımsız ve bağımlı değişkenleri tanımlama ve operasyonel hale getirme yolları."),
                    ("Deneysel desenler ve kontrol mekanizmaları", "Gruplararası ve grupiçi desenler ile iç ve dış geçerliliği koruma teknikleri."),
                    ("Bilgisayarlı deney tasarımı ve veri toplama", "Tepki süresi ve doğruluk ölçümlerini kaydeden deneysel yazılım protokolleri."),
                    ("Veri analizi ve araştırma raporu yazımı", "Parametrik testler, varyans analizi ve APA formatında bilimsel raporlama kuralları."),
                }),

            // --- Sosyal Bilimler ---
            new("YKS Tarih Soru Kampı", "Sosyal Bilimler", "selin.koc" + Domain, 699m, 80,
                "YKS adayları için hazırlanan bu orta düzey soru çözüm kampında TYT ve AYT Tarih konuları kronolojik testler ve kavram haritalarıyla taranır. Katılımcılar öncüllü ve haritalı tarih sorularını hızla analiz etme, tarihsel neden-sonuç bağlarını kurma ve çeldiricileri eleme becerisi edinir. Sınav öncesinde eksiklerini kapatmak ve soru çözüm pratiğini artırmak isteyen lise son sınıf öğrencileri içindir.",
                new[] {
                    ("İlk Türk devletleri ve İslam tarihi soru analizi", "Kültür ve medeniyet kavramları ile sık karşılaşılan öncüllü soru çözümleri."),
                    ("Osmanlı Devleti siyasi ve askeri gelişmeler", "Kuruluştan dağılmaya kadar antlaşmalar, ıslahatlar ve savaşların soru tahlilleri."),
                    ("Kurtuluş Savaşı ve cepheler", "Kongreler süreci, muharebeler ve Mudanya ile Lozan antlaşmalarının odak noktaları."),
                    ("Atatürk ilkeleri ve inkılap tarihi pratikleri", "İnkılapların ilkelerle eşleştirilmesi ve sınav tipi karma deneme çözümleri."),
                }),
            new("Kent Sosyolojisi ve Saha Araştırması", "Sosyal Bilimler", "onur.balci" + Domain, 949m, 30,
                "Sosyoloji ve şehir bölge planlama öğrencileri için hazırlanan bu ileri düzey uygulamalı kursta kentsel dönüşüm, göç ve mekânsal ayrışma kuramları ele alınır. Katılımcılar kentsel mekânda nitel araştırma teknikleri uygulayabilir, derinlemesine mülakat ve katılımcı gözlem verilerini kuramsal olarak yorumlayabilir. Kentsel dinamikleri doğrudan sahada araştırmayı hedefleyen araştırmacılara yöneliktir.",
                new[] {
                    ("Kent kuramları ve mekânın üretimi", "Chicago ekolünden David Harvey ve Lefebvre kuramlarına kentsel mekân okumaları."),
                    ("Kentsel dönüşüm ve mutenalaştırma", "Soylulaştırma süreçleri, soylulaştırmanın toplumsal etkileri ve mekânsal ayrışma."),
                    ("Saha araştırması metodolojisi ve etik", "Kentte katılımcı gözlem yapma, yarı yapılandırılmış mülakat tasarımı ve saha etiği."),
                    ("Nitel verilerin kodlanması ve raporlama", "Saha notları ile ses kayıtlarının tematik analizi ve araştırma raporu haline getirilmesi."),
                }),

            // --- Tasarım ---
            new("Figma ile Prototipleme Atölyesi", "Tasarım", "deniz.aksoy" + Domain, 1199m, 25,
                "Dijital ürün tasarımcıları ve arayüz geliştiricileri için hazırlanan bu ileri düzey uygulamalı atölyede Figma üzerinde karmaşık etkileşimli prototipler üretilir. Katılımcılar değişkenler, akıllı animasyonlar ve bileşen setleri kullanarak gerçek uygulama deneyimi sunan prototipler inşa edebilir ve kullanıcı testlerine hazır hale getirebilir. Portfolyosuna güçlü projeler eklemek isteyen tasarımcılara yöneliktir.",
                new[] {
                    ("Gelişmiş bileşenler ve varyant mimarisi", "Bileşen özellikleri, yuvalama ve durum varyantlarıyla esnek arayüz elemanları kurma."),
                    ("Değişkenler ve koşullu mantık yapıları", "String, boolean ve sayı değişkenleriyle çalışan dinamik sepet ve form prototipleri."),
                    ("Akıllı animasyonlar ve mikromimikler", "Ekran geçişleri, sürükleme hareketleri ve mikro etkileşimlerin zamanlama ayarları."),
                    ("Kullanıcı testi hazırlığı ve paylaşım", "Prototipi paylaşıma açma, test senaryoları belirleme ve geri bildirim toplama süreçleri."),
                }),
            new("Marka Kimliği ve Logo Tasarımı", "Tasarım", "deniz.aksoy" + Domain, 1099m, 30,
                "Grafik tasarımcılar ve ajans çalışanları için kurgulanan bu orta düzey kursta bir markanın sıfırdan görsel kimliğinin tasarlanması adımları işlenir. Katılımcılar brief analizinden logo eskizine, renk paleti ve tipografi seçiminden marka rehberi hazırlamaya kadar tüm tasarım sürecini yürütebilir ve müşteriye sunabilir. Markalama alanında profesyonel standartlarda iş üretmek isteyen tasarımcılar içindir.",
                new[] {
                    ("Tasarım briefi ve pazar araştırması", "Müşteri beklentilerini anlama, rakip görsel analizi ve duygu panosu oluşturma."),
                    ("Logo eskizleri ve geometrik konstrüksiyon", "Fikir geliştirme, ızgara sistemi üzerinde sembol inşası ve tipografik uyum."),
                    ("Renk teorisi ve tipografi hiyerarşisi", "Kurumsal renk sistemleri, kontrast dengesi ve metin fontu eşleştirmeleri."),
                    ("Kurumsal kimlik kılavuzu hazırlama", "Logo kullanım sınırları, basılı ve dijital materyal şablonları ile rehber teslimi."),
                }),

            // --- Sanat ---
            new("Rönesans'tan Modernizme Sanat Tarihi", "Sanat", "leyla.erdem" + Domain, 899m, 50,
                "Sanat ve mimarlık öğrencileri ile kültür meraklıları için hazırlanan bu ileri düzey kursta Batı sanatının 14. yüzyıldan 20. yüzyıla kadar olan evrimi incelenir. Katılımcılar Rönesans, Barok, Romantizm ve Modernizm akımlarının felsefi arka planını kavrar, dönem eserlerini ikonografik ve biçimsel yöntemlerle çözümleyebilir. Görsel sanatların tarihsel gelişimini akademik derinlikle anlamak isteyenlere yöneliktir.",
                new[] {
                    ("İtalyan ve Kuzey Rönesansı", "Perspektifin keşfi, hümanizm etkisi ve Da Vinci, Michelangelo ile Dürer karşılaştırması."),
                    ("Barok sanat ve ışık gölge ustalığı", "Dramatik aydınlatma, hareket algısı ve Caravaggio ile Bernini eserlerinin analizi."),
                    ("Neoklasisizm ve Romantizm çatışması", "Akıl ile duygunun mücadelesi, Fransız Devrimi etkisi ve Goya ile Delacroix tahlilleri."),
                    ("Empresyonizmden Avangart akımlara geçiş", "Işığın anlık kaydı, Kübizm, Soyut dışavurumculuk ve modern sanatın temelleri."),
                }),

            // --- Müzik ---
            new("Armoni ve Beste Atölyesi", "Müzik", "ozan.gunes" + Domain, 999m, 20,
                "Müzisyenler ve prodüktörler için hazırlanan bu ileri düzey kursta tonal ve modal armoni kuralları uygulamalı olarak incelenir. Katılımcılar akor yürüyüşleri kurabilir, polifonik ses iletimi kurallarını uygulayabilir ve kendi melodilerini zengin armonik katmanlarla besteleyebilir. Temel müzik teorisine hâkim olup kendi özgün eserlerini profesyonel standartlarda düzenlemek isteyen müzisyenler içindir.",
                new[] {
                    ("Tonal armoni ve kadans yapıları", "Dört sesli armonide akor bağlantıları, anahtarlar ve açık ile kapalı pozisyonlar."),
                    ("Akor modülasyonları ve geçki teknikleri", "Yakın ve uzak tonlara geçiş yolları, ortak akorlar ve kromatizm kullanımı."),
                    ("Modal armoni ve modern tınılar", "Dorian, Mixolydian ve Lydian modlarında armonik yürüyüşler ve melodi ilişkisi."),
                    ("Beste kurgusu ve aranjman pratikleri", "Motif geliştirme, form yapısı oluşturma ve orkestrasyon taslakları hazırlama."),
                }),

            // --- Spor ---
            new("Sporcu Beslenmesi ve Performans", "Spor", "kerem.tan" + Domain, 649m, 60,
                "Aktif sporcular ve antrenörler için tasarlanan bu orta düzey kursta antrenman verimini ve toparlanmayı optimize eden beslenme stratejileri incelenir. Katılımcılar makro ve mikro besin ihtiyaçlarını branşlarına göre hesaplayabilir, yarışma öncesi ile sonrası beslenme protokolleri oluşturabilir ve ergojenik destekleri bilimsel temelde değerlendirebilir. Fiziksel performansını beslenmeyle artırmak isteyenlere yöneliktir.",
                new[] {
                    ("Enerji sistemleri ve makro besin dengesi", "Dayanıklılık ve kuvvet sporlarında karbonhidrat, protein ve yağ gereksinimleri."),
                    ("Sıvı dengesi ve elektrolit yönetimi", "Antrenman esnasında hidrasyon takibi, terleme testi ve toparlanma içecekleri."),
                    ("Antrenman ve müsabaka zamanlaması", "Müsabaka öncesi glikojen depolarını doldurma ve sonrası kas onarım öğünleri."),
                    ("Kanıta dayalı takviyeler ve ergojenik destekler", "Kreatin, kafein ve beta-alanin gibi desteklerin etki mekanizmaları ve güvenli kullanımı."),
                }),

            // --- Genel ---
            new("YKS ve LGS Sınav Stratejileri", "Genel", "gizem.ucar" + Domain, 499m, 100,
                "Merkezi sınavlara hazırlanan öğrenciler ve veliler için tasarlanan bu rehberlik odaklı başlangıç ve orta düzey kursta çalışma metodolojisi işlenir. Katılımcılar kişisel çalışma programı hazırlayabilir, deneme sınavı analizleriyle eksik noktalarını belirleyebilir ve sınav anı kaygısını yönetme tekniklerini uygulayabilir. YKS veya LGS maratonunu plansızlıktan kurtarıp verimli yürütmek isteyen tüm adaylara uygundur.",
                new[] {
                    ("Kişisel çalışma programı ve hedef belirleme", "Haftalık net takibi, konu tarama çizelgeleri ve gerçekçi çalışma hedefleri koyma."),
                    ("Deneme sınavı analizi ve eksik tamamlama", "Doğru ve yanlış soru tahliliyle eksik konuları nokta atışı tespit etme yolları."),
                    ("Sınav turu taktiği ve zaman planlaması", "Turlama tekniğiyle vakit kazandıran soru çözme disiplini ve odaklanma."),
                    ("Sınav kaygısı ve psikolojik dayanıklılık", "Sınav stresini kontrol altında tutma, nefes pratikleri ve motivasyon yönetimi."),
                }),
            new("Hızlı Okuma ve Not Alma Teknikleri", "Genel", "gizem.ucar" + Domain, 449m, 100,
                "Öğrenciler ve yoğun okuma yapan çalışanlar için tasarlanan bu başlangıç düzeyindeki eğitimde okuma hızını ve anlama oranını artıran teknikler işlenir. Katılımcılar göz kaslarını geliştirerek iç seslendirmeyi azaltabilir, Cornell gibi yapılandırılmış not alma sistemlerini uygulayabilir ve bilgiyi kalıcı biçimde özetleyebilir. Okuma verimini katlayıp zamandan tasarruf etmek isteyen herkese uygundur.",
                new[] {
                    ("Göz kası egzersizleri ve görme alanını genişletme", "Göz sıçramalarını hızlandıran blok okuma çalışmaları ve satır takibi yöntemleri."),
                    ("İç seslendirmeyi azaltma ve kavrama", "Metni zihinde kelime kelime tekrarlamadan kavramsal olarak anlama pratikleri."),
                    ("Cornell ve zihin haritası sistemleri", "Derslerde ve kitap okurken bilgiyi hiyerarşik biçimde yapılandırarak kaydetme."),
                    ("Aktif hatırlama ve aralıklı tekrar", "Notları periyodik gözden geçirme stratejileriyle uzun süreli hafızaya aktarma."),
                }),

            // --- Edebiyat & Felsefe ---
            new("Dünya Edebiyatından Klasikler", "Edebiyat & Felsefe", "orhan.yesil" + Domain, 799m, 50,
                "Edebiyatseverler ve üniversite öğrencileri için hazırlanan bu orta düzey kursta Doğu ve Batı klasiklerinin temel yapıtları felsefi ve edebi açıdan tahlil edilir. Katılımcılar Dostoyevski, Goethe ve Kafka gibi yazarların metinlerindeki ana izlekleri çözümler, insanlık durumunu yansıtan anlatı tekniklerini karşılaştırmalı olarak değerlendirebilir. Klasik metinlerin derin katmanlarını keşfetmek isteyen okurlara yöneliktir.",
                new[] {
                    ("Antik trajedi ve epik anlatı", "Homeros destanları ve Sofokles tragedyalarında ahlak, kader ve kahramanlık temaları."),
                    ("Rus edebiyatında varoluşsal sancılar", "Dostoyevski ve Tolstoy romanlarında vicdan, inanç ve toplumsal çatışmalar."),
                    ("Modernizmin habercisi Batı klasikleri", "Goethe ve Flaubert üzerinden bireyin toplumla uyumsuzluğu ve arzu arayışı."),
                    ("20. yüzyıl yabancılaşması ve Kafkaesk dünya", "Kafka ve Camus eserlerinde bürokrasi, saçma kavramı ve modern insan açmazı."),
                }),

            // --- Fotoğrafçılık & Sinema ---
            new("Mobil Fotoğrafçılık ve Video Kurgu", "Fotoğrafçılık & Sinema", "cem.oral" + Domain, 699m, 40,
                "Sosyal medya içerik üreticileri ve görsel sanatlara merak duyanlar için hazırlanan bu başlangıç düzeyindeki uygulamalı eğitimde akıllı telefonla çekim ve kurgu işlenir. Katılımcılar doğal ışığı kullanmayı, kompozisyon kurallarını uygulamayı ve mobil kurgu uygulamalarıyla profesyonel videolar kurgulamayı öğrenir. Akıllı telefonunu yaratıcı bir prodüksiyon aracına dönüştürmek isteyen herkes içindir.",
                new[] {
                    ("Mobil kamera ayarları ve temel ışık kullanımı", "Pozlama telafisi, odak kilidi, ızgara kullanımı ve pencere ışığından yararlanma."),
                    ("Fotoğrafta kompozisyon ve açı belirleme", "Üçler kuralı, simetri, derinlik oluşturma ve yönlendirici çizgileri çerçeveye yerleştirme."),
                    ("Mobil video çekim teknikleri ve ses kaydı", "Telefon hareketleri, sabit planlar, harici mikrofon ayarları ve rüzgar engelleme."),
                    ("CapCut ile mobil video kurgusu ve renk", "Klip kesme, tempo ayarı, geçişler, metin animasyonları ve renk düzenleme adımları."),
                }),

            // --- Fen Bilimleri ---
            new("Genetik ve Moleküler Biyoloji", "Fen Bilimleri", "elif.sahin" + Domain, 1099m, 40,
                "Biyoloji, tıp ve biyomühendislik öğrencileri için kurgulanan bu ileri düzey kursta hücrenin moleküler mekanizmaları ve genetik regülasyon ayrıntılı olarak ele alınır. Katılımcılar DNA replikasyonu, gen ifadesi, epigenetik modifikasyonlar ve CRISPR gibi modern gen düzenleme tekniklerini kuramsal ve deneysel yönleriyle tahlil edebilir. Moleküler yaşam bilimlerinde sağlam bir altyapı kazanmak isteyen araştırmacılara yöneliktir.",
                new[] {
                    ("Nükleik asit yapısı ve replikasyon mekanizması", "DNA polimerazlar, helikaz, okazyaki parçacıkları ve hata düzeltme süreçleri."),
                    ("Transkripsiyon ve gen ifadesinin regülasyonu", "RNA sentezi, promotor bölgeler, transkripsiyon faktörleri ve operon sistemleri."),
                    ("Translasyon ve protein katlanması", "Ribozom mekaniği, tRNA eşleşmesi, translasyon sonrası modifikasyonlar ve şaperonlar."),
                    ("Rekombinant DNA teknolojisi ve gen düzenleme", "Restriksiyon enzimleri, klonlama vektörleri, PCR analizi ve CRISPR-Cas9 prensipleri."),
                }),
            new("LGS Fen Bilimleri Kampı", "Fen Bilimleri", "can.yildiz" + Domain, 649m, 100,
                "LGS sınavına hazırlanan 8. sınıf öğrencileri için tasarlanan bu orta düzey soru kampında MEB müfredatındaki tüm fen üniteleri yeni nesil sorularla taranır. Katılımcılar grafik ve tablo yorumlama, deney düzenekli soruları çözme ve zamanı kontrollü kullanma becerisi edinir. Fen bilimleri netlerini yükseltmek ve sınavda tam puan hedefleyen ortaokul son sınıf öğrencilerine yöneliktir.",
                new[] {
                    ("Mevsimler ve iklim yeni nesil soru kalıpları", "Dünyanın dönme ekseni, gölge boyu değişimleri ve iklim ile hava olayları analizi."),
                    ("DNA ve genetik kod tahlilleri", "Nükleotid dizilimleri, mutasyon, modifikasyon, adaptasyon ve biyoteknoloji soruları."),
                    ("Basınç ünitesi ve deney düzenekleri", "Katı, sıvı ve gaz basıncında değişkenlerin grafiğe dökülmesi ve deney yorumlama."),
                    ("Madde ve endüstri ile basit makineler", "Periyodik tablo, fiziksel kimyasal değişimler ve makara kaldıraç kuvvet kazancı."),
                }),

            // --- Coğrafya ---
            new("Jeopolitik ve Beşeri Coğrafya", "Coğrafya", "burak.kaya" + Domain, 899m, 50,
                "Uluslararası ilişkiler, coğrafya ve kamu yönetimi öğrencileri için hazırlanan bu orta düzey kursta küresel güç dengeleri ile beşeri dinamiklerin etkileşimi incelenir. Katılımcılar nüfus hareketleri, enerji koridorları, sınır ihtilafları ve iklim göçlerini haritalar üzerinden mekânsal olarak analiz edebilir. Dünya siyasetini coğrafi gerçekler üzerinden okumak isteyen tüm araştırmacılara uygundur.",
                new[] {
                    ("Beşeri coğrafyanın temel ilkeleri ve nüfus", "Dünya nüfus dağılışı, demografik dönüşüm modeli ve kentsel göç hareketleri."),
                    ("Küresel enerji koridorları ve boğazlar", "Petrol ve doğal gaz boru hatları, Hürmüz ve Malakka gibi kritik deniz geçitleri."),
                    ("Sınırlar, jeopolitik teoriler ve çatışma bölgeleri", "Kara ve kenar kuşak teorileri ışığında bölgesel egemenlik ve sınır anlaşmazlıkları."),
                    ("İklim krizi, su güvenliği ve jeopolitik gelecek", "Kuraklık kaynaklı göç dalgaları, sınır aşan sular ve geleceğin jeopolitik riskleri."),
                }),
            new("Anayasa Hukukuna Giriş", "Hukuk & Kamu Yönetimi", "serkan.yavuz" + Domain, 699m, 60,
                "Devletin temel yapısını, temel hak ve özgürlükleri ve anayasal denetimi sıfırdan öğrenin. Anayasa kavramından yasama, yürütme ve yargı organlarına, Anayasa Mahkemesine bireysel başvurudan seçim sistemlerine kadar konuları güncel kararlarla işliyoruz. Hukuk fakültesine hazırlananlar, kamu personeli adayları ve vatandaşlık bilgisini derinleştirmek isteyen herkes için.",
                new[] {
                    ("Anayasa kavramı ve anayasacılık", "Anayasanın üstünlüğü, sert ve yumuşak anayasalar, Türk anayasa tarihinin kısa özeti."),
                    ("Temel hak ve özgürlükler", "Hakların sınıflandırılması, sınırlandırma ölçütleri ve ölçülülük ilkesi."),
                    ("Devletin organları", "Yasama, yürütme ve yargı; organlar arası ilişkiler ve hükümet sistemleri."),
                    ("Anayasa yargısı ve bireysel başvuru", "Norm denetimi, iptal davası, itiraz yolu ve bireysel başvurunun aşamaları."),
                }),
            new("İdare Hukuku ve Kamu Yönetimi", "Hukuk & Kamu Yönetimi", "serkan.yavuz" + Domain, 849m, 50,
                "İdarenin nasıl örgütlendiğini, işlemlerini hangi kurallara göre yaptığını ve bu işlemlere karşı hangi yollara başvurulabileceğini öğrenin. Merkezi ve yerinden yönetim, idari işlem ve sözleşmeler, kamu görevlileri ve idari yargı sistemi örnek kararlar üzerinden anlatılır. KPSS alan bilgisi ve kamu yönetimi sınavlarına hazırlananlar için uygundur.",
                new[] {
                    ("İdarenin örgütlenmesi", "Merkezi yönetim, taşra teşkilatı, mahalli idareler ve kamu tüzel kişileri."),
                    ("İdari işlem", "İdari işlemin unsurları, hukuka aykırılık halleri ve geri alma."),
                    ("Kamu görevlileri ve kamu hizmeti", "Memurların hak ve yükümlülükleri, kamu hizmetinin ilkeleri ve yürütülme usulleri."),
                    ("İdari yargı ve idarenin sorumluluğu", "İptal ve tam yargı davaları, dava açma süreleri, hizmet kusuru ve kusursuz sorumluluk."),
                }),
            new("Borçlar ve Ticaret Hukukunun Temelleri", "Hukuk & Kamu Yönetimi", "serkan.yavuz" + Domain, 899m, 50,
                "Sözleşme kurmaktan şirket yönetmeye kadar günlük ve ticari hayatın hukuki temelini öğrenin. Borç ilişkisinin kaynakları, sözleşmelerin kurulması ve ifası, haksız fiil sorumluluğu, tacir kavramı, şirket türleri ve kıymetli evrak somut vakalarla işlenir. Girişimciler, işletme ve iktisat öğrencileri ile hukuka yeni başlayanlar için.",
                new[] {
                    ("Borç ilişkisi ve sözleşmenin kuruluşu", "İcap ve kabul, şekil şartları, irade bozuklukları ve kesin hükümsüzlük."),
                    ("İfa, temerrüt ve sorumluluk", "Borcun ifası, borçlu temerrüdü, haksız fiil ve sebepsiz zenginleşme."),
                    ("Tacir ve ticari işletme", "Ticari işletme kavramı, ticaret sicili, ticaret unvanı ve haksız rekabet."),
                    ("Şirketler ve kıymetli evrak", "Anonim ve limited şirketin kuruluşu ve organları; çek, bono ve poliçe."),
                }),
            new("KVKK ve Bilişim Hukuku", "Hukuk & Kamu Yönetimi", "serkan.yavuz" + Domain, 949m, 40,
                "Dijital dünyada veriyi hukuka uygun işlemeyi öğrenin. 6698 sayılı Kişisel Verilerin Korunması Kanunu, aydınlatma ve açık rıza, veri ihlali bildirimi, GDPR ile karşılaştırma, bilişim suçları ve e-ticaret mevzuatı uygulamalı örneklerle anlatılır. Yazılımcılar, ürün yöneticileri, uyum ve hukuk ekipleri için uygundur.",
                new[] {
                    ("Kişisel veri ve işleme şartları", "Kişisel ve özel nitelikli veri, işleme şartları, açık rıza ve aydınlatma yükümlülüğü."),
                    ("Veri sorumlusunun yükümlülükleri", "VERBİS kaydı, saklama-imha politikası, teknik ve idari tedbirler."),
                    ("Veri ihlali ve yurt dışına aktarım", "İhlal bildirimi, Kurul kararları, yurt dışına aktarım ve GDPR ile farklar."),
                    ("Bilişim suçları ve e-ticaret", "Sisteme izinsiz erişim, verileri bozma, elektronik ticaret ve ticari ileti kuralları."),
                }),
            new("Arduino ile Gömülü Sistemlere Giriş", "Mühendislik & Robotik", "melis.korkut" + Domain, 899m, 30,
                "Mikrodenetleyici programlamayı Arduino ile sıfırdan öğrenin. Dijital ve analog giriş-çıkışlar, sensör okuma, motor sürme, kesmeler ve seri haberleşme konularını her derste çalışan bir devre kurarak işliyoruz. Elektronik ve kodlamaya yeni başlayan öğrenciler ile kendi akıllı cihazını yapmak isteyen herkes için.",
                new[] {
                    ("Mikrodenetleyici ve geliştirme ortamı", "Arduino kartı, IDE kurulumu, ilk program ve LED yakma."),
                    ("Giriş ve çıkışlar", "Buton okuma, PWM ile parlaklık ayarı ve analog sensör değerleri."),
                    ("Motorlar ve sürücüler", "DC motor, servo ve step motorları sürücü devreleriyle kontrol etme."),
                    ("Haberleşme ve proje", "Seri port, I2C ve SPI ile sensör bağlama; mini hava istasyonu projesi."),
                }),
            new("Temel Elektronik ve Devre Analizi", "Mühendislik & Robotik", "melis.korkut" + Domain, 799m, 40,
                "Elektroniğin temel yasalarını ve devre çözme yöntemlerini öğrenin. Ohm ve Kirchhoff yasaları, düğüm ve çevre analizi, kondansatör ve bobin, diyot ve transistör devreleri breadboard üzerinde kurulup ölçülerek anlatılır. Mühendislik öğrencileri ve gömülü sistemlere sağlam bir temelle başlamak isteyenler için.",
                new[] {
                    ("Akım, gerilim ve direnç", "Ohm yasası, seri ve paralel bağlantı, multimetre ile ölçüm."),
                    ("Devre analiz yöntemleri", "Kirchhoff yasaları, düğüm ve çevre analizi, Thevenin eşdeğeri."),
                    ("Kondansatör, bobin ve geçici durum", "RC ve RL devreleri, zaman sabiti ve osiloskopla gözlem."),
                    ("Diyot ve transistör", "Doğrultucu devreler, transistörü anahtar ve yükselteç olarak kullanma."),
                }),
            new("ROS ile Robotik ve Kontrol Sistemleri", "Mühendislik & Robotik", "melis.korkut" + Domain, 1499m, 25,
                "Otonom bir mobil robotun nasıl algıladığını, karar verdiğini ve hareket ettiğini öğrenin. Robot kinematiği, PID kontrol, ROS 2 düğümleri ve konuları, sensör füzyonu ve SLAM ile haritalama simülasyon ortamında adım adım kurulur. Python veya C++ bilen, kontrol ve robotik alanında uzmanlaşmak isteyen mühendislik öğrencileri için.",
                new[] {
                    ("Robot kinematiği", "Diferansiyel sürüşlü robot modeli, koordinat dönüşümleri ve odometri."),
                    ("PID kontrol", "Geri besleme, P, I ve D terimlerinin etkisi, kazanç ayarı ve kararlılık."),
                    ("ROS 2 mimarisi", "Düğümler, konular, servisler, launch dosyaları ve Gazebo simülasyonu."),
                    ("Algılama ve navigasyon", "Lidar ile SLAM, harita üzerinde yol planlama ve engelden kaçınma."),
                }),
            new("SolidWorks ile CAD ve Mekanik Tasarım", "Mühendislik & Robotik", "melis.korkut" + Domain, 1199m, 30,
                "Bir parçayı çizimden üretime hazır hale getirmeyi öğrenin. Eskiz ve kısıtlar, katı modelleme, montaj, teknik resim, toleranslar ve basit mukavemet analizi gerçek bir robot kolu tasarımı üzerinden işlenir. Makine ve mekatronik öğrencileri, ürün geliştiriciler ve 3B yazıcıyla prototip üretmek isteyenler için uygundur.",
                new[] {
                    ("Eskiz ve kısıtlar", "Tam tanımlı eskizler, ölçülendirme ve tasarım niyeti."),
                    ("Katı modelleme", "Ekstrüzyon, döndürme, desenler, yuvarlatma ve parametrik değişiklikler."),
                    ("Montaj ve mekanizmalar", "Eşleme kısıtları, hareket simülasyonu ve çakışma kontrolü."),
                    ("Teknik resim ve üretim", "Görünüşler, kesitler, toleranslar, malzeme seçimi ve 3B baskı hazırlığı."),
                }),
            new("Siber Güvenlik ve Ağ Temelleri", "Yazılım", "kaan.ersoy" + Domain, 1199m, 40,
                "Ağların nasıl çalıştığını ve nasıl saldırıya uğradığını öğrenerek savunmayı kurun. TCP/IP, DNS ve HTTP, güvenlik duvarları, şifreleme, OWASP Top 10 açıkları ve temel sızma testi araçları laboratuvar ortamında uygulamalı olarak işlenir. Siber güvenliğe kariyer değiştirmek isteyenler ve güvenli kod yazmak isteyen geliştiriciler için.",
                new[] {
                    ("Ağ temelleri", "OSI ve TCP/IP modelleri, IP adresleme, DNS ve HTTP trafiğini Wireshark ile izleme."),
                    ("Kriptografi ve kimlik doğrulama", "Simetrik ve asimetrik şifreleme, özet fonksiyonları, TLS ve parola güvenliği."),
                    ("Web uygulama güvenliği", "OWASP Top 10: SQL enjeksiyonu, XSS, CSRF ve erişim kontrolü hataları."),
                    ("Sızma testi ve savunma", "Nmap ile keşif, zafiyet taraması, güvenlik duvarı kuralları ve olay müdahalesi."),
                }),
            new("Flutter ile Mobil Uygulama Geliştirme", "Yazılım", "kaan.ersoy" + Domain, 1299m, 40,
                "Tek kod tabanıyla Android ve iOS uygulaması geliştirmeyi öğrenin. Dart dili, widget ağacı, durum yönetimi, REST API'den veri çekme, yerel depolama ve mağazaya yayın süreci, baştan sona geliştirilen bir alışveriş uygulamasıyla anlatılır. Temel programlama bilen ve ilk mobil uygulamasını yayınlamak isteyenler için.",
                new[] {
                    ("Dart ve Flutter'a giriş", "Dart sözdizimi, null güvenliği, Flutter kurulumu ve ilk ekran."),
                    ("Widget'lar ve yerleşim", "Stateless ve stateful widget'lar, Row, Column, liste ve form bileşenleri."),
                    ("Durum yönetimi ve veri", "Provider ile durum yönetimi, HTTP istekleri ve JSON ayrıştırma."),
                    ("Yerel depolama ve yayın", "SQLite ile çevrimdışı veri, uygulama simgesi, imzalama ve mağazaya gönderme."),
                }),
            new("Docker, Kubernetes ve DevOps", "Yazılım", "kaan.ersoy" + Domain, 1499m, 35,
                "Uygulamaları konteynerlere taşıyıp buluta otomatik olarak dağıtmayı öğrenin. Docker imajları, Compose, Kubernetes nesneleri, CI/CD hatları, altyapıyı kodla yönetme ve izleme konuları gerçek bir web servisinin yayına alınmasıyla işlenir. Backend geliştiriciler ve DevOps mühendisliğine geçmek isteyenler için.",
                new[] {
                    ("Konteyner temelleri", "Docker imajı, katmanlar, Dockerfile yazımı ve Compose ile çok servisli ortam."),
                    ("Kubernetes", "Pod, Deployment, Service, ConfigMap ve otomatik ölçekleme."),
                    ("CI/CD hatları", "GitHub Actions ile test, imaj üretimi ve otomatik dağıtım."),
                    ("Altyapı ve izleme", "Terraform ile altyapı tanımlama, Prometheus ve Grafana ile izleme."),
                }),
            new("Unity ile Oyun Geliştirme", "Yazılım", "kaan.ersoy" + Domain, 1099m, 40,
                "Unity ve C# ile ilk oyununuzu tasarlayıp yayınlayın. Sahne düzeni, fizik motoru, karakter kontrolü, animasyon, kullanıcı arayüzü ve ses konuları baştan sona geliştirilen iki boyutlu bir platform oyunu üzerinden anlatılır. Oyun geliştirmeye meraklı, temel programlama bilgisi olan herkes için.",
                new[] {
                    ("Unity arayüzü ve C# betikleri", "Sahne, nesne, bileşen yapısı ve ilk betik."),
                    ("Fizik ve karakter kontrolü", "Rigidbody, çarpışmalar, zıplama ve kamera takibi."),
                    ("Animasyon, arayüz ve ses", "Animator, sprite animasyonları, skor ekranı ve ses efektleri."),
                    ("Bölüm tasarımı ve yayın", "Tilemap ile bölüm tasarımı, oyun döngüsü ve WebGL olarak yayınlama."),
                }),
            new("Büyük Veri ve Veri Mühendisliği", "Veri Bilimi & Yapay Zeka", "baris.ozkan" + Domain, 1599m, 35,
                "Milyonlarca satırlık veriyi toplayan, dönüştüren ve analize hazırlayan veri hatlarını kurmayı öğrenin. Veri ambarı modelleme, Apache Spark ile dağıtık işleme, Kafka ile akan veri, Airflow ile iş akışı yönetimi ve veri kalitesi kontrolleri uygulamalı olarak işlenir. SQL ve Python bilen, veri mühendisi olmak isteyenler için.",
                new[] {
                    ("Veri mimarisi", "OLTP ve OLAP, veri ambarı, veri gölü ve yıldız şema modelleme."),
                    ("Apache Spark", "DataFrame API, bölümleme, dağıtık dönüşümler ve performans ayarı."),
                    ("Akan veri", "Kafka konuları, üretici ve tüketiciler, gerçek zamanlı işleme."),
                    ("İş akışı ve veri kalitesi", "Airflow ile zamanlanmış hatlar, veri doğrulama ve izleme."),
                }),
            new("Siyaset Bilimi ve Uluslararası İlişkilere Giriş", "Sosyal Bilimler", "onur.balci" + Domain, 749m, 60,
                "Devlet, iktidar, demokrasi ve uluslararası sistemin nasıl işlediğini temel kavramlardan başlayarak öğrenin. Siyasi ideolojiler, seçim ve parti sistemleri, realizm ve liberalizm gibi uluslararası ilişkiler kuramları ile Birleşmiş Milletler ve AB gibi kurumlar güncel örneklerle işlenir. Siyaset bilimi ve uluslararası ilişkiler bölümüne hazırlananlar ile güncel olayları derinlemesine okumak isteyenler için.",
                new[] {
                    ("Devlet, iktidar ve meşruiyet", "Devletin unsurları, egemenlik, iktidar türleri ve meşruiyet kaynakları."),
                    ("Siyasi ideolojiler ve rejimler", "Liberalizm, muhafazakârlık, sosyalizm; demokratik ve otoriter rejimlerin karşılaştırması."),
                    ("Seçimler, partiler ve kamuoyu", "Seçim sistemleri, parti sistemleri, baskı grupları ve medyanın rolü."),
                    ("Uluslararası ilişkiler kuramları ve kurumlar", "Realizm, liberalizm ve inşacılık; BM, NATO ve AB'nin işleyişi."),
                }),
            new("Hukukun Temel Kavramları ve Anayasa Bilgisi", "Sosyal Bilimler", "selin.koc" + Domain, 649m, 70,
                "Günlük hayatta karşılaştığınız hukuk kurallarını ve vatandaş olarak haklarınızı sade bir dille öğrenin. Hukukun kaynakları, hak ve ehliyet kavramları, yargı örgütü ile Türk anayasa tarihinin dönüm noktaları örnek olaylarla anlatılır. Lise ve üniversite öğrencileri, KPSS'ye hazırlananlar ve hukuka ilk adımını atmak isteyen herkes için uygundur.",
                new[] {
                    ("Hukuk nedir, kaynakları nelerdir?", "Hukuk kuralının özellikleri, yazılı ve yazısız kaynaklar, normlar hiyerarşisi."),
                    ("Hak, ehliyet ve kişilik", "Hak türleri, hak ve fiil ehliyeti, gerçek ve tüzel kişiler."),
                    ("Yargı örgütü", "Adli, idari ve anayasa yargısı; mahkemelerin görevleri ve kanun yolları."),
                    ("Türk anayasa tarihi", "Kanun-ı Esasi'den 1982 Anayasası'na temel değişiklikler ve güncel düzen."),
                }),
            new("Etik ve Estetiğe Giriş", "Edebiyat & Felsefe", "ece.bulut" + Domain, 649m, 60,
                "İyi bir eylemi ve güzel bir eseri ne belirler? Erdem etiği, ödev etiği ve faydacılık gibi ahlak kuramlarını güncel ikilemlerle tartışırken, Platon'dan Kant'a ve çağdaş düşünürlere uzanan estetik yaklaşımlarla sanat eserlerini değerlendirmeyi öğreneceksiniz. Felsefeye ilgi duyan, tartışma ve yazma becerisini geliştirmek isteyen herkes için.",
                new[] {
                    ("Ahlak felsefesinin temel soruları", "Ahlaki görecelik, iyi ve doğru kavramları, etik akıl yürütme."),
                    ("Erdem, ödev ve fayda", "Aristoteles, Kant ve Mill'in kuramları; güncel ahlaki ikilemler üzerinde uygulama."),
                    ("Güzellik ve sanat felsefesi", "Mimesis, beğeni yargısı ve sanatın tanımı üzerine klasik tartışmalar."),
                    ("Çağdaş estetik ve eleştiri", "Modern sanat, yorum kuramları ve bir eser hakkında gerekçeli eleştiri yazmak."),
                }),
            new("Girişimcilik ve İş Stratejisi", "Ekonomi & Finans", "tolga.sezer" + Domain, 999m, 50,
                "Bir iş fikrini doğrulanmış bir iş modeline dönüştürmeyi öğrenin. Müşteri keşfi, iş modeli kanvası, rekabet analizi, birim ekonomisi, fiyatlandırma ve yatırımcı sunumu adım adım kendi fikriniz üzerinde uygulanır. Kendi işini kurmak isteyenler, girişim ekiplerinde çalışanlar ve kurumsal strateji ile ilgilenen öğrenciler için.",
                new[] {
                    ("Fikirden probleme: müşteri keşfi", "Varsayımları belirleme, müşteri görüşmeleri ve problem doğrulama."),
                    ("İş modeli ve değer önerisi", "İş modeli kanvası, değer önerisi tasarımı ve gelir modelleri."),
                    ("Rekabet ve strateji", "Porter'ın beş gücü, konumlandırma ve sürdürülebilir rekabet avantajı."),
                    ("Birim ekonomisi ve yatırımcı sunumu", "Müşteri edinme maliyeti, yaşam boyu değer, fiyatlandırma ve sunum hazırlığı."),
                }),
            new("IELTS ve Akademik İngilizce", "Yabancı Dil", "merve.celik" + Domain, 1199m, 25,
                "Yurt dışında eğitim ve iş başvuruları için IELTS Academic sınavına sistemli hazırlanın. Dört becerinin sınav formatı, puanlama ölçütleri, Writing Task 1 ve 2 kalıpları, akademik okuma stratejileri ve konuşma bölümü için deneme çalışmaları birebir geri bildirimle yapılır. B2 düzeyinde İngilizcesi olan ve hedef puanına ulaşmak isteyenler için.",
                new[] {
                    ("Sınav formatı ve puanlama", "Dört bölümün yapısı, band ölçütleri ve çalışma planı."),
                    ("Academic Reading ve Listening", "Hızlı tarama, soru tiplerine göre strateji ve not alma."),
                    ("Writing Task 1 ve Task 2", "Grafik betimleme ve tartışma yazısı kalıpları, örnek metin analizi."),
                    ("Speaking ve deneme sınavı", "Üç bölümlük konuşma pratiği ve tam deneme sınavı değerlendirmesi."),
                }),
            new("Blender ile 3B Modelleme ve Animasyon", "Tasarım", "deniz.aksoy" + Domain, 1099m, 30,
                "Ücretsiz ve açık kaynak Blender ile üç boyutlu modelleme, malzeme, ışık ve animasyonu sıfırdan öğrenin. Basit nesnelerden ürün görselleştirmesine, kamera hareketinden kısa bir hareketli grafik sahnesine kadar her derste bitmiş bir çalışma üretirsiniz. Tasarımcılar, oyun ve video içerik üreticileri ile 3B dünyaya adım atmak isteyen herkes için.",
                new[] {
                    ("Blender arayüzü ve temel modelleme", "Gezinme, nesne ve düzenleme modları, ekstrüzyon ve modifier'lar."),
                    ("Malzeme, doku ve ışık", "Shader düzenleyici, UV açma ve üç nokta ışıklandırma."),
                    ("Animasyon ve kamera", "Anahtar kareler, grafik düzenleyici ve kamera hareketleri."),
                    ("Render ve hareketli grafik projesi", "Eevee ve Cycles ile render alma, kısa bir logo animasyonu hazırlama."),
                }),
            new("Seramik ve Heykel Atölyesi", "Sanat", "leyla.erdem" + Domain, 899m, 15,
                "Kilin ve üç boyutlu formun diliyle tanışın. Elle şekillendirme yöntemleri, çömlekçi çarkına giriş, oranlı figür heykeli, sır ve pişirim süreçleri küçük gruplarla atölye ortamında uygulanır. Kurs sonunda kendi tasarladığınız bir kullanım objesi ve bir küçük heykelle ayrılırsınız. Daha önce deneyimi olmayan herkes katılabilir.",
                new[] {
                    ("Kil ve elle şekillendirme", "Kil türleri, çimdikleme, fitil ve plaka yöntemleri."),
                    ("Çömlekçi çarkına giriş", "Merkezleme, kap çekme ve tornalama."),
                    ("Figür ve form heykeli", "Oran, denge ve kütle; armatürle küçük figür çalışması."),
                    ("Sır, pişirim ve sergileme", "Astar ve sır uygulama, fırın süreçleri ve eserin sunumu."),
                }),
            new("Ableton ile Müzik Prodüksiyonu", "Müzik", "ozan.gunes" + Domain, 1199m, 25,
                "Bilgisayarınızda fikirden bitmiş bir parçaya ulaşın. Ableton Live ile ritim ve armoni yazmayı, sentezleyici ile ses tasarlamayı, örnekleme, düzenleme, miks ve mastering aşamalarını kendi parçanız üzerinde öğrenirsiniz. Temel müzik bilgisi olan ve kendi prodüksiyonlarını yapmak isteyen müzisyenler ile içerik üreticileri için.",
                new[] {
                    ("Ableton Live ve ilk ritim", "Oturum ve düzenleme görünümleri, MIDI ile davul programlama."),
                    ("Sentezleyici ve ses tasarımı", "Osilatör, filtre ve zarf; kendi bas ve pad seslerinizi yaratma."),
                    ("Örnekleme ve düzenleme", "Sample kesme, warp, parça yapısı ve geçişler."),
                    ("Miks ve mastering", "EQ, kompresör, reverb ve yayına hazır ses seviyesi."),
                }),
            new("Hareket Bilimi ve Sakatlıktan Korunma", "Spor", "kerem.tan" + Domain, 699m, 40,
                "Vücudunuzun nasıl hareket ettiğini anlayarak daha güvenli ve verimli antrenman yapın. Temel anatomi ve biyomekanik, hareket analizi, sık görülen spor sakatlıklarının nedenleri, ısınma ve önleyici egzersiz programları uygulamalı olarak işlenir. Düzenli spor yapanlar, antrenör adayları ve sakatlık sonrası güvenle spora dönmek isteyenler için.",
                new[] {
                    ("Anatomi ve biyomekaniğin temelleri", "Kas-iskelet sistemi, eklem hareketleri ve kuvvet kolları."),
                    ("Hareket analizi", "Squat, hinge ve itme-çekme kalıplarında doğru teknik ve sık hatalar."),
                    ("Sık görülen sakatlıklar", "Diz, omuz ve bel sakatlıklarının mekanizmaları ve risk faktörleri."),
                    ("Önleyici program tasarımı", "Isınma, mobilite, denge ve kademeli yüklenme ile kişisel program."),
                }),
            new("Araştırma Yöntemleri ve Bilimsel Etik", "Genel", "gizem.ucar" + Domain, 749m, 60,
                "Bir araştırma sorusunu kurmaktan bulguları dürüstçe raporlamaya kadar bilimsel çalışmanın adımlarını öğrenin. Literatür taraması, nicel ve nitel yöntemler, örneklem, veri toplama araçları, kaynak gösterme, intihal ve araştırma etiği kurulları örnek projeler üzerinden anlatılır. Ödev, proje, tez veya TÜBİTAK projesi hazırlayan öğrenciler için.",
                new[] {
                    ("Araştırma sorusu ve literatür taraması", "Soru ve hipotez kurma, akademik veri tabanlarında arama."),
                    ("Nicel ve nitel yöntemler", "Deney, anket, görüşme ve gözlem; örneklem seçimi."),
                    ("Veri toplama ve analiz", "Ölçme araçları, geçerlik-güvenirlik ve temel analiz yaklaşımları."),
                    ("Kaynak gösterme ve bilimsel etik", "APA kaynakçası, intihal, veri uydurma ve etik kurul süreçleri."),
                }),
        };
    }
}
