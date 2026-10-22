using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HUIT_RoMan.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingOverlapConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Dọn các cặp lịch trùng còn sót lại do race condition trước khi đặt ràng buộc.
            // - Detail "Chờ duyệt" trùng với detail đã duyệt/đang sử dụng: tự động từ chối detail chờ duyệt.
            // - Hai detail "Chờ duyệt" trùng nhau: giữ detail có Id nhỏ hơn, từ chối detail còn lại.
            // - Hai detail đã duyệt/đang sử dụng trùng nhau: không tự quyết định, để bước kiểm tra bên dưới
            //   dừng migration và yêu cầu xử lý thủ công.
            migrationBuilder.Sql(
                """
                WITH conflicting_pending AS (
                    SELECT DISTINCT bd."Id", bd."BookingId"
                    FROM "BookingDetails" bd
                    JOIN "BookingDetails" other
                      ON other."RoomId" = bd."RoomId"
                     AND other."Id" <> bd."Id"
                     AND other."IsDeleted" = FALSE
                     AND other."Status" NOT IN ('Từ chối', 'Đã hủy')
                     AND bd."IsDeleted" = FALSE
                     AND bd."Status" = 'Chờ duyệt'
                     AND bd."StartAt" < other."EndAt"
                     AND bd."EndAt" > other."StartAt"
                     AND (other."Status" <> 'Chờ duyệt' OR other."Id" < bd."Id")
                ),
                rejected AS (
                    UPDATE "BookingDetails" bd
                    SET "Status" = 'Từ chối',
                        "RejectionReason" = 'Tự động từ chối do trùng lịch với đơn đã được duyệt hoặc đặt trước.',
                        "UpdatedAt" = NOW()
                    FROM conflicting_pending c
                    WHERE bd."Id" = c."Id"
                    RETURNING bd."BookingId"
                )
                UPDATE "Bookings" b
                SET "Status" = CASE
                        WHEN NOT EXISTS (
                            SELECT 1
                            FROM "BookingDetails" d
                            WHERE d."BookingId" = b."Id"
                              AND d."Status" <> 'Từ chối'
                        ) THEN 'Từ chối'
                        ELSE 'Duyệt một phần'
                    END
                WHERE b."Id" IN (SELECT DISTINCT "BookingId" FROM rejected)
                  AND b."Status" NOT IN ('Đã hủy', 'Từ chối');
                """);

            // Nếu vẫn còn cặp lịch trùng giữa các đơn đã duyệt/đang sử dụng thì không thể tự động xử lý.
            // Dừng migration để tránh âm thầm hủy lịch của người dùng.
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE
                    conflict_pairs INT;
                BEGIN
                    SELECT COUNT(*) INTO conflict_pairs
                    FROM "BookingDetails" a
                    JOIN "BookingDetails" b
                      ON a."RoomId" = b."RoomId"
                     AND a."Id" < b."Id"
                     AND a."IsDeleted" = FALSE
                     AND b."IsDeleted" = FALSE
                     AND a."Status" NOT IN ('Từ chối', 'Đã hủy')
                     AND b."Status" NOT IN ('Từ chối', 'Đã hủy')
                     AND a."StartAt" < b."EndAt"
                     AND a."EndAt" > b."StartAt";

                    IF conflict_pairs > 0 THEN
                        RAISE EXCEPTION 'Còn % cặp BookingDetails trùng lịch giữa các đơn đã duyệt/đang sử dụng. Vui lòng xử lý thủ công trước khi thêm ràng buộc chống trùng lịch.', conflict_pairs;
                    END IF;
                END $$;
                """);

            // btree_gist cho phép kết hợp cột RoomId (phép =) với range thời gian (phép &&) trong EXCLUDE.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

            // Chặn trùng lịch ở tầng DB. Ràng buộc chỉ áp dụng cho các detail còn hiệu lực,
            // đúng với logic hiện tại (bỏ qua detail đã từ chối/hủy hoặc đã xóa mềm).
            migrationBuilder.Sql(
                """
                ALTER TABLE "BookingDetails"
                ADD CONSTRAINT "EX_BookingDetails_Room_NoOverlap"
                EXCLUDE USING gist (
                    "RoomId" WITH =,
                    tstzrange("StartAt", "EndAt", '[)') WITH &&
                )
                WHERE ("IsDeleted" = FALSE AND "Status" NOT IN ('Từ chối', 'Đã hủy'));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "BookingDetails"
                DROP CONSTRAINT IF EXISTS "EX_BookingDetails_Room_NoOverlap";
                """);
        }
    }
}
