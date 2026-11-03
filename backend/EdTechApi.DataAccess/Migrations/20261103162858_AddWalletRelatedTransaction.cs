using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EdTechApi.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddWalletRelatedTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RelatedTransactionId",
                table: "WalletTransactions",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RelatedTransactionId",
                table: "WalletTransactions");
        }
    }
}
