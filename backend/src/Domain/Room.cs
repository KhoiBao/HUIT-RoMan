using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Đại diện cho một phòng cụ thể.
    /// </summary>
    [Table("Rooms")]
    public class Room
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; }

        [Required]
        [StringLength(50)]
        public string RoomCode { get; set; }

        [StringLength(50)]
        public string Floor { get; set; }

        [StringLength(100)]
        public string Building { get; set; }

        [StringLength(50)]
        public string RoomNumber { get; set; }

        public int Capacity { get; set; }
        public string Status { get; set; }
        public string Description { get; set; }

        [ForeignKey("RoomType")]
        public int RoomTypeId { get; set; }
        public virtual RoomType RoomType { get; set; }

        // Navigation properties
        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<RoomEquipment> RoomEquipments { get; set; } = new List<RoomEquipment>();
    }
}
