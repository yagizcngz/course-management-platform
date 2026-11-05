using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EdTechApi.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseSubCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "Courses");
        }
    }
}
