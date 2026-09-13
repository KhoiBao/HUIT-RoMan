using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Các điều kiện, quy định sử dụng.
    /// </summary>
    [Table("UsageConditions")]
    public class UsageCondition
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; }

        [StringLength(50)]
        public string Code { get; set; }

        public string Content { get; set; }
        public int Type { get; set; }
        public int Status { get; set; }

        // Navigation properties
        public virtual ICollection<RoomTypeCondition> RoomTypeConditions { get; set; } = new List<RoomTypeCondition>();
    }
}
