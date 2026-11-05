using EdTechApi.API.Helpers;
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

        [Authorize(Roles = RoleNames.Admins)]
        [HttpPost]
        public async Task<IActionResult> CreateCategory([FromBody] Category request)
        {
            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Kategori adı boş olamaz.");

            var exists = await _context.Categories.AnyAsync(c => c.Name.ToLower() == request.Name.ToLower());
            if (exists) return BadRequest("Bu kategori adı zaten mevcut.");

            request.Id = 0; // kimlik veritabanında üretilir
            _context.Categories.Add(request);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
        }

        [Authorize(Roles = RoleNames.Admins)]
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

        [Authorize(Roles = RoleNames.Admins)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound("Kategori bulunamadı.");

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Kategori başarıyla silindi." });
        }

        [Authorize(Roles = RoleNames.Admins)]
        [HttpPost("seed")]
        public IActionResult SeedDefaultCategories()
        {
            // eksikleri ekler, boş/eski kısa açıklamaları günceller (liste: BranchOptions.Defaults)
            var count = EdTechApi.API.Helpers.CatalogSeed.SeedCategories(_context);
            return Ok(new { message = $"{count} varsayılan kategori eklendi." });
        }
    }
}
