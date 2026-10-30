using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HUIT_RoMan.API.Hubs;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Chat.DTOs;
using HUIT_RoMan.Application.Modules.Chat.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly ICurrentUserService _currentUser;
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatController(
            IChatService chatService,
            ICurrentUserService currentUser,
            IHubContext<ChatHub> hubContext)
        {
            _chatService = chatService;
            _currentUser = currentUser;
            _hubContext = hubContext;
        }

        private bool IsStaffRole()
        {
            if (_currentUser.IsAdmin || _currentUser.IsManager || _currentUser.IsStaff) return true;
            var role = (_currentUser.Role ?? "").Trim().ToLower();
            return role == "admin" || role == "quan-tri" || role == "quản trị viên" ||
                   role == "manager" || role == "quan-ly" || role == "quản lý" || role == "departmentmanager" ||
                   role == "employee" || role == "nhan-vien" || role == "nhân viên" || role == "thủ thư";
        }

        /// <summary>
        /// Lấy hoặc khởi tạo cuộc hội thoại hỗ trợ đang hoạt động của người dùng hiện tại
        /// </summary>
        [HttpGet("my-active")]
        [Authorize]
        public async Task<IActionResult> GetMyActiveConversation([FromQuery] string? initialMessage)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            int userId = _currentUser.UserId.Value;

            var res = await _chatService.GetOrCreateActiveConversationAsync(userId, initialMessage);
            return res.Success ? Ok(res) : BadRequest(res);
        }

        /// <summary>
        /// Khởi tạo một phiên trò chuyện mới (đóng phiên cũ nếu có)
        /// </summary>
        [HttpPost("new-conversation")]
        [Authorize]
        public async Task<IActionResult> StartNewConversation([FromBody] StartChatRequest? request)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            int userId = _currentUser.UserId.Value;

            var res = await _chatService.CreateNewConversationAsync(userId, request?.InitialMessage);
            return res.Success ? Ok(res) : BadRequest(res);
        }

        /// <summary>
        /// Dành cho Nhân viên trực / Quản lý / Admin: Danh sách các cuộc hội thoại hỗ trợ
        /// </summary>
        [HttpGet("staff/conversations")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetStaffConversations([FromQuery] string? status, [FromQuery] string? search)
        {
            var res = await _chatService.GetConversationsForStaffAsync(status, search, _currentUser.DepartmentId, _currentUser.Role);
            return res.Success ? Ok(res) : BadRequest(res);
        }

        /// <summary>
        /// Chi tiết cuộc trò chuyện và lịch sử tin nhắn
        /// </summary>
        [HttpGet("conversations/{id}")]
        [Authorize]
        public async Task<IActionResult> GetConversationById(int id)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            int userId = _currentUser.UserId.Value;
            var isStaff = IsStaffRole();

            var res = await _chatService.GetConversationByIdAsync(id, userId, isStaff);
            return res.Success ? Ok(res) : BadRequest(res);
        }

        /// <summary>
        /// Gửi tin nhắn qua REST API (tự động broadcast realtime qua SignalR)
        /// </summary>
        [HttpPost("send")]
        [Authorize]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            int userId = _currentUser.UserId.Value;
            var isStaff = IsStaffRole();

            var res = await _chatService.SendMessageAsync(request.ConversationId, userId, request.Content);
            if (!res.Success)
            {
                return BadRequest(res);
            }

            var messageDto = res.Data;
            var groupName = $"Conversation_{request.ConversationId}";

            // Broadcast qua SignalR đến nhóm hội thoại
            await _hubContext.Clients.Group(groupName).SendAsync("ReceiveMessage", messageDto);

            // Báo chuông cho nhóm trực ban nếu người gửi là sinh viên/giảng viên
            if (!isStaff)
            {
                var convRes = await _chatService.GetConversationByIdAsync(request.ConversationId, userId, true);
                await _hubContext.Clients.Group(ChatHub.StaffGroupName).SendAsync("NewSupportMessage", new
                {
                    Conversation = convRes.Data,
                    Message = messageDto
                });
            }
            else
            {
                var convRes = await _chatService.GetConversationByIdAsync(request.ConversationId, userId, true);
                if (convRes.Success && convRes.Data != null)
                {
                    await _hubContext.Clients.Group($"User_{convRes.Data.UserId}").SendAsync("ReceiveMessage", messageDto);
                }
            }

            return Ok(res);
        }

        /// <summary>
        /// Đóng cuộc hội thoại khi hỗ trợ hoàn tất
        /// </summary>
        [HttpPost("conversations/{id}/close")]
        [Authorize]
        public async Task<IActionResult> CloseConversation(int id)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            int userId = _currentUser.UserId.Value;
            var isStaff = IsStaffRole();

            var res = await _chatService.CloseConversationAsync(id, userId, isStaff);
            if (res.Success)
            {
                var groupName = $"Conversation_{id}";
                await _hubContext.Clients.Group(groupName).SendAsync("ConversationClosed", new { ConversationId = id, ClosedBy = userId });
            }
            return res.Success ? Ok(res) : BadRequest(res);
        }

        /// <summary>
        /// Mở lại cuộc trò chuyện đã đóng (Dành cho Cán bộ trực / Quản lý / Admin)
        /// </summary>
        [HttpPost("conversations/{id}/reopen")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> ReopenConversation(int id)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            int userId = _currentUser.UserId.Value;
            var isStaff = IsStaffRole();

            var res = await _chatService.ReopenConversationAsync(id, userId, isStaff);
            if (res.Success)
            {
                var groupName = $"Conversation_{id}";
                await _hubContext.Clients.Group(groupName).SendAsync("ConversationReopened", new { ConversationId = id, ReopenedBy = userId });
            }
            return res.Success ? Ok(res) : BadRequest(res);
        }

        /// <summary>
        /// Xoá toàn bộ cuộc trò chuyện (Dành cho Quản trị viên, Quản lý đơn vị hoặc Nhân viên phụ trách)
        /// </summary>
        [HttpDelete("conversations/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteConversation(int id)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            if (!IsStaffRole())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<bool>.ErrorResponse("Bạn không có quyền xóa cuộc hội thoại. Quyền này dành cho Cán bộ / Quản trị viên."));
            }

            int userId = _currentUser.UserId.Value;
            string role = _currentUser.Role ?? "User";

            var res = await _chatService.DeleteConversationAsync(id, userId, role);
            if (!res.Success)
            {
                return BadRequest(res);
            }

            var groupName = $"Conversation_{id}";
            await _hubContext.Clients.Group(groupName).SendAsync("ConversationDeleted", new { ConversationId = id });
            await _hubContext.Clients.Group(ChatHub.StaffGroupName).SendAsync("ConversationDeleted", new { ConversationId = id });

            return Ok(res);
        }

        /// <summary>
        /// Xoá tin nhắn (Dành cho Quản trị viên, Quản lý đơn vị hoặc Nhân viên phụ trách)
        /// </summary>
        [HttpDelete("messages/{messageId}")]
        [Authorize]
        public async Task<IActionResult> DeleteMessage(int messageId)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            if (!IsStaffRole())
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    ApiResponse<DeleteMessageResult>.ErrorResponse("Bạn không có quyền xóa tin nhắn."));
            }

            int userId = _currentUser.UserId.Value;
            string role = _currentUser.Role ?? "User";

            var res = await _chatService.DeleteMessageAsync(messageId, userId, role);
            if (!res.Success)
            {
                return BadRequest(res);
            }

            var groupName = $"Conversation_{res.Data.ConversationId}";
            await _hubContext.Clients.Group(groupName).SendAsync("MessageDeleted", new { MessageId = messageId, ConversationId = res.Data.ConversationId });
            await _hubContext.Clients.Group(ChatHub.StaffGroupName).SendAsync("MessageDeleted", new { MessageId = messageId, ConversationId = res.Data.ConversationId });

            return Ok(res);
        }

        /// <summary>
        /// Đánh dấu tất cả tin nhắn trong hội thoại là đã đọc
        /// </summary>
        [HttpPost("conversations/{id}/read")]
        [Authorize]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            if (!_currentUser.UserId.HasValue || _currentUser.UserId.Value <= 0) return Unauthorized();
            int userId = _currentUser.UserId.Value;

            var res = await _chatService.MarkMessagesAsReadAsync(id, userId);
            if (res.Success)
            {
                var groupName = $"Conversation_{id}";
                await _hubContext.Clients.Group(groupName).SendAsync("MessagesMarkedAsRead", new { ConversationId = id, ReaderUserId = userId });
            }
            return res.Success ? Ok(res) : BadRequest(res);
        }

        /// <summary>
        /// Lấy danh sách cán bộ / quản lý đang trong ca trực hôm nay (có thể lọc theo phòng hoặc đơn vị)
        /// </summary>
        [HttpGet("on-duty-staff")]
        public async Task<IActionResult> GetOnDutyStaff([FromQuery] int? roomId, [FromQuery] int? departmentId)
        {
            var res = await _chatService.GetOnDutyStaffAsync(roomId, departmentId);
            return res.Success ? Ok(res) : BadRequest(res);
        }
    }
}
