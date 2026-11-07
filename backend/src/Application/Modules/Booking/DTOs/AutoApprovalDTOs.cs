using System;

namespace HUIT_RoMan.Application.Modules.Booking.DTOs
{
    /// <summary>Trạng thái chế độ tự động duyệt đơn đặt phòng.</summary>
    public class AutoApprovalSettingDto
    {
        public bool Enabled { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedByName { get; set; }
        public int PendingCount { get; set; }
    }

    public class UpdateAutoApprovalSettingDto
    {
        public bool Enabled { get; set; }
    }

    public class BulkApproveItemFailureDto
    {
        public int BookingId { get; set; }
        public string ActivityName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }

    public class BulkApproveResultDto
    {
        public int ApprovedCount { get; set; }
        public int FailedCount { get; set; }
        public System.Collections.Generic.List<BulkApproveItemFailureDto> Failures { get; set; } = new();
    }

    public class BulkRejectPendingRequestDto
    {
        public string? Reason { get; set; }
    }

    public class BulkRejectResultDto
    {
        public int RejectedCount { get; set; }
        public int FailedCount { get; set; }
        public System.Collections.Generic.List<BulkApproveItemFailureDto> Failures { get; set; } = new();
    }

    public class BulkCancelBookingsRequestDto
    {
        public System.Collections.Generic.List<int> BookingIds { get; set; } = new();
        public string? Reason { get; set; }
    }

    public class BulkCancelResultDto
    {
        public int CancelledCount { get; set; }
        public int FailedCount { get; set; }
        public System.Collections.Generic.List<BulkApproveItemFailureDto> Failures { get; set; } = new();
    }

    public class BulkApproveBookingsRequestDto
    {
        public System.Collections.Generic.List<int> BookingIds { get; set; } = new();
    }
}
