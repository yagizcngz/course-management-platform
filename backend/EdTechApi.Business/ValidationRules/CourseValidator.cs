using EdTechApi.Core.Entities;
using FluentValidation;

namespace EdTechApi.Business.ValidationRules
{
    public class CourseValidator : AbstractValidator<Course>
    {
        public CourseValidator()
        {
            RuleFor(c => c.Title).NotEmpty().WithMessage("Kurs başlığı boş bırakılamaz.");
            RuleFor(c => c.MaxCapacity).GreaterThan(0).WithMessage("Kurs kapasitesi 0'dan büyük olmalıdır.");
            RuleFor(c => c.Price).GreaterThanOrEqualTo(0).WithMessage("Kurs ücreti negatif olamaz.");
            RuleFor(c => c.Category).NotEmpty().WithMessage("Kurs kategorisi seçilmelidir.");
        }
    }
}