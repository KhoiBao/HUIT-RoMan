using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Ghi nhận việc hạn chế quyền của người dùng (VD: Cấm mượn phòng trong 1 tháng).
    [Table("UserRestrictions")]
    public class UserRestriction : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [StringLength(100)]
        public string RestrictionType { get; set; } = string.Empty; // Loại hạn chế

        public string Reason { get; set; } = string.Empty;
        
        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public string Status { get; set; } = string.Empty;

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }
    }
}
