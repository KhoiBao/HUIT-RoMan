using System;
using HUIT_RoMan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionReminders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SessionReminders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsageSessionId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    RoomId = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    WarningLevel = table.Column<int>(type: "integer", nullable: false),
                    RemindedByStaff = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    RemindedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EscalatedToViolation = table.Column<bool>(type: "boolean", nullable: false),
                    ViolationRecordId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionReminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionReminders_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionReminders_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionReminders_UsageSessions_UsageSessionId",
                        column: x => x.UsageSessionId,
                        principalTable: "UsageSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessionReminders_ViolationRecords_ViolationRecordId",
                        column: x => x.ViolationRecordId,
                        principalTable: "ViolationRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SessionReminders_RoomId",
                table: "SessionReminders",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionReminders_UsageSessionId",
                table: "SessionReminders",
                column: "UsageSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionReminders_UserId",
                table: "SessionReminders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionReminders_ViolationRecordId",
                table: "SessionReminders",
                column: "ViolationRecordId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionReminders");
        }
    }
}

