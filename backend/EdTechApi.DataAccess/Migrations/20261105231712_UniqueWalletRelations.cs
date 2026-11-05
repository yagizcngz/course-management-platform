using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EdTechApi.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class UniqueWalletRelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "WalletTransactions",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransactions_RelatedTransactionId_Type",
                table: "WalletTransactions",
                columns: new[] { "RelatedTransactionId", "Type" },
                unique: true,
                filter: "[RelatedTransactionId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WalletTransactions_RelatedTransactionId_Type",
                table: "WalletTransactions");

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "WalletTransactions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
