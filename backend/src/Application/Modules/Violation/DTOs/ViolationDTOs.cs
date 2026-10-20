using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Violation.DTOs
{
    // ─────────────────────────────────────────────────────────────────
    // Violation Type DTOs
    // ─────────────────────────────────────────────────────────────────

    public class ViolationTypeDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Severity { get; set; }
        public string? DefaultPenalty { get; set; }
        public int RecordCount { get; set; }
    }

    public class CreateViolationTypeDto
    {
        [Required(ErrorMessage = "Mã loại vi phạm không được để trống")]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tên loại vi phạm không được để trống")]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Range(1, 4, ErrorMessage = "Mức độ nghiêm trọng từ 1 (Nhẹ) đến 4 (Rất nghiêm trọng)")]
        public int Severity { get; set; } = 1;

        public string? DefaultPenalty { get; set; }
    }

    public class UpdateViolationTypeDto
    {
        [Required(ErrorMessage = "Tên loại vi phạm không được để trống")]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Range(1, 4, ErrorMessage = "Mức độ nghiêm trọng từ 1 (Nhẹ) đến 4 (Rất nghiêm trọng)")]
        public int Severity { get; set; }

        public string? DefaultPenalty { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────
    // Violation Record DTOs
    // ─────────────────────────────────────────────────────────────────

    public class ViolationRecordDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public DateTime IncidentTime { get; set; }
        public string Description { get; set; } = string.Empty;
        public int Severity { get; set; }
        public string SeverityText { get; set; } = string.Empty;
        public string PenaltyApplied { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "Chờ xử lý", "Đã xử lý", "Đã nộp phạt", "Hủy bỏ"

        // User (Borrower) info
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserFullName { get; set; } = string.Empty;
        public string UserCardCode { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? UserPhoneNumber { get; set; }
        public string? DepartmentName { get; set; }

        // Usage Session / Room info
        public int? UsageSessionId { get; set; }
        public int? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? RoomName { get; set; }

        // Violation Type info
        public int ViolationTypeId { get; set; }
        public string ViolationTypeCode { get; set; } = string.Empty;
        public string ViolationTypeName { get; set; } = string.Empty;

        // Restriction info
        public bool IsRestricted { get; set; }
        public int RestrictDays { get; set; }
        public DateTime? RestrictionEndAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class RecordViolationDto
    {
        [Required(ErrorMessage = "Vui lòng chọn người vi phạm")]
        public int UserId { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn loại vi phạm")]
        public int ViolationTypeId { get; set; }

        public int? UsageSessionId { get; set; }

        public DateTime? IncidentTime { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập mô tả chi tiết sự việc")]
        public string Description { get; set; } = string.Empty;

        [Range(1, 4, ErrorMessage = "Mức độ từ 1 (Nhẹ) đến 4 (Rất nghiêm trọng)")]
        public int Severity { get; set; } = 1;

        [Required(ErrorMessage = "Vui lòng nhập hình thức xử lý / phạt áp dụng")]
        public string PenaltyApplied { get; set; } = string.Empty;

        /// <summary>Số ngày cấm mượn phòng (nếu có; 0 = không cấm)</summary>
        public int RestrictDays { get; set; } = 0;

        public string Status { get; set; } = "Chờ xử lý"; // "Chờ xử lý", "Đã xử lý"
    }

    public class UpdateViolationRecordDto
    {
        public string? Status { get; set; } // "Chờ xử lý", "Đã xử lý", "Đã nộp phạt", "Hủy bỏ"
        public string? PenaltyApplied { get; set; }
        public string? Description { get; set; }
        public int? Severity { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────
    // User Restriction DTOs
    // ─────────────────────────────────────────────────────────────────

    public class UserRestrictionDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserFullName { get; set; } = string.Empty;
        public string UserCardCode { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }

        public string RestrictionType { get; set; } = "Cấm mượn phòng";
        public string Reason { get; set; } = string.Empty;
        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public string Status { get; set; } = "Hoạt động"; // "Hoạt động", "Đã gỡ", "Hết hạn"
        public bool IsActive { get; set; }
        public int? RemainingDays { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateUserRestrictionDto
    {
        [Required(ErrorMessage = "Vui lòng chọn người dùng")]
        public int UserId { get; set; }

        public string RestrictionType { get; set; } = "Cấm mượn phòng";

        [Required(ErrorMessage = "Vui lòng nhập lý do hạn chế")]
        public string Reason { get; set; } = string.Empty;

        [Range(1, 365, ErrorMessage = "Số ngày hạn chế từ 1 đến 365 ngày")]
        public int Days { get; set; } = 7;
    }

    public class LiftRestrictionDto
    {
        public string? Reason { get; set; }
    }

    public class UserEligibilityDto
    {
        public bool IsEligible { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool HasActiveRestriction { get; set; }
        public string? RestrictionType { get; set; }
        public string? Reason { get; set; }
        public DateTime? StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public int? RemainingDays { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────
    // Filter and Stats DTOs
    // ─────────────────────────────────────────────────────────────────

    public class ViolationFilterDto
    {
        public string? Search { get; set; }
        public int? ViolationTypeId { get; set; }
        public int? UserId { get; set; }
        public int? Severity { get; set; }
        public string? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class ViolationStatsDto
    {
        public int TotalRecords { get; set; }
        public int PendingRecords { get; set; }
        public int ResolvedRecords { get; set; }
        public int ActiveRestrictions { get; set; }
        public int SevereRecords { get; set; }
    }

    // ─────────────────────────────────────────────────────────────────
    // Global Search DTOs
    // ─────────────────────────────────────────────────────────────────

    public class GlobalSearchResultDto
    {
        public string Query { get; set; } = string.Empty;
        public List<GlobalSearchRoomItem> Rooms { get; set; } = new();
        public List<GlobalSearchUserItem> Users { get; set; } = new();
        public List<GlobalSearchBookingItem> Bookings { get; set; } = new();
        public List<GlobalSearchViolationItem> Violations { get; set; } = new();
    }

    public class GlobalSearchRoomItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public string Building { get; set; } = string.Empty;
        public string Floor { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? RoomTypeName { get; set; }
    }

    public class GlobalSearchUserItem
    {
        public int Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string CardCode { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public bool HasActiveRestriction { get; set; }
    }

    public class GlobalSearchBookingItem
    {
        public int Id { get; set; }
        public string ActivityName { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string BorrowerName { get; set; } = string.Empty;
        public string BorrowerCode { get; set; } = string.Empty;
        public string RoomsSummary { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
    }

    public class GlobalSearchViolationItem
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string OffenderName { get; set; } = string.Empty;
        public string OffenderCode { get; set; } = string.Empty;
        public string ViolationTypeName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PenaltyApplied { get; set; } = string.Empty;
        public int Severity { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime IncidentTime { get; set; }
    }
}
