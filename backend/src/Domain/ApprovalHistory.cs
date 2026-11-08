using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    //Lịch sử duyệt đơn đặt phòng.

    [Table("ApprovalHistories")]
    public class ApprovalHistory
    {
        [Key]
        public int Id { get; set; }

        public int Status { get; set; }
        public string Comment { get; set; } = string.Empty;

        public DateTime DecidedAt { get; set; } = DateTime.UtcNow;

        
        [ForeignKey("Booking")]
        public int BookingId { get; set; }
        public virtual Booking Booking { get; set; }
     
        [ForeignKey(nameof(Employee))]
        public int? EmployeeId { get; set; }
        public virtual Employee? Employee { get; set; }

        [ForeignKey(nameof(ActorUser))]
        public int? ActorUserId { get; set; }
        public virtual User? ActorUser { get; set; }

        [StringLength(10)]
        public string? ApprovalMode { get; set; }

        // Cấp duyệt cho luồng duyệt nhiều cấp: 1 = cấp 1, 2 = cấp 2.
        // Null với bản ghi duyệt thường (phòng không yêu cầu cấp 2).
        public int? Level { get; set; }
    }
}
