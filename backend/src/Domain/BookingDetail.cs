using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Chi tiết đặt phòng (đặt phòng nào, thời gian nào).
    /// </summary>
    [Table("BookingDetails")]
    public class BookingDetail
    {
        [Key]
        public int Id { get; set; }

        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        
        public int GuestCount { get; set; }
        public string Purpose { get; set; }
        public int Status { get; set; }
        public string RejectionReason { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("Booking")]
        public int BookingId { get; set; }
        public virtual Booking Booking { get; set; }

        [ForeignKey("Room")]
        public int RoomId { get; set; }
        public virtual Room Room { get; set; }

        // Navigation properties
        public virtual ICollection<UsageSession> UsageSessions { get; set; } = new List<UsageSession>();
    }
}
