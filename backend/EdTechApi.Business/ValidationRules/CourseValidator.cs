using EdTechApi.Core.Constants;
using EdTechApi.Core.Entities;
using FluentValidation;

namespace EdTechApi.Business.ValidationRules
{
    public class CourseValidator : AbstractValidator<Course>
    {
        public CourseValidator()
        {
            RuleFor(c => c.Title).NotEmpty().WithMessage("Kurs başlığı boş bırakılamaz.");
            RuleFor(c => c.Title).MaximumLength(200).WithMessage("Kurs başlığı en fazla 200 karakter olabilir.");
            RuleFor(c => c.Description).MaximumLength(20000).WithMessage("Kurs açıklaması en fazla 20000 karakter olabilir.");
            RuleFor(c => c.ImageUrl).Must(u => SafeUrl.IsAllowed(u, "/uploads/")).WithMessage(SafeUrl.Error);
            RuleFor(c => c.MaxCapacity).GreaterThan(0).WithMessage("Kurs kapasitesi 0'dan büyük olmalıdır.");
            RuleFor(c => c.Price).GreaterThanOrEqualTo(0).WithMessage("Kurs ücreti negatif olamaz.");
            RuleFor(c => c.Category).NotEmpty().WithMessage("Kurs kategorisi seçilmelidir.");
        }
    }
}