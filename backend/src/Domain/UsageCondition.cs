using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Các điều kiện, quy định sử dụng.
    [Table("UsageConditions")]
    public class UsageCondition : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;
        public int Type { get; set; }
        public string Status { get; set; } = string.Empty;

        // Navigation properties
        public virtual ICollection<RoomTypeCondition> RoomTypeConditions { get; set; } = new List<RoomTypeCondition>();
    }
}
