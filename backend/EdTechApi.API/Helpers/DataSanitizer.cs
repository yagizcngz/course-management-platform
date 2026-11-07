using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Helpers
{
    // Her açılışta (seed'den sonra) eski veya yarım kalmış kayıtları kodun beklediği şekle getirir. Yalnızca EF sorguları
    // kullanır (testlerde SQLite). Değiştirdiği satır sayısını döner.
    public static class DataSanitizer
    {
        public static int Run(AppDbContext db)
        {
            var changed = 0;
            var year = DateTime.UtcNow.ToString("yy");

            // numarası boş eski profiller, kayıt akışıyla aynı biçimde numaralanır (numara benzersiz: tek tek yazılır)
            void Number()
            {
                foreach (var s in db.Students.IgnoreQueryFilters().Where(s => s.StudentNumber == "").ToList())
                { s.StudentNumber = year + s.Id.ToString().PadLeft(7, '0'); db.SaveChanges(); changed++; }
                foreach (var t in db.Teachers.IgnoreQueryFilters().Where(t => t.TeacherNumber == "").ToList())
                { t.TeacherNumber = year + t.Id.ToString().PadLeft(7, '0'); db.SaveChanges(); changed++; }
            }
            Number();

            // öğrenci hesabı (User) katılım profili olmadan kurs alamaz ve katılamaz; profili eksik olanlara açılır
            foreach (var u in db.Users.Where(u => u.Role == "User"
                         && !db.Students.IgnoreQueryFilters().Any(s => s.UserId == u.Id)).ToList())
            {
                db.Students.Add(new Student { FirstName = u.FirstName, LastName = u.LastName, Email = u.Email, UserId = u.Id });
                db.SaveChanges();
                changed++;
                Number();
            }
            // eğitmen hesabı eğitmen profili olmadan kurs açamaz
            var branch = db.Categories.Select(c => c.Name).FirstOrDefault() ?? "Genel";
            foreach (var u in db.Users.Where(u => u.Role == "Teacher"
                         && !db.Teachers.IgnoreQueryFilters().Any(t => t.UserId == u.Id)).ToList())
            {
                db.Teachers.Add(new Teacher { FirstName = u.FirstName, LastName = u.LastName, Email = u.Email, Branch = branch, UserId = u.Id });
                db.SaveChanges();
                changed++;
                Number();
            }

            changed += RecordCourseCompletions(db);
            return changed;
        }

        // Bitirme kaydı (CourseCompletion) tablosundan önce bitirilmiş veya seed'in doğrudan yazdığı ders tamamlamalarından
        // türeyen bitişleri kalıcılaştırır: rozetler ve eğitmenin mezun sayısı bu tablodan okunur.
        public static int RecordCourseCompletions(AppDbContext db)
        {
            var totals = db.Lessons.GroupBy(l => l.CourseId).Select(g => new { g.Key, Count = g.Count() })
                .ToDictionary(x => x.Key, x => x.Count);
            var done = db.LessonCompletions.Where(c => c.Lesson != null)
                .GroupBy(c => new { c.StudentId, c.Lesson!.CourseId })
                .Select(g => new { g.Key.StudentId, g.Key.CourseId, Count = g.Count(), At = g.Max(c => c.CompletedAt) })
                .ToList()
                .Where(d => totals.TryGetValue(d.CourseId, out var n) && d.Count >= n)
                .ToList();
            if (done.Count == 0) return 0;
            var have = db.CourseCompletions.Select(c => new { c.StudentId, c.CourseId }).ToList()
                .Select(c => (c.StudentId, c.CourseId)).ToHashSet();
            var courseIds = done.Select(d => d.CourseId).Distinct().ToList();
            var courses = db.Courses.IgnoreQueryFilters().Where(c => courseIds.Contains(c.Id))
                .Select(c => new { c.Id, c.Category, c.Title }).ToDictionary(c => c.Id);
            var added = 0;
            foreach (var d in done.Where(d => !have.Contains((d.StudentId, d.CourseId)) && courses.ContainsKey(d.CourseId)))
            {
                var c = courses[d.CourseId];
                db.CourseCompletions.Add(new CourseCompletion
                {
                    StudentId = d.StudentId, CourseId = d.CourseId, Category = c.Category, Title = c.Title, CompletedAt = d.At
                });
                added++;
            }
            db.SaveChanges();
            return added;
        }
    }
}
