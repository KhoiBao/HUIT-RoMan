using System;

namespace HUIT_RoMan.Application.Modules.Usage.DTOs
{
    public class UsageSessionDto
    {
        public int Id { get; set; }
        public DateTime? ActualCheckIn { get; set; }
        public DateTime? ActualCheckOut { get; set; }
        public string Status { get; set; } = string.Empty;
        public string ConfirmationCode { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        // Người chịu trách nhiệm
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserFullName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? UserPhone { get; set; }
        public string? UserCardCode { get; set; }

        // Thông tin đơn & phòng
        public int BookingDetailId { get; set; }
        public int BookingId { get; set; }
        public string ActivityName { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public int GuestCount { get; set; }
        public int? ActualGuestCount { get; set; }

        public int RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;
        public string RoomStatus { get; set; } = string.Empty;

        // Thời gian theo lịch
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public int? StartPeriodId { get; set; }
        public string? StartPeriodName { get; set; }
        public int? EndPeriodId { get; set; }
        public string? EndPeriodName { get; set; }

        public string? StaffNote { get; set; }
    }

    public class CheckInRequestDto
    {
        public int? UsageSessionId { get; set; }
        public int? BookingDetailId { get; set; }
        public string? ConfirmationCode { get; set; }
        public DateTime? ActualCheckIn { get; set; }
        public int? ActualGuestCount { get; set; }
        public string? StaffNote { get; set; }
        /// <summary>
        /// Dùng nội bộ khi BookingService đã đánh dấu Booking.CheckedInAt rồi ủy quyền
        /// khởi tạo phiên sử dụng cho từng chi tiết (không bỏ qua cửa sổ giờ nhận phòng).
        /// </summary>
        public bool InternalBookingCheckIn { get; set; }
    }

    public class CheckOutRequestDto
    {
        public int UsageSessionId { get; set; }
        public int? BookingDetailId { get; set; }
        public DateTime? ActualCheckOut { get; set; }
        /// <summary>
        /// "Trống" (Sẵn sàng sử dụng) hoặc "Bảo trì" (Phòng/thiết bị có sự cố)
        /// </summary>
        public string RoomCondition { get; set; } = "Trống";
        public string? StaffNote { get; set; }
        public bool DevicesOk { get; set; } = true;
        public bool Cleaned { get; set; } = true;
        public bool LightsOff { get; set; } = true;
    }

    public class UsageSessionQueryDto
    {
        public string? Status { get; set; } // "ALL", "Chờ nhận phòng", "Đang sử dụng", "Hoàn thành", "Đã hủy"
        public int? RoomId { get; set; }
        public DateTime? Date { get; set; }
        public string? Search { get; set; }
    }

    public class UsageSummaryDto
    {
        public int TotalToday { get; set; }
        public int InUseCount { get; set; }
        public int PendingCheckInCount { get; set; }
        public int CompletedCount { get; set; }
        public int CancelledCount { get; set; }
    }
}
