using System;

namespace HUIT_RoMan.Application.Modules.Chat.DTOs
{
    public class ChatMessageDto
    {
        public int Id { get; set; }
        public int ChatConversationId { get; set; }
        public int UserId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string SenderCardCode { get; set; } = string.Empty;
        public string SenderRole { get; set; } = string.Empty;
        public bool IsFromStaff { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public bool IsRead { get; set; }
    }

    public class DeleteMessageResult
    {
        public int MessageId { get; set; }
        public int ConversationId { get; set; }
    }
}
