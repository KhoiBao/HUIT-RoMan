using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddApprovalAuditAndAutoApprove : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalMode",
                table: "Bookings",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByUserId",
                table: "Bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalMode",
                table: "BookingDetails",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "BookingDetails",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByUserId",
                table: "BookingDetails",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "EmployeeId",
                table: "ApprovalHistories",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "ActorUserId",
                table: "ApprovalHistories",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalMode",
                table: "ApprovalHistories",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Key);
                    table.ForeignKey(
                        name: "FK_SystemSettings_AspNetUsers_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_ApprovedByUserId",
                table: "Bookings",
                column: "ApprovedByUserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Bookings_Approval_Audit",
                table: "Bookings",
                sql: "(\"ApprovalMode\" IS NULL AND \"ApprovedByUserId\" IS NULL AND \"ApprovedAt\" IS NULL) OR (\"ApprovalMode\" IN ('MANUAL', 'AUTO') AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_ApprovedByUserId",
                table: "BookingDetails",
                column: "ApprovedByUserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BookingDetails_Approval_Audit",
                table: "BookingDetails",
                sql: "(\"ApprovalMode\" IS NULL AND \"ApprovedByUserId\" IS NULL AND \"ApprovedAt\" IS NULL) OR (\"ApprovalMode\" IN ('MANUAL', 'AUTO') AND \"ApprovedByUserId\" IS NOT NULL AND \"ApprovedAt\" IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_ApprovalHistories_ActorUserId",
                table: "ApprovalHistories",
                column: "ActorUserId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ApprovalHistories_Actor",
                table: "ApprovalHistories",
                sql: "\"ActorUserId\" IS NOT NULL OR \"EmployeeId\" IS NOT NULL OR \"ApprovalMode\" = 'AUTO'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ApprovalHistories_Mode",
                table: "ApprovalHistories",
                sql: "\"ApprovalMode\" IS NULL OR \"ApprovalMode\" IN ('MANUAL', 'AUTO')");

            migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_UpdatedByUserId",
                table: "SystemSettings",
                column: "UpdatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ApprovalHistories_AspNetUsers_ActorUserId",
                table: "ApprovalHistories",
                column: "ActorUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BookingDetails_AspNetUsers_ApprovedByUserId",
                table: "BookingDetails",
                column: "ApprovedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_AspNetUsers_ApprovedByUserId",
                table: "Bookings",
                column: "ApprovedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ApprovalHistories_AspNetUsers_ActorUserId",
                table: "ApprovalHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_BookingDetails_AspNetUsers_ApprovedByUserId",
                table: "BookingDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_AspNetUsers_ApprovedByUserId",
                table: "Bookings");

            migrationBuilder.DropTable(
                name: "SystemSettings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_ApprovedByUserId",
                table: "Bookings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Bookings_Approval_Audit",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_ApprovedByUserId",
                table: "BookingDetails");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BookingDetails_Approval_Audit",
                table: "BookingDetails");

            migrationBuilder.DropIndex(
                name: "IX_ApprovalHistories_ActorUserId",
                table: "ApprovalHistories");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ApprovalHistories_Actor",
                table: "ApprovalHistories");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ApprovalHistories_Mode",
                table: "ApprovalHistories");

            migrationBuilder.DropColumn(
                name: "ApprovalMode",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ApprovalMode",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "ActorUserId",
                table: "ApprovalHistories");

            migrationBuilder.DropColumn(
                name: "ApprovalMode",
                table: "ApprovalHistories");

            migrationBuilder.AlterColumn<int>(
                name: "EmployeeId",
                table: "ApprovalHistories",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
