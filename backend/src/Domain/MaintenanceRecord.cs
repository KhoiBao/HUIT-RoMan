using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Hồ sơ bảo trì thiết bị.
    /// </summary>
    [Table("MaintenanceRecords")]
    public class MaintenanceRecord
    {
        [Key]
        public int Id { get; set; }

        [StringLength(100)]
        public string IssueType { get; set; }

        public string IssueDescription { get; set; }
        public DateTime DetectedDate { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? CompletionDate { get; set; }
        public int Status { get; set; }

        [ForeignKey("Equipment")]
        public int EquipmentId { get; set; }
        public virtual Equipment Equipment { get; set; }

        [ForeignKey("Employee")]
        public int EmployeeId { get; set; }
        public virtual Employee Employee { get; set; }
    }
}
