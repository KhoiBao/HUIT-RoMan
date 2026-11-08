using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Chat.DTOs
{
    public class SendMessageRequest
    {
        public int ConversationId { get; set; }

        [MaxLength(2000, ErrorMessage = "Tin nhắn tối đa 2000 ký tự.")]
        public string Content { get; set; } = string.Empty;
    }

    public class StartChatRequest
    {
        [MaxLength(2000, ErrorMessage = "Tin nhắn tối đa 2000 ký tự.")]
        public string? InitialMessage { get; set; }
        public int? RoomId { get; set; }
    }
}
