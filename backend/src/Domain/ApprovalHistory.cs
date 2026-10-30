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

        /// <summary>Hồ sơ nhân sự của người quyết định. NULL khi tài khoản không có hồ sơ nhân sự.</summary>
        [ForeignKey(nameof(Employee))]
        public int? EmployeeId { get; set; }
        public virtual Employee? Employee { get; set; }

        /// <summary>Tài khoản đã quyết định. NULL với bản ghi tự động duyệt.</summary>
        [ForeignKey(nameof(ActorUser))]
        public int? ActorUserId { get; set; }
        public virtual User? ActorUser { get; set; }

        /// <summary>MANUAL (người thật) | AUTO (chế độ tự động duyệt).</summary>
        [StringLength(10)]
        public string? ApprovalMode { get; set; }
    }
}
