using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiLevelApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RequiresSecondApproval",
                table: "RoomTypes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Level",
                table: "ApprovalHistories",
                type: "integer",
                nullable: true);

            migrationBuilder.DropCheckConstraint(
                name: "CK_Bookings_Status",
                table: "Bookings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BookingDetails_Status",
                table: "BookingDetails");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Bookings_Status",
                table: "Bookings",
                sql: "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Duyệt một phần', 'Chờ duyệt cấp 2', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BookingDetails_Status",
                table: "BookingDetails",
                sql: "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Chờ duyệt cấp 2', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Bookings_Status",
                table: "Bookings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BookingDetails_Status",
                table: "BookingDetails");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Bookings_Status",
                table: "Bookings",
                sql: "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Duyệt một phần', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BookingDetails_Status",
                table: "BookingDetails",
                sql: "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "ApprovalHistories");

            migrationBuilder.DropColumn(
                name: "RequiresSecondApproval",
                table: "RoomTypes");
        }
    }
}
