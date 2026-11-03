using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Phiếu báo cáo sự cố / hư hỏng: người dùng (sinh viên, giảng viên...) báo
    // các vật dụng bị hư hỏng hoặc sự cố phòng cho nhân viên trong/quá trình sử dụng.
    [Table("IncidentReports")]
    public class IncidentReport : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [StringLength(100)]
        public string Title { get; set; } = string.Empty;

        [StringLength(30)]
        public string Status { get; set; } = "Mới"; // Mới / Đang xử lý / Đã xử lý

        public string Description { get; set; } = string.Empty;

        [StringLength(300)]
        public string StaffNote { get; set; } = string.Empty;

        [ForeignKey("Room")]
        public int RoomId { get; set; }
        public virtual Room Room { get; set; }

        [ForeignKey("BookingDetail")]
        public int? BookingDetailId { get; set; }
        public virtual BookingDetail? BookingDetail { get; set; }

        [ForeignKey("ReportedBy")]
        public int ReportedByUserId { get; set; }
        public virtual User ReportedBy { get; set; }

        public int? ResolvedByUserId { get; set; }
        [ForeignKey("ResolvedByUserId")]
        public virtual User? ResolvedBy { get; set; }

        public DateTime ReportedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
