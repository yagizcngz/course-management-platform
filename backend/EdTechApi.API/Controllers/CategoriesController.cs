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
            var categories = await _context.Categories.AsNoTracking().ToListAsync();
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

            var oldName = category.Name;
            var newName = request.Name.Trim();
            category.Name = newName;
            category.Description = request.Description;

            // kurslar, branşlar ve başvurular kategoriyi adıyla tutar: hepsi yeni ada taşınır, yoksa doğrulamadan geçemezler
            await using var tx = await _context.Database.BeginTransactionAsync();
            if (oldName != newName)
            {
                await _context.Courses.IgnoreQueryFilters().Where(c => c.Category == oldName)
                    .ExecuteUpdateAsync(s => s.SetProperty(c => c.Category, newName));
                await _context.CourseCompletions.Where(c => c.Category == oldName)
                    .ExecuteUpdateAsync(s => s.SetProperty(c => c.Category, newName));
                foreach (var t in await _context.Teachers.IgnoreQueryFilters().Where(t => t.Branch != null && t.Branch.Contains(oldName)).ToListAsync())
                    t.Branch = Rename(t.Branch, oldName, newName);
                foreach (var a in await _context.TeacherApplications.Where(a => a.Branch.Contains(oldName)).ToListAsync())
                    a.Branch = Rename(a.Branch, oldName, newName)!;
                foreach (var r in await _context.BranchChangeRequests.Where(r => r.RequestedBranch.Contains(oldName)
                             || (r.CurrentBranch != null && r.CurrentBranch.Contains(oldName))).ToListAsync())
                {
                    r.RequestedBranch = Rename(r.RequestedBranch, oldName, newName)!;
                    r.CurrentBranch = Rename(r.CurrentBranch, oldName, newName);
                }
            }
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok(category);
        }

        private static List<string> Branches(string? csv) =>
            (csv ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList();

        // virgüllü branş listesinde yalnızca tam eşleşen adı değiştirir ("Matematik" -> "Fen" "Matematik Tarihi"ne dokunmaz)
        private static string? Rename(string? csv, string from, string to) =>
            csv == null ? null
                : string.Join(", ", Branches(csv).Select(b => string.Equals(b, from, StringComparison.OrdinalIgnoreCase) ? to : b));

        [Authorize(Roles = RoleNames.Admins)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound("Kategori bulunamadı.");

            var courses = await _context.Courses.CountAsync(c => c.Category == category.Name);
            var teachers = (await _context.Teachers.Where(t => t.Branch != null && t.Branch.Contains(category.Name))
                    .Select(t => t.Branch).ToListAsync())
                .Count(b => Branches(b).Contains(category.Name, StringComparer.OrdinalIgnoreCase));
            if (courses + teachers > 0)
                return BadRequest($"Bu kategori kullanımda: {courses} kurs, {teachers} eğitmen. Önce onları başka bir kategoriye taşıyın.");

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
