using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Danh mục trang thiết bị.
    [Table("EquipmentCategories")]
    public class EquipmentCategory : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        // Navigation properties
        public virtual ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
    }
}
