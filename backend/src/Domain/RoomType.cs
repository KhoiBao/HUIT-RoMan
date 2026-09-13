using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Loại phòng (VD: Phòng họp, Phòng học nhóm, Hội trường).
    /// </summary>
    [Table("RoomTypes")]
    public class RoomType
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; }

        public string Description { get; set; }
        public int DefaultCapacity { get; set; }
        public string Status { get; set; }

        [ForeignKey("Department")]
        public int? DepartmentId { get; set; }
        public virtual Department Department { get; set; }

        public bool IsBookingByPeriod { get; set; } 

        // Navigation properties
        public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();
        public virtual ICollection<RoomTypeCondition> RoomTypeConditions { get; set; } = new List<RoomTypeCondition>();
    }
}
