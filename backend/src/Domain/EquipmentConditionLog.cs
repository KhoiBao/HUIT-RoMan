using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Nhật ký tình trạng thiết bị trước và sau khi sử dụng.
    [Table("EquipmentConditionLogs")]
    public class EquipmentConditionLog : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        public string ConditionBefore { get; set; } = string.Empty;
        public string ConditionAfter { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UsageSession")]
        public int UsageSessionId { get; set; }
        public virtual UsageSession UsageSession { get; set; }

        [ForeignKey("Equipment")]
        public int EquipmentId { get; set; }
        public virtual Equipment Equipment { get; set; }
    }
}
