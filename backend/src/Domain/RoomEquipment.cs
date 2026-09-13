using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Liên kết giữa Phòng và Thiết bị (Phòng có những thiết bị gì).
    /// </summary>
    [Table("RoomEquipments")]
    public class RoomEquipment
    {
        [Key, Column(Order = 0)]
        [ForeignKey("Room")]
        public int RoomId { get; set; }
        public virtual Room Room { get; set; }

        [Key, Column(Order = 1)]
        [ForeignKey("Equipment")]
        public int EquipmentId { get; set; }
        public virtual Equipment Equipment { get; set; }

        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;
        public DateTime? RemovedDate { get; set; }
        
        public int Quantity { get; set; }
        public string Status { get; set; }
    }
}
