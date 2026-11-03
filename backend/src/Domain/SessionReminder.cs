using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Ghi nhận nhắc nhở nội quy của cán bộ trực đối với phiên sử dụng.
    /// Áp dụng quy tắc 3 lần nhắc nhở: Nếu vượt quá 3 lần, hệ thống tự động lập biên bản kỷ luật và cấm mượn phòng.
    /// </summary>
    [Table("SessionReminders")]
    public class SessionReminder : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("UsageSession")]
        public int UsageSessionId { get; set; }
        public virtual UsageSession UsageSession { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }

        [ForeignKey("Room")]
        public int RoomId { get; set; }
        public virtual Room Room { get; set; }

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Note { get; set; }

        /// <summary>1 = Nhắc nhẹ, 2 = Cảnh cáo, 3 = Chạm ngưỡng, 4 = Quá 3 lần (Lập biên bản)</summary>
        public int WarningLevel { get; set; } = 1;

        [StringLength(255)]
        public string RemindedByStaff { get; set; } = string.Empty;

        public DateTime RemindedAt { get; set; } = DateTime.UtcNow;

        /// <summary>true nếu lần nhắc này vượt quá 3 lần và đã kích hoạt lập biên bản vi phạm</summary>
        public bool EscalatedToViolation { get; set; } = false;

        [ForeignKey("ViolationRecord")]
        public int? ViolationRecordId { get; set; }
        public virtual ViolationRecord? ViolationRecord { get; set; }
    }
}

