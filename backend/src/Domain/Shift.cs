using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Đại diện cho ca làm việc của nhân viên.
    [Table("Shifts")]
    public class Shift : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string Status { get; set; } = string.Empty;

        // Navigation properties
        public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
    }
}
