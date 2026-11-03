using EdTechApi.API.Helpers;
using EdTechApi.Business.Interfaces;
using EdTechApi.DataAccess.Context;
using Microsoft.EntityFrameworkCore;
using EdTechApi.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EdTechApi.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly AppDbContext _context;

        public StudentsController(IStudentService studentService, AppDbContext context)
        {
            _studentService = studentService;
            _context = context;
        }

        // Yönetici herkesi, öğretmen yalnızca kendi kurslarındaki öğrencileri görür; öğrenciler listeyi göremez.
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (User.IsAdmin()) return Ok(await _studentService.GetAllStudentsAsync());
            if (!User.IsInRole("Teacher")) return StatusCode(403, "Öğrenci listesini görme yetkiniz yok.");
            return Ok(await StudentsOfMyCourses().ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var student = await _studentService.GetStudentByIdAsync(id);
            if (student == null)
            {
                return NotFound("Öğrenci bulunamadı.");
            }
            var username = User.GetUsername();
            var isSelf = student.UserId != null && await _context.Users.AnyAsync(u => u.Id == student.UserId && u.Username == username);
            var isMyStudent = User.IsInRole("Teacher") && await StudentsOfMyCourses().AnyAsync(s => s.Id == id);
            if (!User.IsAdmin() && !isSelf && !isMyStudent) return StatusCode(403, "Bu öğrenciyi görme yetkiniz yok.");
            return Ok(student);
        }

        private IQueryable<Student> StudentsOfMyCourses()
        {
            var username = User.GetUsername();
            return _context.Students.Where(s => s.Enrollments.Any(e =>
                e.Course.Teacher != null && e.Course.Teacher.User != null && e.Course.Teacher.User.Username == username));
        }


        [Authorize(Roles = "Admin,superadmin")]
        [HttpPost]
        public async Task<IActionResult> CreateStudent([FromBody] Student newStudent)
        {
            // Gövdeden gelen ilişki/sistem alanlarını yok say (over-posting)
            newStudent.Id = 0; newStudent.User = null; newStudent.UserId = null; newStudent.IsDeleted = false;
            newStudent.Enrollments = new List<Enrollment>();
            try
            {
                await _studentService.AddStudentAsync(newStudent);
                return CreatedAtAction(nameof(GetById), new { id = newStudent.Id }, newStudent);
            }
            catch (InvalidOperationException ex)
            {
                // Servisten gelen benzersizlik hatasını yakalayıp arayüze iletiyoruz
                return BadRequest(ex.Message);
            }
        }
        
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStudent(int id, [FromBody] Student updatedStudent)
        {
            var success = await _studentService.UpdateStudentAsync(id, updatedStudent);
            if (!success)
            {
                return NotFound("Öğrenci bulunamadı.");
            }
            return NoContent();
        }

        [Authorize(Roles = "Admin,superadmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStudent(int id)
        {
            await _studentService.DeleteStudentAsync(id);
            return NoContent();
        }

        // Silinmiş (soft-deleted) öğrenciler — Raporlar sayfasındaki "Silinen Öğrenciler" kartı için
        [Authorize(Roles = "Admin,superadmin")]
        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedStudents()
        {
            var deleted = await _studentService.GetDeletedStudentsAsync();
            return Ok(deleted);
        }
        [Authorize(Roles = "Admin,superadmin")]
        [HttpPost("bulk-delete")]
        public async Task<IActionResult> DeleteMultipleStudents([FromBody] List<int> ids)
        {
            if (ids == null || !ids.Any()) return BadRequest("Silinecek öğrenci seçilmedi.");

            foreach (var id in ids)
            {
                // Mevcut servis metodunu kullanarak seçili id'leri sırasıyla siliyoruz
                await _studentService.DeleteStudentAsync(id);
            }

            return Ok();
        }

        // AuthController'da token "sub" claim'ine kullanıcı adını yazıyor. ASP.NET Core JWT
        // middleware'i bu claim'i genelde ClaimTypes.NameIdentifier'a eşler; her ihtimale karşı
        // ikisini de ve ham "sub" değerini de kontrol ediyoruz.
        private string? GetCurrentUsername()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? User.Identity?.Name;
        }
}}