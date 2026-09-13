using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Tin nhắn trong một cuộc hội thoại.
    /// </summary>
    [Table("ChatMessages")]
    public class ChatMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Content { get; set; }

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;

        [ForeignKey("ChatConversation")]
        public int ChatConversationId { get; set; }
        public virtual ChatConversation ChatConversation { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; } // Người gửi tin nhắn (có thể là User hoặc Employee)
        public virtual User User { get; set; }
    }
}
