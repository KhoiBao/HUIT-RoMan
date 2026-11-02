using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Danh mục các loại vi phạm (VD: Trả trễ, Làm hỏng tài sản).
    [Table("ViolationTypes")]
    public class ViolationType : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        public int Severity { get; set; } // Mức độ nghiêm trọng
        public string DefaultPenalty { get; set; } = string.Empty; // Hình phạt mặc định

        // Navigation properties
        public virtual ICollection<ViolationRecord> ViolationRecords { get; set; } = new List<ViolationRecord>();
    }
}
