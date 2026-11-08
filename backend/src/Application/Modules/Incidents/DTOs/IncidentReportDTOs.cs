using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Incidents.DTOs
{
    /// <summary>Trạng thái phiếu báo cáo sự cố & bảo trì.</summary>
    public static class IncidentReportStatuses
    {
        public const string Pending = "Chờ tiếp nhận";
        public const string InMaintenance = "Đang bảo trì";
        public const string Resolved = "Đã khắc phục";
        public const string Cancelled = "Hủy bỏ";

        // Tương thích ngược với các phiếu cũ
        public const string New = "Mới";
        public const string Processing = "Đang xử lý";
        public const string Done = "Đã xử lý";

        public static string NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return Pending;
            var s = status.Trim();
            if (string.Equals(s, New, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(s, Pending, StringComparison.OrdinalIgnoreCase))
                return Pending;
            if (string.Equals(s, Processing, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(s, InMaintenance, StringComparison.OrdinalIgnoreCase))
                return InMaintenance;
            if (string.Equals(s, Done, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(s, Resolved, StringComparison.OrdinalIgnoreCase))
                return Resolved;
            if (string.Equals(s, Cancelled, StringComparison.OrdinalIgnoreCase))
                return Cancelled;
            return s;
        }

        public static bool IsPending(string? status)
        {
            var n = NormalizeStatus(status);
            return n == Pending;
        }

        public static bool IsInMaintenance(string? status)
        {
            var n = NormalizeStatus(status);
            return n == InMaintenance;
        }

        public static bool IsResolved(string? status)
        {
            var n = NormalizeStatus(status);
            return n == Resolved;
        }
    }

    public class CreateIncidentReportDto
    {
        public string? TargetType { get; set; } = "Phòng";
        public int? RoomId { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(50)]
        public string? RoomCode { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string? RoomName { get; set; }
        public int? BookingDetailId { get; set; }
        public int? SessionId { get; set; }
        public int? EquipmentId { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string? EquipmentName { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(200)]
        public string? Title { get; set; }
        public string? Category { get; set; } = "Thiết bị hư hỏng";
        public string? Severity { get; set; } = "Khẩn cấp";
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Mô tả sự việc là bắt buộc.")]
        [System.ComponentModel.DataAnnotations.MaxLength(2000, ErrorMessage = "Mô tả sự việc tối đa 2000 ký tự.")]
        public string Description { get; set; } = string.Empty;
        public string? Status { get; set; }
        public string? ReportedBy { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(20)]
        public string? ReporterPhone { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string? AssignedTechnician { get; set; }
        [System.ComponentModel.DataAnnotations.MaxLength(1000, ErrorMessage = "Ghi chú kỹ thuật tối đa 1000 ký tự.")]
        public string? TechnicianNote { get; set; }
        public bool? SetRoomMaintenance { get; set; }
    }

    public class UpdateIncidentReportDto
    {
        public string? Category { get; set; }
        public string? Severity { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
        public string? EquipmentName { get; set; }
        public string? AssignedTechnician { get; set; }
        public string? TechnicianNote { get; set; }
        public decimal? RepairCost { get; set; }
        public string? ResolvedBy { get; set; }
        public string? StaffNote { get; set; }
        public bool? RestoreRoomToAvailable { get; set; }
    }

    public class UpdateIncidentReportStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? StaffNote { get; set; }
    }

    public class ResolveIncidentReportDto
    {
        public string? TechnicianNote { get; set; }
        public decimal? RepairCost { get; set; }
        public string? ResolvedBy { get; set; }
        public bool? RestoreRoomToAvailable { get; set; } = true;
    }

    public class IncidentReportDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string TargetType { get; set; } = "Phòng";
        public int? RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public int? BookingDetailId { get; set; }
        public int? SessionId { get; set; }
        public int? EquipmentId { get; set; }
        public string? EquipmentName { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = "Thiết bị hư hỏng";
        public string Severity { get; set; } = "Khẩn cấp";
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ReportedBy { get; set; } = string.Empty;
        public string? ReporterPhone { get; set; }
        public string? AssignedTechnician { get; set; }
        public string? TechnicianNote { get; set; }
        public decimal? RepairCost { get; set; }
        public string StaffNote { get; set; } = string.Empty;
        public int? ReportedByUserId { get; set; }
        public string ReportedByName { get; set; } = string.Empty;
        public string? ReportedByCode { get; set; }
        public DateTime ReportedAt { get; set; }
        public int? ResolvedByUserId { get; set; }
        public string? ResolvedByName { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class IncidentStatsDto
    {
        public int Total { get; set; }
        public int Pending { get; set; }
        public int InMaintenance { get; set; }
        public int Resolved { get; set; }
        public int Urgent { get; set; }
    }
}
