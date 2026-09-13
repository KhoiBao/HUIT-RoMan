using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Đại diện cho nhân viên quản lý hoặc vận hành.
    /// </summary>
    [Table("Employees")]
    public class Employee
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } // Mã nhân viên

        [StringLength(100)]
        public string Position { get; set; } // Chức vụ

        public DateTime? HireDate { get; set; }
        public string Status { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }

        // Navigation properties
        public virtual ICollection<ShiftLog> ShiftLogs { get; set; } = new List<ShiftLog>();
        public virtual ICollection<Shift> Shifts { get; set; } = new List<Shift>();
        public virtual ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = new List<MaintenanceRecord>();
    }
}
