using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Ghi nhận việc hạn chế quyền của người dùng (VD: Cấm mượn phòng trong 1 tháng).
    /// </summary>
    [Table("UserRestrictions")]
    public class UserRestriction
    {
        [Key]
        public int Id { get; set; }

        [StringLength(100)]
        public string RestrictionType { get; set; } // Loại hạn chế

        public string Reason { get; set; }
        
        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }
    }
}
