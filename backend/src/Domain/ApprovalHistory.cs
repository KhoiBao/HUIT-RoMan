using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Lịch sử duyệt đơn đặt phòng.
    /// </summary>
    [Table("ApprovalHistories")]
    public class ApprovalHistory
    {
        [Key]
        public int Id { get; set; }

        public int Status { get; set; }
        public string Comment { get; set; }
        
        public DateTime DecidedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("Booking")]
        public int BookingId { get; set; }
        public virtual Booking Booking { get; set; }

        [ForeignKey("Employee")]
        public int EmployeeId { get; set; }
        public virtual Employee Employee { get; set; }
    }
}
