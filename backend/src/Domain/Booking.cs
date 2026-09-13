using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Đơn đặt phòng tổng thể.
    /// </summary>
    [Table("Bookings")]
    public class Booking
    {
        [Key]
        public int Id { get; set; }

        [StringLength(255)]
        public string ActivityName { get; set; } // Tên hoạt động

        public string Purpose { get; set; } // Mục đích mượn
        
        public int GuestCount { get; set; } // Số lượng khách dự kiến

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        
        public string Status { get; set; } // Trạng thái đơn (Chờ duyệt, Đã duyệt, Đã hủy,...)
        
        public string RejectionReason { get; set; }
        
        public string Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }

        // Navigation properties
        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
    }
}
