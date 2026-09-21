using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Trang thiết bị trong thư viện.
    /// </summary>
    [Table("Equipments")]
    public class Equipment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; }

        public DateTime? PurchaseDate { get; set; }
        public string Status { get; set; }
        public string Description { get; set; }

        [ForeignKey("EquipmentCategory")]
        public int EquipmentCategoryId { get; set; }
        public virtual EquipmentCategory EquipmentCategory { get; set; }

        // Navigation properties
        public virtual ICollection<RoomEquipment> RoomEquipments { get; set; } = new List<RoomEquipment>();
        public virtual ICollection<EquipmentConditionLog> EquipmentConditionLogs { get; set; } = new List<EquipmentConditionLog>();
        public virtual ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();
    }
}
