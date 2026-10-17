using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentQuantities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AvailableQuantity",
                table: "Equipments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalQuantity",
                table: "Equipments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE ""Equipments""
                SET ""TotalQuantity"" = 10
                WHERE ""TotalQuantity"" = 0;

                UPDATE ""Equipments"" e
                SET ""AvailableQuantity"" = e.""TotalQuantity"" - COALESCE(
                    (SELECT SUM(re.""Quantity"") 
                     FROM ""RoomEquipments"" re 
                     WHERE re.""EquipmentId"" = e.""Id"" AND re.""IsDeleted"" = false), 
                    0);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvailableQuantity",
                table: "Equipments");

            migrationBuilder.DropColumn(
                name: "TotalQuantity",
                table: "Equipments");
        }
    }
}
