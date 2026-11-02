using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{

    // Đại diện cho một phòng ban trong hệ thống.
    [Table("Departments")]
    public class Department : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [StringLength(100)]
        public string Type { get; set; } = string.Empty; // Loại phòng ban (VD: Khoa, Phòng thí nghiệm)

        public string Status { get; set; } = string.Empty;

        // Navigation properties
        public virtual ICollection<User> Users { get; set; } = new List<User>();
        public virtual ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    }
}
