using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Chat.DTOs;
using HUIT_RoMan.Application.Modules.Chat.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IChatService _chatService;
        private readonly ILogger<ChatHub> _logger;

        public const string StaffGroupName = "StaffGroup";

        public ChatHub(IChatService chatService, ILogger<ChatHub> logger)
        {
            _chatService = chatService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            var role = GetUserRole();

            // Nhóm riêng của từng User
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");

            // Nếu là Nhân sự (Employee) hoặc Quản lý (Manager) hoặc Quản trị viên (Admin), thêm vào nhóm trực ban StaffGroup
            if (IsStaffUser())
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, StaffGroupName);
                _logger.LogInformation("Cán bộ/nhân viên trực Id={UserId} ({Role}) đã kết nối SignalR", userId, role);
            }
            else
            {
                _logger.LogInformation("Người dùng Id={UserId} ({Role}) đã kết nối SignalR", userId, role);
            }

            // Báo cho client kết nối thành công kèm thông tin
            await Clients.Caller.SendAsync("ConnectedSuccess", new { UserId = userId, Role = role, ConnectionId = Context.ConnectionId });

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            _logger.LogInformation("Người dùng Id={UserId} ngắt kết nối SignalR", userId);
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Tham gia vào phòng chat của một cuộc hội thoại cụ thể
        /// </summary>
        public async Task JoinConversation(int conversationId)
        {
            var userId = GetUserId();
            var isStaff = IsStaffUser();

            var convCheck = await _chatService.GetConversationByIdAsync(conversationId, userId, isStaff);
            if (!convCheck.Success)
            {
                await Clients.Caller.SendAsync("ErrorMessage", convCheck.Message);
                return;
            }

            var groupName = $"Conversation_{conversationId}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            // Đánh dấu tin nhắn đã đọc
            await _chatService.MarkMessagesAsReadAsync(conversationId, userId);
            await Clients.Group(groupName).SendAsync("MessagesMarkedAsRead", new { ConversationId = conversationId, ReaderUserId = userId });

            await Clients.Caller.SendAsync("JoinedConversation", conversationId);
        }

        /// <summary>
        /// Rời phòng chat của một cuộc hội thoại
        /// </summary>
        public async Task LeaveConversation(int conversationId)
        {
            var groupName = $"Conversation_{conversationId}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        /// <summary>
        /// Gửi tin nhắn realtime
        /// </summary>
        public async Task SendMessage(int conversationId, string content)
        {
            var userId = GetUserId();
            var isStaff = IsStaffUser();

            var sendResult = await _chatService.SendMessageAsync(conversationId, userId, content);
            if (!sendResult.Success)
            {
                await Clients.Caller.SendAsync("ErrorMessage", sendResult.Message);
                return;
            }

            var messageDto = sendResult.Data;
            var groupName = $"Conversation_{conversationId}";

            // Gửi tin nhắn tức thời đến tất cả thành viên trong nhóm hội thoại
            await Clients.Group(groupName).SendAsync("ReceiveMessage", messageDto);

            // Nếu người gửi là Sinh viên/Giảng viên (không phải staff), gửi tín hiệu chuông/thông báo đến toàn bộ nhóm nhân sự trực ban
            if (!isStaff)
            {
                var convRes = await _chatService.GetConversationByIdAsync(conversationId, userId, true);
                await Clients.Group(StaffGroupName).SendAsync("NewSupportMessage", new
                {
                    Conversation = convRes.Data,
                    Message = messageDto
                });
            }
            else
            {
                // Nếu nhân viên gửi, đảm bảo User nhận được cả khi họ chưa bấm mở group
                var convRes = await _chatService.GetConversationByIdAsync(conversationId, userId, true);
                if (convRes.Success && convRes.Data != null)
                {
                    await Clients.Group($"User_{convRes.Data.UserId}").SendAsync("ReceiveMessage", messageDto);
                }
            }
        }

        /// <summary>
        /// Báo trạng thái đang soạn tin (Typing indicator)
        /// </summary>
        public async Task SendTyping(int conversationId, bool isTyping)
        {
            var userId = GetUserId();
            var userName = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Người dùng";
            var isStaff = IsStaffUser();

            var groupName = $"Conversation_{conversationId}";
            await Clients.OthersInGroup(groupName).SendAsync("UserTyping", new
            {
                ConversationId = conversationId,
                UserId = userId,
                UserName = userName,
                IsStaff = isStaff,
                IsTyping = isTyping
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // HELPER PRIVATE METHODS
        // ─────────────────────────────────────────────────────────────────
        private int GetUserId()
        {
            var idClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idClaim, out var id) ? id : 0;
        }

        private string GetUserRole()
        {
            return Context.User?.FindFirst(ClaimTypes.Role)?.Value ?? "User";
        }

        private bool IsStaffUser()
        {
            var role = GetUserRole();
            return role.Equals("Admin", StringComparison.OrdinalIgnoreCase) ||
                   role.Equals("Manager", StringComparison.OrdinalIgnoreCase) ||
                   role.Equals("Employee", StringComparison.OrdinalIgnoreCase);
        }
    }
}
