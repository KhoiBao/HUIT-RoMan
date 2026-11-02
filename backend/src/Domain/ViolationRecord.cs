using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Hồ sơ vi phạm của người dùng trong một phiên sử dụng.
    [Table("ViolationRecords")]
    public class ViolationRecord : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [StringLength(50)]
        public string Code { get; set; } = string.Empty; // Mã vi phạm (VD: V001, V002,...)

        public DateTime IncidentTime { get; set; }
        public string Description { get; set; } = string.Empty;
        public int Severity { get; set; }
        public string PenaltyApplied { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }

        [ForeignKey("UsageSession")]
        public int? UsageSessionId { get; set; }
        public virtual UsageSession UsageSession { get; set; }

        [ForeignKey("ViolationType")]
        public int ViolationTypeId { get; set; }
        public virtual ViolationType ViolationType { get; set; }
    }
}
