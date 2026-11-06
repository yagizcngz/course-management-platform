using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Helpers
{
    // Demo topluluğu (yalnızca Development): forum başlıkları, demo hesapların arkadaşlıkları ve mesajları, deneme videoları.
    // İdempotent: forum hiç başlık yoksa, arkadaşlık/mesaj demo hesabın hiç kaydı yoksa yazılır. Yazarlar CatalogSeed'in
    // hesaplarıdır (kullanıcı adı = e-postanın @ öncesi); eksik olan atlanır.
    public static class CommunitySeed
    {
        private record Thread(string Topic, string Author, string Title, int DaysAgo, (string Author, string Body)[] Posts);

        public static void Run(AppDbContext db)
        {
            var users = db.Users.Where(u => u.Role != "Deleted").ToDictionary(u => u.Username, StringComparer.OrdinalIgnoreCase);
            SeedForum(db, users);
            SeedSocial(db, users);
            SeedSampleVideos(db);
            db.SaveChanges();
        }

        private static void SeedForum(AppDbContext db, Dictionary<string, User> users)
        {
            if (db.ForumThreads.Any()) return;
            var now = DateTime.UtcNow;
            var postIndex = 0;
            foreach (var t in Threads)
            {
                if (!users.TryGetValue(t.Author, out var author)) continue;
                var start = now.AddDays(-t.DaysAgo).AddHours(-(t.Title.Length % 9));
                var thread = new ForumThread { Topic = t.Topic, Title = t.Title, AuthorId = author.Id, CreatedAt = start };
                var at = start;
                foreach (var (who, body) in t.Posts)
                {
                    if (!users.TryGetValue(who, out var u)) continue;
                    var post = new ForumPost { AuthorId = u.Id, Body = body, CreatedAt = at };
                    // her mesaj birkaç beğeni alır: forumdaki hesaplardan sırayla
                    foreach (var liker in users.Values.Where(x => x.Id != u.Id).Skip(postIndex % 7).Take(postIndex * 3 % 5))
                        post.Likes.Add(new ForumPostLike { UserId = liker.Id });
                    thread.Posts.Add(post);
                    thread.LastActivityAt = at;
                    at = at.AddHours(3 + postIndex % 20);
                    postIndex++;
                }
                if (thread.Posts.Count > 0) db.ForumThreads.Add(thread);
            }
            db.SaveChanges();
        }

        private static void SeedSocial(AppDbContext db, Dictionary<string, User> users)
        {
            if (!users.TryGetValue("demo_student", out var student) || !users.TryGetValue("demo_teacher", out var teacher)) return;
            var now = DateTime.UtcNow;

            if (!db.Friendships.Any(f => f.RequesterId == student.Id || f.AddresseeId == student.Id
                                         || f.RequesterId == teacher.Id || f.AddresseeId == teacher.Id))
            {
                void Link(string a, string b, string status, int daysAgo)
                {
                    if (users.TryGetValue(a, out var x) && users.TryGetValue(b, out var y))
                        db.Friendships.Add(new Friendship { RequesterId = x.Id, AddresseeId = y.Id, Status = status, CreatedAt = now.AddDays(-daysAgo) });
                }
                Link("demo_student", "demo_teacher", "Accepted", 60);
                Link("ali.vural", "demo_student", "Accepted", 45);
                Link("demo_student", "ayse.korkmaz", "Accepted", 30);
                Link("berk.altun", "demo_student", "Pending", 2);
                Link("demo_student", "zeynep.arslan", "Pending", 1);
                Link("emre.aydin", "demo_teacher", "Accepted", 90);
                Link("demo_teacher", "can.yildiz", "Accepted", 70);
                Link("defne.kurt", "demo_teacher", "Pending", 3);
                db.SaveChanges();
            }

            if (!db.DirectMessages.Any(m => m.SenderId == student.Id || m.RecipientId == student.Id))
            {
                void Talk(string a, string b, int daysAgo, bool lastUnread, params string[] lines)
                {
                    if (!users.TryGetValue(a, out var x) || !users.TryGetValue(b, out var y)) return;
                    var at = now.AddDays(-daysAgo);
                    for (var i = 0; i < lines.Length; i++)
                    {
                        var (from, to) = i % 2 == 0 ? (x, y) : (y, x);
                        var unread = lastUnread && i == lines.Length - 1;
                        db.DirectMessages.Add(new DirectMessage
                        {
                            SenderId = from.Id, RecipientId = to.Id, Body = lines[i], CreatedAt = at,
                            ReadAt = unread ? null : at.AddMinutes(12)
                        });
                        at = at.AddMinutes(17 + i * 23);
                    }
                }
                Talk("demo_student", "demo_teacher", 3, true,
                    "Merhaba hocam, ikinci dersteki ödevde döngü koşulunu nasıl kurmam gerektiğini tam anlayamadım.",
                    "Merhaba! Önce döngünün ne zaman durması gerektiğini bir cümleyle yaz, sonra o cümleyi koşula çevir. Kodunu paylaşırsan bakarım.",
                    "Tamam, koşulu i < n yerine i <= n yazmışım, son elemanı fazladan geziyormuş.",
                    "Aynen öyle, klasik bir sınır hatası. Bir sonraki derste bu tür hataları test yazarak yakalamayı göreceğiz.",
                    "Harika, teşekkürler! Forumda da benzer bir soru açmıştım, oraya da çözümü yazacağım.");
                Talk("ali.vural", "demo_student", 1, true,
                    "Selam! Matematik kursunda hangi derstesin?",
                    "Limit konusunu bitirdim, türeve geçiyorum.",
                    "Süper, cumartesi forumdaki çalışma grubuna katılmak ister misin?");
                Talk("ayse.korkmaz", "demo_student", 9, false,
                    "Tasarım kursundaki renk ödevini paylaştın mı?",
                    "Evet, dün yükledim. Senin paletin çok iyiydi bu arada.");
                Talk("emre.aydin", "demo_teacher", 5, false,
                    "Bir sonraki dönem ortak bir proje atölyesi açalım mı?",
                    "Çok iyi olur, öğrencilerden de bu yönde istek geliyor. Haftaya bir taslak çıkaralım.");
                db.SaveChanges();
            }
        }

        // Deneme için: demo öğrencinin bitirmediği kurslarda ilk bitmemiş derse kısa bir örnek video (Google'ın herkese
        // açık örnek klipleri). Öğretmenin eklediği videoya dokunulmaz.
        private static readonly string[] SampleVideos =
        {
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
        };

        private static void SeedSampleVideos(AppDbContext db)
        {
            var studentId = db.Students.Where(s => s.User != null && s.User.Username == "demo_student").Select(s => (int?)s.Id).FirstOrDefault();
            if (studentId == null) return;
            var courseIds = db.Enrollments.Where(e => e.StudentId == studentId).Select(e => e.CourseId).ToList();
            var done = db.LessonCompletions.Where(c => c.StudentId == studentId).Select(c => c.LessonId).ToHashSet();
            var lessons = db.Lessons.Where(l => courseIds.Contains(l.CourseId)).OrderBy(l => l.Order).ThenBy(l => l.Id).ToList();
            var n = 0;
            foreach (var courseId in courseIds)
            {
                var next = lessons.FirstOrDefault(l => l.CourseId == courseId && !done.Contains(l.Id));
                if (next == null || next.VideoUrl != null) continue;
                next.VideoUrl = SampleVideos[n++ % SampleVideos.Length];
            }
        }

        private static readonly Thread[] Threads =
        {
            new("software", "demo_student", "Döngülerde sınır hatası: i < n mi, i <= n mi?", 6, new[]
            {
                ("demo_student", "Dizi elemanlarını gezerken son elemanı ya atlıyorum ya da dizinin dışına çıkıyorum. Bunun için aklınızda tuttuğunuz basit bir kural var mı?"),
                ("emre.aydin", "Yarı açık aralık düşünün: [0, n). Başlangıç dahil, bitiş hariç. Dizinin uzunluğu n ise koşul hep i < n olur. Kendi döngünüzü yazarken önce boş dizi ve tek elemanlı dizi için elle deneyin."),
                ("ali.vural", "Ben de aynı hatayı yapıyordum; foreach kullanmaya başlayınca bu sorun neredeyse bitti. İndeks gerekmiyorsa onu öneririm."),
                ("demo_teacher", "Güzel tartışma. Bir sonraki adım: bu durumları birim testiyle sabitlemek. Boş, tek eleman, çok eleman: üç test, sınır hatası kalmaz.")
            }),
            new("software", "zeynep.arslan", "Algoritma çalışma planı: haftada 5 soru yeter mi?", 14, new[]
            {
                ("zeynep.arslan", "Yarışmaya hazırlanan öğrenciler sık soruyor. Benim önerim: sayıdan çok tekrar. Çözemediğiniz soruyu bir hafta sonra yeniden çözün; ikinci çözüm asıl öğrenmedir."),
                ("berk.altun", "Hocam her konudan kaç soru çözmeden diğerine geçmemeyi önerirsiniz?"),
                ("zeynep.arslan", "Konuya göre değişir ama 'artık tahmin edebiliyorum' dediğiniz an genelde 8-10 sorudur. Grafikte daha fazla, sıralamada daha az.")
            }),
            new("math", "ali.vural", "Limitte 0/0 belirsizliği: L'Hôpital mı, çarpanlara ayırma mı?", 4, new[]
            {
                ("ali.vural", "Sınavda hangisini önce denemeliyim? L'Hôpital hızlı ama bazen türev almak daha uzun sürüyor."),
                ("mehmet.ozturk", "Önce cebir: çarpanlara ayırma ya da eşlenikle çarpma çoğu soruda iki satırda biter ve sizi türev hatasından korur. L'Hôpital'i, ifade bunlara uymadığında kullanın."),
                ("demo_student", "Bu kuralı not aldım, teşekkürler. Bir de trigonometrik limitlerde sin(x)/x'e benzetmek işe yarıyor.")
            }),
            new("math", "mehmet.ozturk", "Haftanın sorusu: üçgende açıortay", 10, new[]
            {
                ("mehmet.ozturk", "ABC üçgeninde AB = 6, AC = 9 ve A açısının açıortayı BC'yi D'de kesiyor. BC = 10 ise BD kaçtır? Çözümünüzü kısa bir açıklamayla yazın."),
                ("ayse.korkmaz", "Açıortay teoremiyle BD/DC = 6/9 = 2/3. BD = 10 · 2/5 = 4."),
                ("mehmet.ozturk", "Doğru ve temiz bir çözüm. Bonus: aynı soruda AD uzunluğunu da bulabilir misiniz?")
            }),
            new("science", "can.yildiz", "Bu ay gözlem: Jüpiter ve uyduları", 8, new[]
            {
                ("can.yildiz", "Gece yarısına doğru Jüpiter doğu ufkunda parlak bir nokta olarak görünüyor. Basit bir dürbünle bile dört Galilei uydusunu seçebilirsiniz. Gözlemlerinizi buraya yazın!"),
                ("defne.kurt", "Dün gece üç uydu gördüm, dördüncüsü gezegenin arkasında olmalı. Telefonla dürbünden fotoğraf çekmeye çalıştım ama titriyor."),
                ("can.yildiz", "Telefonu dürbüne sabitlemek için bir mandal ve lastik yeter. Bir de pozlama süresini kısaltın."),
                ("demo_student", "Ben de bu akşam deneyeceğim, hava açık görünüyor.")
            }),
            new("science", "elif.sahin", "Evde DNA izolasyonu: çilek deneyi", 21, new[]
            {
                ("elif.sahin", "Bulaşık deterjanı, tuz, su ve soğuk alkolle çilekten DNA çıkarabilirsiniz. Ölçüleri ve adımları kursun üçüncü dersinde anlattım; sonuçlarınızın fotoğrafını paylaşın."),
                ("gamze.cetin", "Yaptım! Beyaz ipliksi bir tabaka oluştu. Alkol yeterince soğuk değilse daha az çıkıyor sanırım."),
                ("elif.sahin", "Kesinlikle, soğuk alkol DNA'nın çökmesini hızlandırır. Güzel gözlem.")
            }),
            new("design", "ayse.korkmaz", "Arayüzde kaç renk kullanmalıyım?", 5, new[]
            {
                ("ayse.korkmaz", "Portfolyo sitem için palet seçiyorum ve her şey çok kalabalık görünüyor. Sizce kaç renk ideal?"),
                ("demo_teacher", "Bir nötr ölçek (arka plan, metin, kenarlıklar), bir vurgu rengi ve durumlar için (başarı, hata) iki renk. Vurguyu ekranın en fazla onda birinde kullanın."),
                ("efe.sahin", "60-30-10 kuralı da işime yarıyor: %60 ana, %30 ikincil, %10 vurgu.")
            }),
            new("career", "demo_teacher", "Cumartesi çevrim içi çalışma grubu", 2, new[]
            {
                ("demo_teacher", "Bu cumartesi 14:00'te kurs ödevleri için bir çalışma saati açıyorum. Takıldığınız soruları önceden bu başlığa yazarsanız onlardan başlarız."),
                ("ali.vural", "Türev sorularıyla gelebilir miyim? Matematik kursundan."),
                ("demo_teacher", "Tabii, branşlar karışık olabilir; sırayla bakarız."),
                ("demo_student", "Ben de katılıyorum, döngü ödevini getireceğim.")
            }),
            new("career", "emir.aslan", "İlk staj başvurusu için portfolyo önerileri", 12, new[]
            {
                ("emir.aslan", "Yaz stajı için başvuracağım ama sadece okul projelerim var. Portfolyoya ne koymalıyım?"),
                ("emre.aydin", "Az ama bitmiş proje. Her birine kısa bir README: sorun, çözüm, neyi öğrendiniz. Kod okunaklıysa ve testleri varsa bu okul projesi olsa bile fark yaratır."),
                ("emir.aslan", "Çok net, teşekkürler hocam. İki projeyi toparlayıp tekrar paylaşacağım.")
            }),
            new("general", "demo_admin", "Topluluk alanına hoş geldiniz", 30, new[]
            {
                ("demo_admin", "Burası kurslardan bağımsız sorular, kaynak önerileri ve çalışma grupları için. Lütfen saygılı olun; kişisel bilgilerinizi paylaşmayın. Bir mesajı yalnızca yazarı ya da yöneticiler silebilir."),
                ("nehir.acar", "Elinize sağlık, güzel bir fikir!"),
                ("demo_student", "Merhaba herkese!")
            }),
            new("general", "lara.gunes", "Odaklanmak için çalışma yöntemleriniz neler?", 7, new[]
            {
                ("lara.gunes", "Telefon yanımdayken 10 dakikadan fazla odaklanamıyorum. Sizin işe yarayan yöntemleriniz neler?"),
                ("kaan.ozturk", "25 dakika çalışma, 5 dakika ara. Telefonu başka odaya koymak en büyük fark oldu."),
                ("ipek.aydin", "Ben her oturumun başında tek bir hedef yazıyorum: 'şu dersi bitir' gibi. Bitince bırakıyorum.")
            })
        };
    }
}
