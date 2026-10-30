using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingExtensionsAndIntegrityConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UsageSessions_BookingDetailId",
                table: "UsageSessions");

            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_RoomId",
                table: "BookingDetails");

            migrationBuilder.AddColumn<int>(
                name: "ActualGuestCount",
                table: "UsageSessions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Cleaned",
                table: "UsageSessions",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DevicesOk",
                table: "UsageSessions",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "LightsOff",
                table: "UsageSessions",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StaffNote",
                table: "UsageSessions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            // ApprovalHistories đã được tạo bởi migration 20261028160000 bằng raw SQL
            // và không có trong snapshot; không tạo lại để tránh lỗi trùng bảng.
            // Snapshot vẫn ánh xạ entity này nên EF sẽ coi bảng đã tồn tại.

            // Chuẩn hoá dữ liệu cũ TRƯỚC khi thêm CHECK/UNIQUE constraint,
            // nếu không migration sẽ thất bại trên database đang chạy.
            migrationBuilder.Sql("UPDATE \"Rooms\" SET \"Capacity\" = 1 WHERE \"Capacity\" <= 0;");
            migrationBuilder.Sql("UPDATE \"RoomTypes\" SET \"DefaultCapacity\" = 1 WHERE \"DefaultCapacity\" <= 0;");
            migrationBuilder.Sql("UPDATE \"Bookings\" SET \"GuestCount\" = 1 WHERE \"GuestCount\" <= 0;");
            migrationBuilder.Sql("UPDATE \"BookingDetails\" SET \"GuestCount\" = 1 WHERE \"GuestCount\" <= 0;");
            migrationBuilder.Sql("UPDATE \"BookingDetails\" SET \"EndAt\" = \"StartAt\" + INTERVAL '1 hour' WHERE \"EndAt\" <= \"StartAt\";");
            migrationBuilder.Sql("UPDATE \"Periods\" SET \"EndTime\" = \"StartTime\" + INTERVAL '5 minutes' WHERE \"EndTime\" <= \"StartTime\";");
            migrationBuilder.Sql("""
                UPDATE "Rooms" SET "Status" = CASE "Status"
                    WHEN 'Available' THEN 'Trống'
                    WHEN 'InUse' THEN 'Đang sử dụng'
                    WHEN 'Maintenance' THEN 'Bảo trì'
                    WHEN 'Ngừng sử dụng' THEN 'Bảo trì'
                    WHEN 'Trống' THEN 'Trống'
                    WHEN 'Đang sử dụng' THEN 'Đang sử dụng'
                    WHEN 'Bảo trì' THEN 'Bảo trì'
                    ELSE 'Trống' END;
                """);
            migrationBuilder.Sql("""
                UPDATE "Bookings" SET "Status" = CASE "Status"
                    WHEN 'Pending' THEN 'Chờ duyệt'
                    WHEN 'Approved' THEN 'Đã duyệt'
                    WHEN 'PartiallyApproved' THEN 'Duyệt một phần'
                    WHEN 'Rejected' THEN 'Từ chối'
                    WHEN 'Cancelled' THEN 'Đã hủy'
                    WHEN 'InUse' THEN 'Đang sử dụng'
                    WHEN 'Completed' THEN 'Hoàn thành'
                    WHEN 'Chờ duyệt' THEN 'Chờ duyệt'
                    WHEN 'Đã duyệt' THEN 'Đã duyệt'
                    WHEN 'Duyệt một phần' THEN 'Duyệt một phần'
                    WHEN 'Từ chối' THEN 'Từ chối'
                    WHEN 'Đã hủy' THEN 'Đã hủy'
                    WHEN 'Đang sử dụng' THEN 'Đang sử dụng'
                    WHEN 'Hoàn thành' THEN 'Hoàn thành'
                    ELSE 'Chờ duyệt' END;
                """);
            migrationBuilder.Sql("""
                UPDATE "BookingDetails" SET "Status" = CASE "Status"
                    WHEN 'Pending' THEN 'Chờ duyệt'
                    WHEN 'Approved' THEN 'Đã duyệt'
                    WHEN 'Rejected' THEN 'Từ chối'
                    WHEN 'Cancelled' THEN 'Đã hủy'
                    WHEN 'InUse' THEN 'Đang sử dụng'
                    WHEN 'Completed' THEN 'Hoàn thành'
                    WHEN 'Chờ duyệt' THEN 'Chờ duyệt'
                    WHEN 'Đã duyệt' THEN 'Đã duyệt'
                    WHEN 'Từ chối' THEN 'Từ chối'
                    WHEN 'Đã hủy' THEN 'Đã hủy'
                    WHEN 'Đang sử dụng' THEN 'Đang sử dụng'
                    WHEN 'Hoàn thành' THEN 'Hoàn thành'
                    ELSE 'Chờ duyệt' END;
                """);
            migrationBuilder.Sql("""
                UPDATE "UsageSessions" SET "Status" = CASE "Status"
                    WHEN 'PendingCheckIn' THEN 'Chờ nhận phòng'
                    WHEN 'InUse' THEN 'Đang sử dụng'
                    WHEN 'Completed' THEN 'Hoàn thành'
                    WHEN 'Cancelled' THEN 'Đã hủy'
                    WHEN 'Chờ nhận phòng' THEN 'Chờ nhận phòng'
                    WHEN 'Đang sử dụng' THEN 'Đang sử dụng'
                    WHEN 'Hoàn thành' THEN 'Hoàn thành'
                    WHEN 'Đã hủy' THEN 'Đã hủy'
                    ELSE 'Chờ nhận phòng' END;
                """);
            migrationBuilder.Sql("UPDATE \"UsageSessions\" SET \"ActualGuestCount\" = NULL WHERE \"ActualGuestCount\" <= 0;");
            migrationBuilder.Sql("UPDATE \"UsageSessions\" SET \"ActualCheckOut\" = \"ActualCheckIn\" WHERE \"ActualCheckOut\" < \"ActualCheckIn\";");
            migrationBuilder.Sql("UPDATE \"UsageSessions\" SET \"ConfirmationCode\" = CONCAT('HUIT-', \"Id\") WHERE \"ConfirmationCode\" IS NULL OR BTRIM(\"ConfirmationCode\") = '';");
            migrationBuilder.Sql("WITH duplicates AS (SELECT \"Id\", ROW_NUMBER() OVER (PARTITION BY \"ConfirmationCode\" ORDER BY \"Id\") AS rn FROM \"UsageSessions\") UPDATE \"UsageSessions\" s SET \"ConfirmationCode\" = CONCAT(LEFT(s.\"ConfirmationCode\", 40), '-', s.\"Id\") FROM duplicates d WHERE s.\"Id\" = d.\"Id\" AND d.rn > 1;");

            // Dữ liệu cũ có thể sinh nhiều phiên cho cùng một BookingDetail (ví dụ một phiên "Đã hủy"
            // bị bỏ quên bên cạnh phiên "Hoàn thành" thật). Unique index lọc IsDeleted = FALSE nên
            // chỉ cần soft-delete các bản dư là đủ, lịch sử vẫn được giữ nguyên trong bảng.
            migrationBuilder.Sql("""
                WITH ranked AS (
                    SELECT "Id",
                           ROW_NUMBER() OVER (
                               PARTITION BY "BookingDetailId"
                               ORDER BY
                                   CASE "Status"
                                       WHEN 'Hoàn thành' THEN 0
                                       WHEN 'Đang sử dụng' THEN 1
                                       WHEN 'Chờ nhận phòng' THEN 2
                                       ELSE 3
                                   END,
                                   CASE WHEN "ActualCheckIn" IS NULL THEN 1 ELSE 0 END,
                                   "Id" DESC
                           ) AS rn
                    FROM "UsageSessions"
                    WHERE "IsDeleted" = FALSE
                )
                UPDATE "UsageSessions" s
                SET "IsDeleted" = TRUE, "UpdatedAt" = NOW()
                FROM ranked r
                WHERE s."Id" = r."Id" AND r.rn > 1;
                """);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "UsageSessions" WHERE "IsDeleted" = FALSE GROUP BY "BookingDetailId" HAVING COUNT(*) > 1) THEN
                        RAISE EXCEPTION 'Không thể áp unique UsageSessions.BookingDetailId vì đang có nhiều phiên cho cùng một BookingDetail. Cần đối soát và hợp nhất dữ liệu trước khi chạy migration.';
                    END IF;
                END $$;
                """);

            migrationBuilder.CreateTable(
                name: "BookingExtensions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BookingDetailId = table.Column<int>(type: "integer", nullable: false),
                    UsageSessionId = table.Column<int>(type: "integer", nullable: false),
                    PreviousEndAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NewEndAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PreviousEndPeriodId = table.Column<int>(type: "integer", nullable: true),
                    NewEndPeriodId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingExtensions", x => x.Id);
                    table.CheckConstraint("CK_BookingExtensions_Status", "\"Status\" IN ('Đã áp dụng')");
                    table.CheckConstraint("CK_BookingExtensions_Time_Range", "\"NewEndAt\" > \"PreviousEndAt\"");
                    table.ForeignKey(
                        name: "FK_BookingExtensions_AspNetUsers_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingExtensions_BookingDetails_BookingDetailId",
                        column: x => x.BookingDetailId,
                        principalTable: "BookingDetails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingExtensions_UsageSessions_UsageSessionId",
                        column: x => x.UsageSessionId,
                        principalTable: "UsageSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UsageSessions_BookingDetailId",
                table: "UsageSessions",
                column: "BookingDetailId",
                unique: true,
                filter: "\"IsDeleted\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "IX_UsageSessions_ConfirmationCode",
                table: "UsageSessions",
                column: "ConfirmationCode",
                unique: true,
                filter: "\"IsDeleted\" = FALSE");

            migrationBuilder.AddCheckConstraint(
                name: "CK_UsageSessions_ActualGuestCount_Positive",
                table: "UsageSessions",
                sql: "\"ActualGuestCount\" IS NULL OR \"ActualGuestCount\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_UsageSessions_Checkout_After_Checkin",
                table: "UsageSessions",
                sql: "\"ActualCheckOut\" IS NULL OR \"ActualCheckIn\" IS NULL OR \"ActualCheckOut\" >= \"ActualCheckIn\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_UsageSessions_Status",
                table: "UsageSessions",
                sql: "\"Status\" IN ('Chờ nhận phòng', 'Đang sử dụng', 'Hoàn thành', 'Đã hủy')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RoomTypes_DefaultCapacity_Positive",
                table: "RoomTypes",
                sql: "\"DefaultCapacity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Rooms_Capacity_Positive",
                table: "Rooms",
                sql: "\"Capacity\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Rooms_Status",
                table: "Rooms",
                sql: "\"Status\" IN ('Trống', 'Đang sử dụng', 'Bảo trì')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Periods_Time_Range",
                table: "Periods",
                sql: "\"EndTime\" > \"StartTime\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Bookings_GuestCount_Positive",
                table: "Bookings",
                sql: "\"GuestCount\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Bookings_Status",
                table: "Bookings",
                sql: "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Duyệt một phần', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_RoomId_Status_StartAt_EndAt",
                table: "BookingDetails",
                columns: new[] { "RoomId", "Status", "StartAt", "EndAt" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_BookingDetails_GuestCount_Positive",
                table: "BookingDetails",
                sql: "\"GuestCount\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BookingDetails_Status",
                table: "BookingDetails",
                sql: "\"Status\" IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã hủy', 'Đang sử dụng', 'Hoàn thành')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_BookingDetails_Time_Range",
                table: "BookingDetails",
                sql: "\"EndAt\" > \"StartAt\"");

            migrationBuilder.CreateIndex(
                name: "IX_BookingExtensions_BookingDetailId_RequestedAt",
                table: "BookingExtensions",
                columns: new[] { "BookingDetailId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BookingExtensions_RequestedByUserId",
                table: "BookingExtensions",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingExtensions_UsageSessionId",
                table: "BookingExtensions",
                column: "UsageSessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookingExtensions");

            migrationBuilder.DropIndex(
                name: "IX_UsageSessions_BookingDetailId",
                table: "UsageSessions");

            migrationBuilder.DropIndex(
                name: "IX_UsageSessions_ConfirmationCode",
                table: "UsageSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UsageSessions_ActualGuestCount_Positive",
                table: "UsageSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UsageSessions_Checkout_After_Checkin",
                table: "UsageSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UsageSessions_Status",
                table: "UsageSessions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RoomTypes_DefaultCapacity_Positive",
                table: "RoomTypes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Rooms_Capacity_Positive",
                table: "Rooms");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Rooms_Status",
                table: "Rooms");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Periods_Time_Range",
                table: "Periods");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Bookings_GuestCount_Positive",
                table: "Bookings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Bookings_Status",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_RoomId_Status_StartAt_EndAt",
                table: "BookingDetails");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BookingDetails_GuestCount_Positive",
                table: "BookingDetails");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BookingDetails_Status",
                table: "BookingDetails");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BookingDetails_Time_Range",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "ActualGuestCount",
                table: "UsageSessions");

            migrationBuilder.DropColumn(
                name: "Cleaned",
                table: "UsageSessions");

            migrationBuilder.DropColumn(
                name: "DevicesOk",
                table: "UsageSessions");

            migrationBuilder.DropColumn(
                name: "LightsOff",
                table: "UsageSessions");

            migrationBuilder.DropColumn(
                name: "StaffNote",
                table: "UsageSessions");

            migrationBuilder.CreateIndex(
                name: "IX_UsageSessions_BookingDetailId",
                table: "UsageSessions",
                column: "BookingDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_RoomId",
                table: "BookingDetails",
                column: "RoomId");
        }
    }
}
