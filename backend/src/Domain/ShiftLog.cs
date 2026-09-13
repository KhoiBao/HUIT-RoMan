using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Nhật ký hoạt động trong ca làm việc.
    /// </summary>
    [Table("ShiftLogs")]
    public class ShiftLog
    {
        [Key]
        public int Id { get; set; }

        public DateTime LogTime { get; set; } = DateTime.UtcNow;

        [Required]
        public string Content { get; set; }

        public int Type { get; set; }

        [ForeignKey("Employee")]
        public int EmployeeId { get; set; }
        public virtual Employee Employee { get; set; }
    }
}
