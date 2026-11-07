using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EdTechApi.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddWalletTopUpReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Reference",
                table: "WalletTransactions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransactions_UserId_Reference",
                table: "WalletTransactions",
                columns: new[] { "UserId", "Reference" },
                unique: true,
                filter: "[Reference] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WalletTransactions_UserId_Reference",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "Reference",
                table: "WalletTransactions");
        }
    }
}
