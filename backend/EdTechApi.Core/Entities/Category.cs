using System.ComponentModel.DataAnnotations.Schema;
using EdTechApi.Core.Constants;

namespace EdTechApi.Core.Entities
{
    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        // alt kategoriler sabit taksonomiden gelir (BranchOptions), tabloda tutulmaz
        [NotMapped]
        public string[] SubCategories => BranchOptions.SubCategoriesOf(Name);
    }
}
