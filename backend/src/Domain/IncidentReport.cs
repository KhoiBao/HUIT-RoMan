using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Phiếu báo cáo sự cố & Lịch sử bảo trì:
    /// Theo dõi toàn bộ sự cố thiết bị & phòng học, phân công kỹ thuật,
    /// ghi nhận biên bản xử lý, chi phí và phục hồi phòng hoạt động trên database.
    /// </summary>
    [Table("IncidentReports")]
    public class IncidentReport : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [StringLength(50)]
        public string Code { get; set; } = string.Empty; // Mã phiếu sự cố: #SC-YYYYMMDD-XXX

        [StringLength(50)]
        public string TargetType { get; set; } = "Phòng"; // "Phòng" | "Thiết bị"

        [StringLength(100)]
        public string Category { get; set; } = "Thiết bị hư hỏng"; // "Thiết bị hư hỏng", "Điện / Chiếu sáng / Điều hòa", "Cơ sở vật chất / Bàn ghế", "Vệ sinh sâu", "Khác"

        [StringLength(50)]
        public string Severity { get; set; } = "Khẩn cấp"; // "Khẩn cấp" | "Trung bình" | "Nhẹ"

        public int? EquipmentId { get; set; }

        [StringLength(150)]
        public string? EquipmentName { get; set; }

        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        [StringLength(50)]
        public string Status { get; set; } = "Chờ tiếp nhận"; // "Chờ tiếp nhận" | "Đang bảo trì" | "Đã khắc phục" | "Hủy bỏ" (đồng bộ cùng "Mới", "Đang xử lý", "Đã xử lý")

        public string Description { get; set; } = string.Empty;

        [StringLength(100)]
        public string? ReportedByName { get; set; }

        [StringLength(30)]
        public string? ReporterPhone { get; set; }

        [StringLength(100)]
        public string? AssignedTechnician { get; set; }

        public string? TechnicianNote { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? RepairCost { get; set; }

        [StringLength(500)]
        public string StaffNote { get; set; } = string.Empty;

        [ForeignKey("Room")]
        public int? RoomId { get; set; }
        public virtual Room? Room { get; set; }

        [ForeignKey("BookingDetail")]
        public int? BookingDetailId { get; set; }
        public virtual BookingDetail? BookingDetail { get; set; }

        [ForeignKey("ReportedBy")]
        public int? ReportedByUserId { get; set; }
        public virtual User? ReportedBy { get; set; }

        public int? ResolvedByUserId { get; set; }
        [ForeignKey("ResolvedByUserId")]
        public virtual User? ResolvedBy { get; set; }

        public DateTime ReportedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
