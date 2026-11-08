using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordOtpFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "OtpExpiresAt",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OtpFailedAttempts",
                table: "AspNetUsers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "OtpHash",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OtpExpiresAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "OtpFailedAttempts",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "OtpHash",
                table: "AspNetUsers");
        }
    }
}
