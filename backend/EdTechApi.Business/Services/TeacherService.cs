using EdTechApi.Business.Interfaces;
using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.Business.Services
{
    public class TeacherService : ITeacherService
    {
        private readonly AppDbContext _context;

        public TeacherService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Teacher>> GetAllTeachersAsync()
        {
            return await _context.Teachers.ToListAsync();
        }

        public async Task<Teacher?> GetTeacherByIdAsync(int id)
        {
            return await _context.Teachers.FindAsync(id);
        }

        public async Task AddTeacherAsync(Teacher teacher)
        {
            await _context.Teachers.AddAsync(teacher);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> UpdateTeacherAsync(int id, Teacher updatedTeacher)
        {
            var teacher = await _context.Teachers.FindAsync(id);
            if (teacher == null)
            {
                return false;
            }

            teacher.FirstName = updatedTeacher.FirstName;
            teacher.LastName = updatedTeacher.LastName;
            teacher.Email = updatedTeacher.Email;
            teacher.Branch = updatedTeacher.Branch;
            teacher.AboutMe = updatedTeacher.AboutMe;
            teacher.ProfilePictureUrl = updatedTeacher.ProfilePictureUrl;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task DeleteTeacherAsync(int id)
        {
            // Teacher kaydı hard-delete değil, soft-delete yapılıyor: satır DB'de kalır,
            // sadece IsDeleted=true işaretlenir.
            var teacher = await _context.Teachers.FindAsync(id);
            if (teacher != null)
            {
                teacher.IsDeleted = true;
                teacher.DeletedAt = DateTime.UtcNow;

                // Bağlı giriş hesabı kapatılır (AccountRetirement): kullanıcı adı boşa çıkar, cüzdan geçmişi kalır.
                if (teacher.UserId.HasValue)
                {
                    var user = await _context.Users.FindAsync(teacher.UserId.Value);
                    if (user != null)
                    {
                        teacher.UserId = null;
                        // aynı hesaba bağlı kalmış bir öğrenci profili (ör. eğitmenliğe geçmiş öğrenci) silmeyi engellemesin
                        foreach (var s in await _context.Students.IgnoreQueryFilters().Where(s => s.UserId == user.Id).ToListAsync())
                            s.UserId = null;
                        AccountRetirement.Retire(user);
                    }
                }

                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Teacher>> GetDeletedTeachersAsync()
        {
            return await _context.Teachers
                .IgnoreQueryFilters()
                .Where(t => t.IsDeleted)
                .ToListAsync();
        }
    }
}