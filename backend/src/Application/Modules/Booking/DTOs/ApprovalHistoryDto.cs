using System;

namespace HUIT_RoMan.Application.Modules.Booking.DTOs
{
    public static class ApprovalStatus
    {
        public const int Approved = 1;          // Đã duyệt
        public const int Rejected = 2;          // Từ chối
        public const int PartiallyApproved = 3; // Duyệt một phần
        public const int CancelledByStaff = 4;  // Hủy bởi quản trị/nhân sự
    }

    public class ApprovalHistoryDto
    {
        public int Id { get; set; }
        public int BookingId { get; set; }
        public int Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string Comment { get; set; } = string.Empty;
        public DateTime DecidedAt { get; set; }
        public int? EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string EmployeePosition { get; set; } = string.Empty;

        /// <summary>Tài khoản đã quyết định (NULL với bản ghi tự động duyệt).</summary>
        public int? ActorUserId { get; set; }

        /// <summary>Tên hiển thị của người quyết định, đã gồm cả trường hợp "Hệ thống".</summary>
        public string ActorName { get; set; } = string.Empty;

        /// <summary>MANUAL | AUTO. NULL với bản ghi cũ.</summary>
        public string? ApprovalMode { get; set; }
    }
}

