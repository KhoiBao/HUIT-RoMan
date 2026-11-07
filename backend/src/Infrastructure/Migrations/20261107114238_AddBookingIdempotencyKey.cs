using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingIdempotencyKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings");

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Bookings",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId_IdempotencyKey",
                table: "Bookings",
                columns: new[] { "UserId", "IdempotencyKey" },
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            // Căn chỉnh 4 FK của SessionReminders về Restrict đúng theo model
            // (migration 20261103141500 tạo nhầm Cascade/SetNull).
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_AspNetUsers_UserId",
                table: "SessionReminders");
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_Rooms_RoomId",
                table: "SessionReminders");
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_UsageSessions_UsageSessionId",
                table: "SessionReminders");
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_ViolationRecords_ViolationRecordId",
                table: "SessionReminders");

            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_AspNetUsers_UserId",
                table: "SessionReminders",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_Rooms_RoomId",
                table: "SessionReminders",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_UsageSessions_UsageSessionId",
                table: "SessionReminders",
                column: "UsageSessionId",
                principalTable: "UsageSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_ViolationRecords_ViolationRecordId",
                table: "SessionReminders",
                column: "ViolationRecordId",
                principalTable: "ViolationRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_AspNetUsers_UserId",
                table: "SessionReminders");
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_Rooms_RoomId",
                table: "SessionReminders");
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_UsageSessions_UsageSessionId",
                table: "SessionReminders");
            migrationBuilder.DropForeignKey(
                name: "FK_SessionReminders_ViolationRecords_ViolationRecordId",
                table: "SessionReminders");

            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_AspNetUsers_UserId",
                table: "SessionReminders",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_Rooms_RoomId",
                table: "SessionReminders",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_UsageSessions_UsageSessionId",
                table: "SessionReminders",
                column: "UsageSessionId",
                principalTable: "UsageSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_SessionReminders_ViolationRecords_ViolationRecordId",
                table: "SessionReminders",
                column: "ViolationRecordId",
                principalTable: "ViolationRecords",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.DropIndex(
                name: "IX_Bookings_UserId_IdempotencyKey",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings",
                column: "UserId");
        }
    }
}
