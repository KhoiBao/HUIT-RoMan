using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Cuộc hội thoại hỗ trợ trực tuyến.
    /// </summary>
    [Table("ChatConversations")]
    public class ChatConversation
    {
        [Key]
        public int Id { get; set; }

        public DateTime StartTime { get; set; } = DateTime.UtcNow;
        public DateTime? EndTime { get; set; }
        public string Status { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; } // Người yêu cầu hỗ trợ
        public virtual User User { get; set; }

        // Navigation properties
        public virtual ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    }
}
