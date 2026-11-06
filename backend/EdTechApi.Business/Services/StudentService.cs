using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    public class StudentService : IStudentService
    {
        private readonly AppDbContext _context;

        public StudentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Student>> GetAllStudentsAsync()
        {
            return await _context.Students.AsNoTracking().ToListAsync();
        }

        public async Task<Student?> GetStudentByIdAsync(int id)
        {
            return await _context.Students.FindAsync(id);
        }

        public async Task AddStudentAsync(Student student)
        {
            // Aynı öğrenci numarasına sahip kayıt var mı kontrolü
            bool isNumberExist = await _context.Students.AnyAsync(s => s.StudentNumber == student.StudentNumber);
            
            if (isNumberExist)
            {
                // Varsa bir istisna (exception) fırlatıyoruz, bunu Controller yakalayacak
                throw new InvalidOperationException("Bu öğrenci numarası sistemde zaten kayıtlı. Lütfen farklı bir numara giriniz.");
            }

            await _context.Students.AddAsync(student);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteStudentAsync(int id)
        {
            // Student kaydı hard-delete değil, soft-delete yapılıyor: satır DB'de kalır,
            // sadece IsDeleted=true işaretlenir. Böylece Raporlar sayfası gerçek
            // "silinen öğrenci" sayısını gösterebiliyor.
            var student = await _context.Students.FindAsync(id);
            if (student != null)
            {
                student.IsDeleted = true;
                student.DeletedAt = DateTime.UtcNow;

                // Bağlı giriş hesabı kapatılır (AccountRetirement): kullanıcı adı boşa çıkar, cüzdan geçmişi kalır.
                if (student.UserId.HasValue)
                {
                    var user = await _context.Users.FindAsync(student.UserId.Value);
                    if (user != null)
                    {
                        student.UserId = null;
                        await AccountRetirement.RetireAsync(_context, user);
                    }
                }

                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Student>> GetDeletedStudentsAsync()
        {
            return await _context.Students
                .IgnoreQueryFilters()
                .Where(s => s.IsDeleted)
                .ToListAsync();
        }

        public async Task<Student?> GetStudentByUsernameAsync(string username)
        {
            if (string.IsNullOrWhiteSpace(username)) return null;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return null;

            // 1) Önce kalıcı ve güvenilir olan UserId FK üzerinden dene
            var linkedStudent = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.Id);
            if (linkedStudent != null)
            {
                return linkedStudent;
            }

            // 2) Henüz bağlanmamış eski kayıtlar için ad-soyad eşleştirmesine düş
            //    (Enrollment eşleştirmesinde kullanılan mantıkla aynı). Bir eşleşme
            //    bulunursa kaydı kalıcı olarak bu kullanıcıya bağlıyoruz, böylece bir
            //    sonraki seferde doğrudan UserId ile bulunur.
            var normalized = username.Trim().ToLower();
            var students = await _context.Students.ToListAsync();
            var matched = students.FirstOrDefault(s =>
                $"{s.FirstName} {s.LastName}".Trim().ToLower() == normalized);

            if (matched != null)
            {
                matched.UserId = user.Id;
                await _context.SaveChangesAsync();
            }

            return matched;
        }

        public async Task<bool> UpdateStudentProfileAsync(string username, string? aboutMe, string? profilePictureUrl)
        {
            var student = await GetStudentByUsernameAsync(username);
            if (student == null) return false;

            student.AboutMe = aboutMe;
            student.ProfilePictureUrl = profilePictureUrl;
            await _context.SaveChangesAsync();
            return true;
        }
            public async Task<bool> UpdateStudentAsync(int id, Student updatedStudent)
{
    var student = await _context.Students.FindAsync(id);
    if (student == null)
    {
        return false;
    }

    student.FirstName = updatedStudent.FirstName;
    student.LastName = updatedStudent.LastName;
    student.Email = updatedStudent.Email;
    student.AboutMe = updatedStudent.AboutMe;
    student.ProfilePictureUrl = updatedStudent.ProfilePictureUrl;
    // StudentNumber ve CreatedAt'e bilerek dokunmuyoruz — bunlar sabit kalmalı

    await _context.SaveChangesAsync();
    return true;
}
    }
}