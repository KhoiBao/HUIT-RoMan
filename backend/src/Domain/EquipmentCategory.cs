using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Danh mục trang thiết bị.
    /// </summary>
    [Table("EquipmentCategories")]
    public class EquipmentCategory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; }

        public string Description { get; set; }

        // Navigation properties
        public virtual ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
    }
}
