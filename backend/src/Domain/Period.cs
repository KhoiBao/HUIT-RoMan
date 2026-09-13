using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Danh mục các Tiết học (VD: Tiết 1, Tiết 2).
    /// Dùng cho các loại phòng mượn theo tiết học cố định (VD: Phòng Lý Thuyết, Phòng Thực Hành).
    /// </summary>
    [Table("Periods")]
    public class Period
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Name { get; set; } // Ví dụ: "Tiết 1", "Tiết 2"

        public TimeSpan StartTime { get; set; } // Giờ bắt đầu, VD: 07:00:00
        public TimeSpan EndTime { get; set; }   // Giờ kết thúc, VD: 07:45:00
    }
}

