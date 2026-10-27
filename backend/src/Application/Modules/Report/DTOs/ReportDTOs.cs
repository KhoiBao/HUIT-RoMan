using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Report.DTOs
{
    public class ReportFilterDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? DepartmentId { get; set; }
        public int? RoomId { get; set; }
        public string? Granularity { get; set; } // "day" | "month" | "year"
    }

    public class SystemOverviewReportDto
    {
        // 1. Booking KPIs
        public long TotalBookings { get; set; }
        public long ApprovedBookings { get; set; }
        public long PendingBookings { get; set; }
        public long RejectedBookings { get; set; }
        public long CancelledBookings { get; set; }
        /// <summary>Số đơn bị sinh viên chủ động hủy (CancelSource = STUDENT).</summary>
        public long CancelledByStudent { get; set; }
        /// <summary>Số đơn bị hệ thống tự động hủy do không nhận phòng đúng hạn (CancelSource = AUTO).</summary>
        public long CancelledByNoShow { get; set; }
        /// <summary>Số đơn bị quản trị/nhân sự hủy (CancelSource = STAFF).</summary>
        public long CancelledByStaff { get; set; }
        /// <summary>Số đơn đã hủy nhưng chưa ghi nhận nguồn (đơn cũ trước khi có tính năng).</summary>
        public long CancelledUnknownSource { get; set; }
        public double ApprovalRate { get; set; }

        // 2. Room Usage KPIs
        public int TotalRooms { get; set; }
        public int ActiveRooms { get; set; }
        public long TotalRoomsUsed { get; set; }
        public double TotalUsageHours { get; set; }
        public double AverageSessionHours { get; set; }
        public double OverallOccupancyRate { get; set; }

        // 3. Violation & Discipline KPIs
        public int TotalViolations { get; set; }
        public int ResolvedViolations { get; set; }
        public int PendingViolations { get; set; }
        public int SevereViolations { get; set; }
        public int ActiveBannedUsers { get; set; }

        // 4. Shift & Operation KPIs
        public int TotalShifts { get; set; }
        public int CompletedShifts { get; set; }
        public int TotalShiftLogs { get; set; }
    }

    public class TimeSeriesPointDto
    {
        public string Label { get; set; } = string.Empty;
        public string DateString { get; set; } = string.Empty;
        public long Total { get; set; }
        public long Approved { get; set; }
        public long Rejected { get; set; }
        public long Cancelled { get; set; }
    }

    public class CategoryShareDto
    {
        public string Name { get; set; } = string.Empty;
        public long Count { get; set; }
        public double Percentage { get; set; }
        public string? Color { get; set; }
    }

    public class DepartmentBookingStatDto
    {
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public long TotalBookings { get; set; }
        public long ApprovedBookings { get; set; }
        public double SuccessRate { get; set; }
        public double TotalHoursUsed { get; set; }
    }

    public class BookingStatsReportDto
    {
        public SystemOverviewReportDto Overview { get; set; } = new SystemOverviewReportDto();
        public List<TimeSeriesPointDto> TimeSeries { get; set; } = new List<TimeSeriesPointDto>();
        public List<CategoryShareDto> StatusDistribution { get; set; } = new List<CategoryShareDto>();
        public List<CategoryShareDto> PurposeDistribution { get; set; } = new List<CategoryShareDto>();
        public List<DepartmentBookingStatDto> DepartmentStats { get; set; } = new List<DepartmentBookingStatDto>();
        /// <summary>Thống kê số lượng hủy theo lý do (chỉ tính đơn đã hủy có ghi nhận lý do).</summary>
        public List<CategoryShareDto> CancellationReasonStats { get; set; } = new List<CategoryShareDto>();
    }

    public class RoomPerformanceDto
    {
        public int RoomId { get; set; }
        public string RoomCode { get; set; } = string.Empty;
        public string RoomName { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;
        public string RoomTypeName { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public long TotalBookings { get; set; }
        public long TotalCheckIns { get; set; }
        public double TotalHours { get; set; }
        public double OccupancyRate { get; set; } // % so với thời gian mở cửa thư viện
        public string Status { get; set; } = "Hoạt động";
    }

    public class RoomTypeStatDto
    {
        public int RoomTypeId { get; set; }
        public string RoomTypeName { get; set; } = string.Empty;
        public int RoomCount { get; set; }
        public long TotalSessions { get; set; }
        public double TotalHours { get; set; }
        public double SharePercentage { get; set; }
    }

    public class RoomUsageReportDto
    {
        public int TotalRooms { get; set; }
        public double TotalUsageHours { get; set; }
        public double AverageOccupancyRate { get; set; }
        public List<RoomPerformanceDto> TopRooms { get; set; } = new List<RoomPerformanceDto>();
        public List<RoomTypeStatDto> RoomTypeStats { get; set; } = new List<RoomTypeStatDto>();
        public List<CategoryShareDto> BuildingStats { get; set; } = new List<CategoryShareDto>();
        public int NormalCheckoutCount { get; set; }
        public int IssueCheckoutCount { get; set; }
        public double EquipmentGoodRate { get; set; }
    }

    public class OffenderSummaryDto
    {
        public int UserId { get; set; }
        public string CardCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public int ViolationCount { get; set; }
        public bool HasActiveBan { get; set; }
    }

    public class ActiveBanSummaryDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string CardCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string RestrictionType { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public int RemainingDays { get; set; }
    }

    public class ViolationStatsReportDto
    {
        public int TotalRecords { get; set; }
        public int PendingRecords { get; set; }
        public int ResolvedRecords { get; set; }
        public int ActiveBansCount { get; set; }
        public List<CategoryShareDto> SeverityDistribution { get; set; } = new List<CategoryShareDto>();
        public List<CategoryShareDto> TypeDistribution { get; set; } = new List<CategoryShareDto>();
        public List<OffenderSummaryDto> FrequentOffenders { get; set; } = new List<OffenderSummaryDto>();
        public List<ActiveBanSummaryDto> CurrentActiveBans { get; set; } = new List<ActiveBanSummaryDto>();
    }
}
