using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// Đánh giá, phản hồi sau khi sử dụng phòng.
    [Table("Feedbacks")]
    public class Feedback : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        public int Rating { get; set; } // Số sao (1-5)
        public string Comment { get; set; } = string.Empty;

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }

        [ForeignKey("UsageSession")]
        public int UsageSessionId { get; set; }
        public virtual UsageSession UsageSession { get; set; }
    }
}
