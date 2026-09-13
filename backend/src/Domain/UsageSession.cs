using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Phiên sử dụng phòng thực tế.
    /// </summary>
    [Table("UsageSessions")]
    public class UsageSession
    {
        [Key]
        public int Id { get; set; }

        public DateTime? ActualCheckIn { get; set; }
        public DateTime? ActualCheckOut { get; set; }
        
        public int Status { get; set; }
        
        [StringLength(50)]
        public string ConfirmationCode { get; set; } // Mã xác nhận nhận phòng

        [ForeignKey("User")]
        public int UserId { get; set; } // Người chịu trách nhiệm phiên
        public virtual User User { get; set; }

        [ForeignKey("BookingDetail")]
        public int BookingDetailId { get; set; }
        public virtual BookingDetail BookingDetail { get; set; }

        // Navigation properties
        public virtual ICollection<ViolationRecord> ViolationRecords { get; set; } = new List<ViolationRecord>();
        public virtual ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();
        public virtual ICollection<EquipmentConditionLog> EquipmentConditionLogs { get; set; } = new List<EquipmentConditionLog>();
    }
}
