using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Chat.DTOs
{
    public class ChatConversationDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserCardCode { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public string? UserRole { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string Status { get; set; } = "Open"; // "Open" | "Closed"
        public string? LastMessageContent { get; set; }
        public DateTime? LastMessageTime { get; set; }
        public int UnreadCount { get; set; }
        public List<ChatMessageDto> Messages { get; set; } = new();
    }
}
