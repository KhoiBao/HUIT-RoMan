namespace HUIT_RoMan.Application.Modules.Chat.DTOs
{
    public class SendMessageRequest
    {
        public int ConversationId { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    public class StartChatRequest
    {
        public string? InitialMessage { get; set; }
        public int? RoomId { get; set; }
    }
}
