using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Incidents.DTOs
{
    /// <summary>Trạng thái phiếu báo cáo sự cố / hư hỏng.</summary>
    public static class IncidentReportStatuses
    {
        public const string New = "Mới";
        public const string Processing = "Đang xử lý";
        public const string Resolved = "Đã xử lý";

        public static readonly IReadOnlyDictionary<string, string> Labels = new Dictionary<string, string>
        {
            [New] = "Mới",
            [Processing] = "Đang xử lý",
            [Resolved] = "Đã xử lý"
        };
    }

    public class CreateIncidentReportDto
    {
        public int RoomId { get; set; }

        /// <summary>Liên kết phòng đã dùng (nếu báo trong/khi kết thúc lần sử dụng).</summary>
        public int? BookingDetailId { get; set; }

        /// <summary>Hiện tượng gặp phải (vd: "Máy chiếu không lên hình").</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Mô tả chi tiết sự cố / vật dụng hư hỏng.</summary>
        public string Description { get; set; } = string.Empty;
    }

    public class UpdateIncidentReportStatusDto
    {
        /// <summary>Mới / Đang xử lý / Đã xử lý.</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>Ghi chú của nhân sự khi xử lý.</summary>
        public string? StaffNote { get; set; }
    }

    public class IncidentReportDto
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public int? BookingDetailId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string StaffNote { get; set; } = string.Empty;
        public int ReportedByUserId { get; set; }
        public string ReportedByName { get; set; } = string.Empty;
        public string? ReportedByCode { get; set; }
        public DateTime ReportedAt { get; set; }
        public int? ResolvedByUserId { get; set; }
        public string? ResolvedByName { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}

