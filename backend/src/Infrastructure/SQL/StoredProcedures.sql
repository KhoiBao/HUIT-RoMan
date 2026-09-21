-- =============================================================
-- HUIT-RoMan: PostgreSQL Stored Procedures & Functions
-- Database: PostgreSQL
-- Tác dụng: Thay thế/bổ sung các truy vấn phức tạp trong EF Core
-- =============================================================

DROP FUNCTION IF EXISTS fn_check_booking_conflict(INT, TIMESTAMP, TIMESTAMP, INT);
DROP FUNCTION IF EXISTS fn_check_booking_conflict(INT, TIMESTAMPTZ, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS fn_get_room_schedule(INT, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS fn_get_room_schedule(INT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS fn_get_available_rooms(TIMESTAMP, TIMESTAMP, INT, INT);
DROP FUNCTION IF EXISTS fn_get_available_rooms(TIMESTAMPTZ, TIMESTAMPTZ, INT, INT);
DROP PROCEDURE IF EXISTS sp_process_room_checkout(INT, TIMESTAMP, VARCHAR);
DROP PROCEDURE IF EXISTS sp_process_room_checkout(INT, TIMESTAMPTZ, VARCHAR);

-- ─────────────────────────────────────────────────────────────
-- 1. fn_check_booking_conflict
--    Kiểm tra xung đột lịch phòng trong khoảng thời gian
--    Trả về TRUE nếu CÓ xung đột, FALSE nếu không
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_check_booking_conflict(
    p_room_id              INT,
    p_start_at             TIMESTAMPTZ,
    p_end_at               TIMESTAMPTZ,
    p_exclude_detail_id    INT DEFAULT NULL   -- bỏ qua 1 BookingDetail (khi update)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM   "BookingDetails" bd
        WHERE  bd."RoomId"  = p_room_id
          AND  bd."Status"  NOT IN ('Từ chối', 'Đã hủy')
          AND  bd."StartAt" < p_end_at
          AND  bd."EndAt"   > p_start_at
          AND  (p_exclude_detail_id IS NULL OR bd."Id" <> p_exclude_detail_id)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 2. fn_get_room_schedule
--    Lấy lịch đặt phòng trong khung thời gian [window_start, window_end)
--    Dùng cho cả 2 chế độ: theo tiết và theo giờ
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_room_schedule(
    p_room_id       INT,
    p_window_start  TIMESTAMPTZ,
    p_window_end    TIMESTAMPTZ
) RETURNS TABLE (
    booking_detail_id   INT,
    booking_id          INT,
    activity_name       VARCHAR(255),
    purpose             TEXT,
    start_at            TIMESTAMPTZ,
    end_at              TIMESTAMPTZ,
    start_period_id     INT,
    start_period_name   VARCHAR(50),
    end_period_id       INT,
    end_period_name     VARCHAR(50),
    guest_count         INT,
    status              TEXT,
    booked_by_username  TEXT,
    booked_by_fullname  TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bd."Id"                                     AS booking_detail_id,
        bd."BookingId"                              AS booking_id,
        b."ActivityName"                            AS activity_name,
        COALESCE(bd."Purpose", b."Purpose")         AS purpose,
        bd."StartAt"                                AS start_at,
        bd."EndAt"                                  AS end_at,
        bd."StartPeriodId"                          AS start_period_id,
        sp."Name"                                   AS start_period_name,
        bd."EndPeriodId"                            AS end_period_id,
        ep."Name"                                   AS end_period_name,
        bd."GuestCount"                             AS guest_count,
        bd."Status"                                 AS status,
        u."UserName"                                AS booked_by_username,
        u."FullName"                                AS booked_by_fullname
    FROM  "BookingDetails" bd
    JOIN  "Bookings"       b  ON b."Id"  = bd."BookingId"
    JOIN  "AspNetUsers"    u  ON u."Id"  = b."UserId"
    LEFT JOIN "Periods"    sp ON sp."Id" = bd."StartPeriodId"
    LEFT JOIN "Periods"    ep ON ep."Id" = bd."EndPeriodId"
    WHERE bd."RoomId"  = p_room_id
      AND bd."Status"  NOT IN ('Từ chối', 'Đã hủy')
      AND bd."StartAt" < p_window_end
      AND bd."EndAt"   > p_window_start
    ORDER BY bd."StartAt";
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 3. fn_get_available_rooms
--    Lấy danh sách phòng trống trong khung thời gian
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_available_rooms(
    p_window_start  TIMESTAMPTZ,
    p_window_end    TIMESTAMPTZ,
    p_room_type_id  INT  DEFAULT NULL,
    p_min_capacity  INT  DEFAULT 0
) RETURNS TABLE (
    room_id              INT,
    room_name            VARCHAR(255),
    room_code            VARCHAR(50),
    building             VARCHAR(100),
    floor                VARCHAR(50),
    capacity             INT,
    room_type_id         INT,
    room_type_name       VARCHAR(255),
    is_booking_by_period BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r."Id",
        r."Name",
        r."RoomCode",
        r."Building",
        r."Floor",
        r."Capacity",
        rt."Id",
        rt."Name",
        rt."IsBookingByPeriod"
    FROM  "Rooms"     r
    JOIN  "RoomTypes" rt ON rt."Id" = r."RoomTypeId"
    WHERE r."Status" IN ('Trống', 'Available')
      AND r."Capacity" >= p_min_capacity
      AND (p_room_type_id IS NULL OR r."RoomTypeId" = p_room_type_id)
      AND NOT EXISTS (
          SELECT 1
          FROM   "BookingDetails" bd
          WHERE  bd."RoomId"  = r."Id"
            AND  bd."Status"  NOT IN ('Từ chối', 'Đã hủy')
            AND  bd."StartAt" < p_window_end
            AND  bd."EndAt"   > p_window_start
      )
    ORDER BY r."Building", r."Floor", r."RoomCode";
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 4. sp_approve_booking
--    Duyệt hoặc từ chối toàn bộ đơn (Booking + tất cả BookingDetail)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_approve_booking(
    p_booking_id        INT,
    p_decision          VARCHAR(50),   -- 'Đã duyệt' | 'Từ chối'
    p_rejection_reason  TEXT DEFAULT NULL
) AS $$
BEGIN
    UPDATE "Bookings"
    SET    "Status"          = p_decision,
           "RejectionReason" = p_rejection_reason
    WHERE  "Id" = p_booking_id;

    UPDATE "BookingDetails"
    SET    "Status"          = p_decision,
           "RejectionReason" = p_rejection_reason
    WHERE  "BookingId" = p_booking_id
      AND  "Status"    = 'Chờ duyệt';

    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 5. sp_update_room_status
--    Cập nhật trạng thái phòng: Trống | Đang sử dụng | Bảo trì
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_update_room_status(
    p_room_id  INT,
    p_status   VARCHAR(50),
    p_reason   TEXT DEFAULT NULL
) AS $$
BEGIN
    UPDATE "Rooms"
    SET    "Status"      = p_status,
           "Description" = CASE
               WHEN p_reason IS NOT NULL
               THEN CONCAT('[', p_status, '] ', p_reason)
               ELSE "Description"
           END
    WHERE  "Id" = p_room_id;

    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 6. fn_get_booking_summary
--    Thống kê tổng hợp đặt phòng theo tháng/năm
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_booking_summary(
    p_year   INT,
    p_month  INT DEFAULT NULL   -- NULL = cả năm
) RETURNS TABLE (
    total_bookings    BIGINT,
    approved          BIGINT,
    rejected          BIGINT,
    pending           BIGINT,
    cancelled         BIGINT,
    total_rooms_used  BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)                                                   AS total_bookings,
        COUNT(*) FILTER (WHERE b."Status" = 'Đã duyệt')           AS approved,
        COUNT(*) FILTER (WHERE b."Status" = 'Từ chối')           AS rejected,
        COUNT(*) FILTER (WHERE b."Status" = 'Chờ duyệt')            AS pending,
        COUNT(*) FILTER (WHERE b."Status" = 'Đã hủy')          AS cancelled,
        COUNT(DISTINCT bd."RoomId")
            FILTER (WHERE b."Status" = 'Đã duyệt')                AS total_rooms_used
    FROM  "Bookings"      b
    LEFT JOIN "BookingDetails" bd ON bd."BookingId" = b."Id"
    WHERE EXTRACT(YEAR  FROM b."CreatedAt") = p_year
      AND (p_month IS NULL OR EXTRACT(MONTH FROM b."CreatedAt") = p_month);
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 7. sp_record_violation_and_restrict
--    Ghi nhận vi phạm & tự động tạo lệnh cấm nếu mức độ nghiêm trọng cao.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_record_violation_and_restrict(
    p_user_id            INT,
    p_violation_type_id  INT,
    p_usage_session_id   INT,
    p_incident_time      TIMESTAMPTZ,
    p_description        TEXT,
    p_severity           INT,
    p_penalty_applied    TEXT,
    p_restrict_days      INT DEFAULT 0 -- Số ngày cấm mượn phòng (nếu có)
) AS $$
BEGIN
    -- 1. Ghi nhận vi phạm
    INSERT INTO "ViolationRecords" (
        "UserId", "ViolationTypeId", "UsageSessionId", 
        "IncidentTime", "Description", "Severity", "PenaltyApplied", "Status"
    )
    VALUES (
        p_user_id, p_violation_type_id, p_usage_session_id,
        p_incident_time, p_description, p_severity, p_penalty_applied, 'Hoạt động'
    );

    -- 2. Nếu có cấm, tạo UserRestriction
    IF p_restrict_days > 0 THEN
        INSERT INTO "UserRestrictions" (
            "UserId", "RestrictionType", "Reason",
            "StartAt", "EndAt", "Status", "CreatedAt"
        )
        VALUES (
            p_user_id, 'Cấm mượn phòng', p_penalty_applied,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + (p_restrict_days || ' days')::INTERVAL, 'Hoạt động', CURRENT_TIMESTAMP
        );
    END IF;

    COMMIT;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 8. fn_check_user_booking_eligibility
--    Kiểm tra quyền mượn phòng của User (Trạng thái và Lệnh cấm).
--    Trả về TRUE nếu hợp lệ, FALSE nếu đang bị cấm hoặc khoá.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_check_user_booking_eligibility(
    p_user_id INT
) RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_has_restriction BOOLEAN;
BEGIN
    -- Kiểm tra trạng thái User
    SELECT "Status" INTO v_status FROM "AspNetUsers" WHERE "Id" = p_user_id;
    IF v_status <> 'Hoạt động' THEN
        RETURN FALSE;
    END IF;

    -- Kiểm tra xem có lệnh cấm nào đang Active và chưa hết hạn không
    SELECT EXISTS (
        SELECT 1 FROM "UserRestrictions"
        WHERE "UserId" = p_user_id
          AND "Status" = 'Hoạt động'
          AND ("EndAt" IS NULL OR "EndAt" > CURRENT_TIMESTAMP)
    ) INTO v_has_restriction;

    IF v_has_restriction THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 9. sp_process_room_checkout
--    Xử lý trả phòng (UsageSession): Checkout, cập nhật trạng thái
--    phòng (Trống/Bảo trì) và cập nhật BookingDetail.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE sp_process_room_checkout(
    p_usage_session_id  INT,
    p_actual_checkout   TIMESTAMPTZ,
    p_room_condition    VARCHAR(50) -- 'Trống' hoặc 'Bảo trì'
) AS $$
DECLARE
    v_booking_detail_id INT;
    v_room_id           INT;
BEGIN
    -- Khóa record UsageSession để đảm bảo an toàn
    SELECT "BookingDetailId" INTO v_booking_detail_id
    FROM "UsageSessions"
    WHERE "Id" = p_usage_session_id
    FOR UPDATE;

    IF v_booking_detail_id IS NULL THEN
        RAISE EXCEPTION 'Phiên sử dụng không tồn tại.';
    END IF;

    -- Lấy RoomId
    SELECT "RoomId" INTO v_room_id
    FROM "BookingDetails"
    WHERE "Id" = v_booking_detail_id
    FOR UPDATE;

    -- 1. Cập nhật UsageSession
    UPDATE "UsageSessions"
    SET "ActualCheckOut" = p_actual_checkout,
        "Status" = 'Hoàn thành'
    WHERE "Id" = p_usage_session_id;

    -- 2. Cập nhật BookingDetail
    UPDATE "BookingDetails"
    SET "Status" = 'Hoàn thành'
    WHERE "Id" = v_booking_detail_id;

    -- 3. Cập nhật Room (nếu phòng đang InUse hoặc cùng id)
    -- Nếu bị báo hỏng (p_room_condition = 'Bảo trì'), set thành Bảo trì
    -- Nếu bình thường, trả về 'Trống'
    UPDATE "Rooms"
    SET "Status" = p_room_condition
    WHERE "Id" = v_room_id;

    COMMIT;
END;
$$ LANGUAGE plpgsql;
