using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Đại diện cho một phòng cụ thể.
    [Table("Rooms")]
    public class Room : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string RoomCode { get; set; } = string.Empty;

        [StringLength(50)]
        public string Floor { get; set; } = string.Empty;

        [StringLength(100)]
        public string Building { get; set; } = string.Empty;

        [StringLength(50)]
        public string RoomNumber { get; set; } = string.Empty;

        public int Capacity { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        [ForeignKey("RoomType")]
        public int RoomTypeId { get; set; }
        public virtual RoomType RoomType { get; set; }

        // Navigation properties
        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
        public virtual ICollection<RoomEquipment> RoomEquipments { get; set; } = new List<RoomEquipment>();
    }
}
