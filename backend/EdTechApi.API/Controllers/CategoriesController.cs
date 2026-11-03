using EdTechApi.Core.Entities;
using EdTechApi.DataAccess.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdTechApi.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CategoriesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _context.Categories.ToListAsync();
            return Ok(categories);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound("Kategori bulunamadı.");
            return Ok(category);
        }

        [Authorize(Roles = "Admin,superadmin")]
        [HttpPost]
        public async Task<IActionResult> CreateCategory([FromBody] Category request)
        {
            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Kategori adı boş olamaz.");

            var exists = await _context.Categories.AnyAsync(c => c.Name.ToLower() == request.Name.ToLower());
            if (exists) return BadRequest("Bu kategori adı zaten mevcut.");

            _context.Categories.Add(request);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
        }

        [Authorize(Roles = "Admin,superadmin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] Category request)
        {
            if (id != request.Id) return BadRequest("ID eşleşmiyor.");

            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound("Kategori bulunamadı.");

            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Kategori adı boş olamaz.");

            var exists = await _context.Categories.AnyAsync(c => c.Name.ToLower() == request.Name.ToLower() && c.Id != id);
            if (exists) return BadRequest("Bu kategori adı zaten mevcut.");

            category.Name = request.Name;
            category.Description = request.Description;

            await _context.SaveChangesAsync();
            return Ok(category);
        }

        [Authorize(Roles = "Admin,superadmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound("Kategori bulunamadı.");

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Kategori başarıyla silindi." });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("seed")]
        public async Task<IActionResult> SeedDefaultCategories()
        {
            var defaults = new List<Category>
            {
                new Category { Name = "Yazılım", Description = "Yazılım ve Programlama Eğitimleri" },
                new Category { Name = "Sosyal Bilimler", Description = "Tarih, Coğrafya ve Sosyal Bilimler Eğitimleri" },
                new Category { Name = "Fen Bilimleri", Description = "Fizik, Kimya, Biyoloji ve Fen Eğitimleri" },
                new Category { Name = "Yabancı Dil", Description = "İngilizce ve Diğer Diller" },
                new Category { Name = "Sanat", Description = "Müzik, Resim ve Görsel Sanatlar" },
                new Category { Name = "Müzik", Description = "Enstrüman ve Vokal Eğitimleri" },
                new Category { Name = "Spor", Description = "Beden Eğitimi ve Spor Dersleri" },
                new Category { Name = "Tasarım", Description = "Grafik Tasarım ve UI/UX Eğitimleri" },
                new Category { Name = "Genel", Description = "Genel Kültür ve Diğer Konular" },
                new Category { Name = "Matematik", Description = "Temel ve İleri Seviye Matematik Eğitimleri" }
            };

            int count = 0;
            foreach (var def in defaults)
            {
                if (!await _context.Categories.AnyAsync(c => c.Name.ToLower() == def.Name.ToLower()))
                {
                    _context.Categories.Add(def);
                    count++;
                }
            }
            if (count > 0) await _context.SaveChangesAsync();
            
            return Ok(new { message = $"{count} varsayılan kategori eklendi." });
        }
    }
}
