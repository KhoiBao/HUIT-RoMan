using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Common.Interfaces
{
    // ─────────────────────────────────────────────────────────────────────────
    // Result Models (keyless – không ánh xạ trực tiếp vào bảng DB)
    // ─────────────────────────────────────────────────────────────────────────

    public class RoomScheduleResult
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
        public string BookedByUsername { get; set; }
        public string BookedByFullname { get; set; }
    }

    public class AvailableRoomResult
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; }
        public string RoomCode { get; set; }
        public string Building { get; set; }
        public string Floor { get; set; }
        public int Capacity { get; set; }
        public int RoomTypeId { get; set; }
        public string RoomTypeName { get; set; }
        public bool IsBookingByPeriod { get; set; }
    }

    public class BookingSummaryResult
    {
        public long TotalBookings { get; set; }
        public long Approved { get; set; }
        public long Rejected { get; set; }
        public long Pending { get; set; }
        public long Cancelled { get; set; }
        public long TotalRoomsUsed { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Interface
    // ─────────────────────────────────────────────────────────────────────────

    public interface IStoredProcedureService
    {
        /// <summary>
        /// [fn_check_booking_conflict]
        /// Kiểm tra xung đột lịch phòng trong khoảng [startAt, endAt).
        /// Trả về true nếu CÓ xung đột.
        /// </summary>
        Task<bool> CheckBookingConflictAsync(
            int roomId,
            DateTime startAt,
            DateTime endAt,
            int? excludeDetailId = null);

        /// <summary>
        /// [fn_get_room_schedule]
        /// Lấy danh sách booking trong khung thời gian [windowStart, windowEnd).
        /// </summary>
        Task<IEnumerable<RoomScheduleResult>> GetRoomScheduleAsync(
            int roomId,
            DateTime windowStart,
            DateTime windowEnd);

        /// <summary>
        /// [fn_get_available_rooms]
        /// Lấy danh sách phòng còn trống trong khung thời gian.
        /// </summary>
        Task<IEnumerable<AvailableRoomResult>> GetAvailableRoomsAsync(
            DateTime windowStart,
            DateTime windowEnd,
            int? roomTypeId = null,
            int minCapacity = 0);

        /// <summary>
        /// [sp_approve_booking]
        /// Duyệt hoặc từ chối toàn bộ đơn đặt phòng (Booking + tất cả BookingDetail).
        /// </summary>
        Task ApproveBookingAsync(
            int bookingId,
            string decision,
            string? rejectionReason = null);

        /// <summary>
        /// [sp_update_room_status]
        /// Cập nhật trạng thái phòng: Available | InUse | Maintenance.
        /// </summary>
        Task UpdateRoomStatusAsync(
            int roomId,
            string status,
            string? reason = null);

        /// <summary>
        /// [fn_get_booking_summary]
        /// Thống kê tổng hợp đơn đặt phòng theo năm (và tháng tùy chọn).
        /// </summary>
        Task<BookingSummaryResult?> GetBookingSummaryAsync(int year, int? month = null);

        /// <summary>
        /// [sp_record_violation_and_restrict]
        /// Ghi nhận vi phạm & tự động tạo lệnh cấm nếu mức độ nghiêm trọng cao.
        /// </summary>
        Task RecordViolationAndRestrictAsync(
            int userId,
            int violationTypeId,
            int usageSessionId,
            DateTime incidentTime,
            string description,
            int severity,
            string penaltyApplied,
            int restrictDays = 0);

        /// <summary>
        /// [fn_check_user_booking_eligibility]
        /// Kiểm tra quyền mượn phòng của User (Trạng thái và Lệnh cấm).
        /// </summary>
        Task<bool> CheckUserBookingEligibilityAsync(int userId);

        /// <summary>
        /// [sp_process_room_checkout]
        /// Xử lý trả phòng (UsageSession): Checkout, cập nhật trạng thái phòng.
        /// </summary>
        Task ProcessRoomCheckoutAsync(
            int usageSessionId,
            DateTime actualCheckout,
            string roomCondition);
    }
}
