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

    public class BulkApproveResultDto
    {
        public int ApprovedCount { get; set; }
        public int FailedCount { get; set; }
    }
}
