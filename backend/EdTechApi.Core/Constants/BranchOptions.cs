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
            ("Genel","Etkili çalışma teknikleri, zaman yönetimi ve genel kültür. Her alandaki öğrenmeyi destekleyen, branşlar arası beceri eğitimleri."),
        };

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
