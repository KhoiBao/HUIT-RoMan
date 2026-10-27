using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Booking.DTOs
{
    // ===================== BOOKING DTOs =====================

    public class BookingDetailItemDto
    {
        public int RoomId { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public int? StartPeriodId { get; set; }
        public int? EndPeriodId { get; set; }
        public int GuestCount { get; set; }
        public string Purpose { get; set; }
    }

    public class CreateBookingDto
    {
        public string ActivityName { get; set; }
        public string Purpose { get; set; }
        public int GuestCount { get; set; }
        public string Note { get; set; }
        public int? UserId { get; set; }
        public bool? AutoApprove { get; set; }
        public List<BookingDetailItemDto> Details { get; set; } = new();
    }

    public class BookingDetailResponseDto
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public string RoomName { get; set; }
        public string RoomCode { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public int? StartPeriodId { get; set; }
        public string StartPeriodName { get; set; }
        public int? EndPeriodId { get; set; }
        public string EndPeriodName { get; set; }
        public int GuestCount { get; set; }
        public string Purpose { get; set; }
        public string Status { get; set; }
        public string RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class BookingResponseDto
    {
        public int Id { get; set; }
        public string ActivityName { get; set; }
        public string Purpose { get; set; }
        public int GuestCount { get; set; }
        public string Status { get; set; }
        public string RejectionReason { get; set; }
        public string Note { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string UserFullName { get; set; }
        /// <summary>Thời điểm check-in (UTC). NULL = chưa nhận phòng.</summary>
        public DateTime? CheckedInAt { get; set; }
        /// <summary>Mã lý do hủy (CHANGE_PLAN | NO_LONGER_NEEDED | OTHER | NO_SHOW). NULL = đơn cũ chưa có dữ liệu.</summary>
        public string? CancelReason { get; set; }
        /// <summary>Nội dung chi tiết khi lý do hủy là OTHER.</summary>
        public string? CancelReasonDetail { get; set; }
        /// <summary>Nguồn hủy: STUDENT | AUTO | STAFF. NULL = không ghi nhận.</summary>
        public string? CancelSource { get; set; }
        /// <summary>Thông tin cửa sổ nhận phòng tính tại thời điểm request (server time).</summary>
        public CheckInWindowDto? CheckInWindow { get; set; }
        public List<BookingDetailResponseDto> Details { get; set; } = new();
    }

    /// <summary>
    /// Request hủy đơn đặt phòng (mang theo lý do).
    /// Với Admin/Employee các trường lý do là tùy chọn; sinh viên bắt buộc chọn lý do hợp lệ.
    /// </summary>
    public class CancelBookingRequest
    {
        /// <summary>Mã lý do: CHANGE_PLAN | NO_LONGER_NEEDED | OTHER (sinh viên).</summary>
        public string? Reason { get; set; }
        /// <summary>Nội dung bổ sung, bắt buộc khi Reason = OTHER.</summary>
        public string? ReasonDetail { get; set; }
    }

    /// <summary>Trạng thái cửa sổ nhận phòng trả về cho client (chỉ để hiển thị, backend vẫn tự kiểm tra).</summary>
    public class CheckInWindowDto
    {
        /// <summary>Thời điểm bắt đầu đặt phòng T (UTC).</summary>
        public DateTime StartAt { get; set; }
        /// <summary>Thời điểm mở nhận phòng T - 15 phút (UTC).</summary>
        public DateTime OpensAt { get; set; }
        /// <summary>Hạn cuối nhận phòng = T (UTC).</summary>
        public DateTime DeadlineAt { get; set; }
        /// <summary>NotOpen | Open | Expired</summary>
        public string State { get; set; } = "NotOpen";
        /// <summary>Thời điểm server tính trạng thái (UTC) — frontend dùng để đồng bộ đếm ngược.</summary>
        public DateTime ServerTime { get; set; }
    }

    public class ApproveBookingDetailDto
    {
        public string Decision { get; set; } // "Đã duyệt" or "Từ chối"
        public string RejectionReason { get; set; }
    }

    public class ApproveBookingDto
    {
        public string Decision { get; set; } // "Đã duyệt" or "Từ chối"
        public string RejectionReason { get; set; }
    }

    // ===================== ROOM SCHEDULE DTOs =====================

    /// <summary>
    /// Query lịch phòng.
    /// IsBookingByPeriod=true  → cung cấp StartPeriodId + EndPeriodId.
    /// IsBookingByPeriod=false → cung cấp StartTime + EndTime (TimeSpan, VD: "07:00:00").
    /// Nếu không truyền filter time/period, trả về toàn bộ lịch trong ngày.
    /// </summary>
    public class RoomScheduleQueryDto
    {
        public DateTime Date { get; set; }

        // --- Chế độ mượn theo Tiết (IsBookingByPeriod = true) ---
        /// <summary>ID tiết bắt đầu (từ bảng Periods)</summary>
        public int? StartPeriodId { get; set; }
        /// <summary>ID tiết kết thúc (từ bảng Periods)</summary>
        public int? EndPeriodId { get; set; }

        // --- Chế độ mượn theo Giờ (IsBookingByPeriod = false) ---
        /// <summary>Giờ bắt đầu, VD: "07:00:00"</summary>
        public TimeSpan? StartTime { get; set; }
        /// <summary>Giờ kết thúc, VD: "09:45:00"</summary>
        public TimeSpan? EndTime { get; set; }
    }

    public class RoomScheduleItemDto
    {
        public int BookingDetailId { get; set; }
        public int BookingId { get; set; }
        public string ActivityName { get; set; }
        public string Purpose { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public int? StartPeriodId { get; set; }
        public string StartPeriodName { get; set; }
        public int? EndPeriodId { get; set; }
        public string EndPeriodName { get; set; }
        public int GuestCount { get; set; }
        public string Status { get; set; }
        public string BookedByName { get; set; }
    }

    public class RoomScheduleDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; }
        public string RoomCode { get; set; }
        public string RoomStatus { get; set; }
        /// <summary>true = phòng này mượn theo tiết; false = mượn theo giờ tự do</summary>
        public bool IsBookingByPeriod { get; set; }
        public DateTime QueryDate { get; set; }
        public List<RoomScheduleItemDto> Schedules { get; set; } = new();
    }

    // ===================== ROOM STATUS DTOs =====================

    public class UpdateRoomStatusDto
    {
        /// <summary>Available | InUse | Maintenance</summary>
        public string Status { get; set; }
        public string Reason { get; set; }
    }

    // ===================== PERIOD DTOs =====================

    public class PeriodDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }
}
