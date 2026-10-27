using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingCheckInAndCancelReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "Bookings",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancelReasonDetail",
                table: "Bookings",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancelSource",
                table: "Bookings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedInAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CancelReason",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CancelReasonDetail",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CancelSource",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CheckedInAt",
                table: "Bookings");
        }
    }
}
