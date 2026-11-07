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