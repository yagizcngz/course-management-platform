namespace EdTechApi.Core.Constants
{
    // Öğretmen "Branş" alanı ile kurs "Kategori" alanı için ortak, varsayılan kategori listesi.
    // Seed (DataSeeder, CategoriesController/seed) bu listeden kategori oluşturur; frontend'deki
    // locales/*.json > dynamic.categories ve dynamic.categoryDescriptions anahtarları bu adlarla aynı tutulmalı.
    public static class BranchOptions
    {
        public static readonly (string Name, string Description)[] Defaults =
        {
            ("Yazılım", "Programlama dilleri, web ve backend geliştirme, veri yapıları ve algoritmalar. Sıfırdan başlayanlardan profesyonel geliştiricilere kadar, proje odaklı ve uygulamalı yazılım eğitimleri."),
            ("Matematik", "Temel matematikten analiz, geometri ve ayrık matematiğe uzanan konular. Kavramı önce sezgiyle, sonra ispat ve bol soru çözümüyle pekiştiren, sınavlara ve mühendisliğe hazırlayan dersler."),
            ("Fen Bilimleri", "Fizik, kimya, biyoloji ve astronomi. Deney mantığı, gözlem ve modelleme ile doğa olaylarını anlamayı amaçlayan, lise ve üniversite hazırlık düzeyinde fen eğitimleri."),
            ("Coğrafya", "Fiziki coğrafya, jeomorfoloji, iklim bilgisi, Türkiye coğrafyası, harita okuma ve Coğrafi Bilgi Sistemleri (CBS). Yeryüzünü şekillendiren süreçleri ve mekânsal düşünmeyi öğreten dersler."),
            ("Sosyal Bilimler", "Tarih, Cumhuriyet tarihi ve toplum bilimleri. Olayları kaynaklarıyla, neden-sonuç ilişkisi içinde okuyan; eleştirel düşünmeyi ve yorum gücünü geliştiren eğitimler."),
            ("Yabancı Dil", "İngilizce ve Almanca başta olmak üzere A1'den B2'ye seviyeli dil eğitimleri. Dinleme, konuşma, okuma ve yazma becerilerini günlük hayat ve iş senaryolarıyla birlikte geliştirir."),
            ("Tasarım", "UI/UX, grafik tasarım ve tipografi. Kullanıcı araştırmasından prototiplemeye, görsel hiyerarşiden marka kimliğine kadar dijital ve basılı ürünler için tasarım eğitimleri."),
            ("Sanat", "Karakalem, desen, renk kuramı ve sanat tarihi. Gözlem yeteneğini ve el becerisini geliştiren, sanat eserlerini dönem ve bağlamıyla okumayı öğreten atölye dersleri."),
            ("Müzik", "Piyano, gitar ve temel müzik teorisi. Nota okumadan ritim ve armoniye, ilk parçadan sahne performansına kadar seviyeli enstrüman eğitimleri."),
            ("Spor", "Beden eğitimi, fonksiyonel antrenman ve sağlıklı yaşam. Doğru teknik, sakatlıktan korunma ve sürdürülebilir bir antrenman alışkanlığı kazandıran programlar."),
            ("Veri Bilimi & Yapay Zeka", "Veri analizi, istatistiksel modelleme, makine öğrenmesi ve derin öğrenme. Python ile veriyi temizlemekten model kurup sonuçlarını dürüstçe yorumlamaya kadar uygulamalı veri bilimi eğitimleri."),
            ("Ekonomi & Finans", "Mikro ve makroekonomi, para politikası, muhasebe ve kişisel finans. Piyasaları, finansal tabloları ve ekonomik haberleri bilinçli okumayı öğreten dersler."),
            ("Edebiyat & Felsefe", "Türk ve dünya edebiyatı, felsefenin büyük soruları, mantık ve eleştirel düşünme. Metni dikkatle okumayı, argüman kurmayı ve kendi yorumunu yazmayı öğreten dersler."),
            ("Fotoğrafçılık & Sinema", "Dijital fotoğrafçılık, sinema dili, film analizi ve kısa film yapımı. Işığı, kadrajı ve kurguyu anlayarak görüntüyle hikâye anlatmayı öğreten atölyeler."),
            ("Türk Dili ve Edebiyatı", "Türkçe dil bilgisi, paragraf ve anlam bilgisi, metin analizi, kompozisyon, Cumhuriyet dönemi edebiyatı ve Osmanlı Türkçesi paleografyası. Anadil bilincini, etkili sözlü ve yazılı iletişimi ile zengin edebiyat geleneğimizi akademik derinlikle kazandıran dersler."),
            ("Psikoloji & Bilişsel Bilimler", "Gelişim psikolojisi, bilişsel modeller, zihin felsefesi, sosyal psikoloji, deneysel desenler ve davranışsal araştırma yöntemleri. İnsan davranışını, düşünme süreçlerini ve zihnin biyolojik ile hesaplamalı temellerini bilimsel yöntemlerle inceleyen dersler."),
            ("Hukuk & Kamu Yönetimi", "Anayasa ve idare hukuku, borçlar ve ticaret hukuku, bilişim ve kişisel verilerin korunması hukuku. Kuralları gerekçeleriyle okuyan, somut olay çözümüyle pekiştiren ve kamu yönetiminin işleyişini anlatan dersler."),
            ("Mühendislik & Robotik", "Gömülü sistemler, elektronik, robotik, kontrol sistemleri ve CAD ile mekanik tasarım. Devreyi kurup kodlayan, mekanizmayı çizip üreten, proje odaklı mühendislik atölyeleri."),
            ("Genel","Etkili çalışma teknikleri, zaman yönetimi ve genel kültür. Her alandaki öğrenmeyi destekleyen, branşlar arası beceri eğitimleri."),
        };

        // Kategori -> alt kategori sözlüğü; adlar frontend'de dynamic.subCategories anahtarlarıyla aynı tutulmalı.
        public static readonly Dictionary<string, string[]> SubCategories = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Matematik"] = new[] { "Analiz & Kalkülüs", "Lineer Cebir & Soyut Matematik", "Geometri & Trigonometri", "Olasılık & İstatistik", "TYT-AYT Matematik" },
            ["Türk Dili ve Edebiyatı"] = new[] { "Paragraf & Anlam Bilgisi", "Türkçe Dil Bilgisi & Yazım", "Modern Türk Edebiyatı", "Divan & Halk Edebiyatı", "Akademik Yazım & Hitabet" },
            ["Yazılım"] = new[] { "Web Geliştirme (Frontend & Backend)", "Mobil Uygulama Geliştirme", "Veri Yapıları & Algoritmalar", "Siber Güvenlik & Ağ", "Bulut Mimarisi & DevOps", "Oyun Geliştirme" },
            ["Veri Bilimi & Yapay Zeka"] = new[] { "Makine Öğrenmesi", "Derin Öğrenme & NLP", "Veri Analizi & Görselleştirme", "Büyük Veri & Veri Mühendisliği" },
            ["Fen Bilimleri"] = new[] { "Klasik & Kuantum Fiziği", "Genel & Organik Kimya", "Moleküler Biyoloji & Genetik", "Astronomi & Astrofizik", "YKS Fen Bilimleri" },
            ["Coğrafya"] = new[] { "Fiziki Coğrafya & Jeomorfoloji", "Beşeri & Ekonomik Coğrafya", "Türkiye Coğrafyası & Jeopolitik", "CBS & Harita Okuma" },
            ["Sosyal Bilimler"] = new[] { "Türk & Dünya Tarihi", "Sosyoloji & Toplum Bilimleri", "Siyaset Bilimi & Uluslararası İlişkiler", "Temel Hukuk & Anayasa" },
            ["Edebiyat & Felsefe"] = new[] { "Klasik & Modern Felsefe", "Mantık & Eleştirel Düşünme", "Dünya Edebiyatı & Karşılaştırmalı Metinler", "Etik & Estetik" },
            ["Psikoloji & Bilişsel Bilimler"] = new[] { "Bilişsel Psikoloji & Nörobilim", "Gelişim & Sosyal Psikoloji", "Deneysel Araştırma Yöntemleri", "Davranış Bilimleri" },
            ["Ekonomi & Finans"] = new[] { "Mikro & Makroekonomi", "Finansal Piyasalar & Yatırım", "Muhasebe & Kurumsal Finans", "Girişimcilik & Strateji" },
            ["Yabancı Dil"] = new[] { "Genel İngilizce (A1–C1)", "Akademik & İş İngilizcesi (IELTS/TOEFL)", "Almanca", "İspanyolca & Fransızca" },
            ["Tasarım"] = new[] { "UI/UX & Ürün Tasarımı", "Grafik Tasarım & Tipografi", "3B Modelleme & Hareketli Grafik", "Marka Kimliği & İllüstrasyon" },
            ["Sanat"] = new[] { "Karakalem & Desen Atölyesi", "Renk Kuramı & Yağlıboya", "Sanat Tarihi & Eser Analizi", "Heykel & Seramik" },
            ["Müzik"] = new[] { "Piyano & Klavye", "Gitar & Telli Çalgılar", "Müzik Teorisi, Armoni & Solfej", "Müzik Prodüksiyonu & Ses Tasarımı" },
            ["Fotoğrafçılık & Sinema"] = new[] { "Dijital Fotoğrafçılık & Işık", "Sinema Dili & Film Analizi", "Senaryo & Kısa Film Yapımı", "Video Kurgu & Renk Düzenleme" },
            ["Spor"] = new[] { "Fonksiyonel Antrenman & Kondisyon", "Hareket Bilimi & Sakatlık Önleme", "Beslenme & Sporcu Sağlığı", "Zihin-Beden & Esneklik" },
            ["Hukuk & Kamu Yönetimi"] = new[] { "Anayasa & İdare Hukuku", "Borçlar & Ticaret Hukuku", "Bilişim & Kişisel Veriler Hukuku" },
            ["Mühendislik & Robotik"] = new[] { "Gömülü Sistemler & Elektronik", "Robotik & Kontrol Sistemleri", "CAD & Mekanik Tasarım" },
            ["Genel"] = new[] { "Öğrenmeyi Öğrenme & Hafıza Teknikleri", "Zaman Yönetimi & Verimlilik", "Araştırma Yöntemleri & Bilimsel Etik" },
        };

        public static string[] SubCategoriesOf(string? category) =>
            category != null && SubCategories.TryGetValue(category.Trim(), out var subs) ? subs : Array.Empty<string>();

        // Kategorinin listesindeki kanonik alt kategori yazımı; boş veya listede yoksa null.
        public static string? NormalizeSubCategory(string? category, string? value) =>
            string.IsNullOrWhiteSpace(value) ? null
                : SubCategoriesOf(category).FirstOrDefault(s => string.Equals(s, value.Trim(), StringComparison.OrdinalIgnoreCase));

        public static readonly string[] All = Defaults.Select(d => d.Name).ToArray();

        // Eski seed'in kısa açıklamaları; yalnızca bunlar (veya boş açıklama) yenisiyle güncellenir,
        // yöneticinin elle yazdığı açıklama ezilmez.
        public static readonly HashSet<string> LegacyDescriptions = new(StringComparer.OrdinalIgnoreCase)
        {
            "Yazılım ve Programlama Eğitimleri",
            "Tarih, Coğrafya ve Sosyal Bilimler Eğitimleri",
            "Fizik, Kimya, Biyoloji ve Fen Eğitimleri",
            "İngilizce ve Diğer Diller",
            "Müzik, Resim ve Görsel Sanatlar",
            "Enstrüman ve Vokal Eğitimleri",
            "Beden Eğitimi ve Spor Dersleri",
            "Grafik Tasarım ve UI/UX Eğitimleri",
            "Genel Kültür ve Diğer Konular",
            "Temel ve İleri Seviye Matematik Eğitimleri",
        };

        public static bool IsValid(string? value) => Normalize(value) != null;

        // Geçerliyse listedeki "kanonik" yazımı döndürür, geçersizse null.
        public static string? Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            return All.FirstOrDefault(b => string.Equals(b, value.Trim(), StringComparison.OrdinalIgnoreCase));
        }
    }
}
