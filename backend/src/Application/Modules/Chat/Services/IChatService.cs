using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Chat.DTOs;

namespace HUIT_RoMan.Application.Modules.Chat.Services
{
    public interface IChatService
    {
        Task<ApiResponse<ChatConversationDto>> GetOrCreateActiveConversationAsync(int userId, string? initialMessage = null);
        Task<ApiResponse<ChatConversationDto>> CreateNewConversationAsync(int userId, string? initialMessage = null);
        Task<ApiResponse<List<ChatConversationDto>>> GetConversationsForStaffAsync(string? status = null, string? search = null, int? departmentId = null, string? role = null);
        Task<ApiResponse<ChatConversationDto>> GetConversationByIdAsync(int conversationId, int currentUserId, bool isStaff);
        Task<ApiResponse<ChatMessageDto>> SendMessageAsync(int conversationId, int senderUserId, string content);
        Task<ApiResponse<bool>> CloseConversationAsync(int conversationId, int currentUserId, bool isStaff);
        Task<ApiResponse<bool>> ReopenConversationAsync(int conversationId, int currentUserId, bool isStaff);
        Task<ApiResponse<DeleteMessageResult>> DeleteMessageAsync(int messageId, int currentUserId, string currentUserRole);
        Task<ApiResponse<bool>> DeleteConversationAsync(int conversationId, int currentUserId, string currentUserRole);
        Task<ApiResponse<bool>> MarkMessagesAsReadAsync(int conversationId, int currentUserId);
        Task<ApiResponse<List<OnDutyStaffDto>>> GetOnDutyStaffAsync(int? roomId = null, int? departmentId = null);
    }
}
