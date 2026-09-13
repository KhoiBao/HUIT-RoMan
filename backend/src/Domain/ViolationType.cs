using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Danh mục các loại vi phạm (VD: Trả trễ, Làm hỏng tài sản).
    /// </summary>
    [Table("ViolationTypes")]
    public class ViolationType
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; }

        public string Description { get; set; }
        public int Severity { get; set; } // Mức độ nghiêm trọng
        public string DefaultPenalty { get; set; } // Hình phạt mặc định

        // Navigation properties
        public virtual ICollection<ViolationRecord> ViolationRecords { get; set; } = new List<ViolationRecord>();
    }
}
