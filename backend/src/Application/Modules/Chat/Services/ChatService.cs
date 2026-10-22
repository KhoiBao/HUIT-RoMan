using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Chat.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Chat.Services
{
    public class ChatService : IChatService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<ChatConversation> _conversationRepo;
        private readonly IRepository<ChatMessage> _messageRepo;
        private readonly IRepository<Domain.Entities.Shift> _shiftRepo;
        private readonly IRepository<Employee> _employeeRepo;
        private readonly UserManager<User> _userManager;

        public ChatService(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager)
        {
            _unitOfWork = unitOfWork;
            _conversationRepo = _unitOfWork.Repository<ChatConversation>();
            _messageRepo = _unitOfWork.Repository<ChatMessage>();
            _shiftRepo = _unitOfWork.Repository<Domain.Entities.Shift>();
            _employeeRepo = _unitOfWork.Repository<Employee>();
            _userManager = userManager;
        }

        // ─────────────────────────────────────────────────────────────────
        // 1. GET OR CREATE ACTIVE CONVERSATION FOR USER
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ChatConversationDto>> GetOrCreateActiveConversationAsync(int userId, string? initialMessage = null)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return ApiResponse<ChatConversationDto>.ErrorResponse("Người dùng không tồn tại.");
            }

            var conversations = await _conversationRepo.FindAsync(
                c => c.UserId == userId && c.Status == "Open",
                c => c.User,
                c => c.User.Department,
                c => c.ChatMessages
            );

            var activeConversation = conversations.OrderByDescending(c => c.StartTime).FirstOrDefault();

            if (activeConversation == null)
            {
                activeConversation = new ChatConversation
                {
                    UserId = userId,
                    StartTime = DateTime.UtcNow,
                    Status = "Open"
                };

                await _conversationRepo.AddAsync(activeConversation);
                await _unitOfWork.SaveChangesAsync();

                if (!string.IsNullOrWhiteSpace(initialMessage))
                {
                    var msg = new ChatMessage
                    {
                        ChatConversationId = activeConversation.Id,
                        UserId = userId,
                        Content = initialMessage.Trim(),
                        SentAt = DateTime.UtcNow,
                        IsRead = false
                    };
                    await _messageRepo.AddAsync(msg);
                    await _unitOfWork.SaveChangesAsync();
                }

                // Re-fetch with messages
                activeConversation = (await _conversationRepo.FindAsync(
                    c => c.Id == activeConversation.Id,
                    c => c.User,
                    c => c.User.Department,
                    c => c.ChatMessages
                )).FirstOrDefault();
            }

            var dto = await MapConversationDtoAsync(activeConversation!);
            return ApiResponse<ChatConversationDto>.SuccessResponse(dto);
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. GET CONVERSATIONS FOR STAFF / LIBRARIAN
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<List<ChatConversationDto>>> GetConversationsForStaffAsync(string? status = null, string? search = null)
        {
            var conversations = await _conversationRepo.GetAllAsync(
                c => c.User,
                c => c.User.Department,
                c => c.ChatMessages
            );

            var query = conversations.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(c => string.Equals(c.Status, status, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c =>
                    (c.User != null && (
                        (c.User.FullName != null && c.User.FullName.ToLower().Contains(s)) ||
                        (c.User.CardCode != null && c.User.CardCode.ToLower().Contains(s)) ||
                        (c.User.Email != null && c.User.Email.ToLower().Contains(s))
                    ))
                );
            }

            // Sắp xếp theo tin nhắn mới nhất
            var sorted = query
                .OrderByDescending(c => c.ChatMessages.Any() ? c.ChatMessages.Max(m => m.SentAt) : c.StartTime)
                .ToList();

            var dtos = new List<ChatConversationDto>();
            foreach (var conv in sorted)
            {
                dtos.Add(await MapConversationDtoAsync(conv));
            }

            return ApiResponse<List<ChatConversationDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // 3. GET CONVERSATION BY ID
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ChatConversationDto>> GetConversationByIdAsync(int conversationId, int currentUserId, bool isStaff)
        {
            var conversations = await _conversationRepo.FindAsync(
                c => c.Id == conversationId,
                c => c.User,
                c => c.User.Department,
                c => c.ChatMessages
            );

            var conv = conversations.FirstOrDefault();
            if (conv == null)
            {
                return ApiResponse<ChatConversationDto>.ErrorResponse("Không tìm thấy cuộc hội thoại.");
            }

            if (!isStaff && conv.UserId != currentUserId)
            {
                return ApiResponse<ChatConversationDto>.ErrorResponse("Bạn không có quyền truy cập cuộc trò chuyện này.");
            }

            var dto = await MapConversationDtoAsync(conv);
            return ApiResponse<ChatConversationDto>.SuccessResponse(dto);
        }

        // ─────────────────────────────────────────────────────────────────
        // 4. SEND MESSAGE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ChatMessageDto>> SendMessageAsync(int conversationId, int senderUserId, string content)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                return ApiResponse<ChatMessageDto>.ErrorResponse("Nội dung tin nhắn không được rỗng.");
            }

            var conversations = await _conversationRepo.FindAsync(
                c => c.Id == conversationId,
                c => c.User
            );
            var conv = conversations.FirstOrDefault();
            if (conv == null)
            {
                return ApiResponse<ChatMessageDto>.ErrorResponse("Không tìm thấy cuộc hội thoại.");
            }

            // Nếu cuộc trò chuyện đang đóng thì tự động mở lại khi có tin nhắn mới
            if (conv.Status == "Closed")
            {
                conv.Status = "Open";
                conv.EndTime = null;
                _conversationRepo.Update(conv);
            }

            var message = new ChatMessage
            {
                ChatConversationId = conversationId,
                UserId = senderUserId,
                Content = content.Trim(),
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            await _messageRepo.AddAsync(message);
            await _unitOfWork.SaveChangesAsync();

            var senderUser = await _userManager.FindByIdAsync(senderUserId.ToString());
            var roles = senderUser != null ? await _userManager.GetRolesAsync(senderUser) : new List<string>();
            var isStaff = roles.Any(r => r.Equals("Admin", StringComparison.OrdinalIgnoreCase) ||
                                         r.Equals("Employee", StringComparison.OrdinalIgnoreCase));

            var dto = new ChatMessageDto
            {
                Id = message.Id,
                ChatConversationId = conversationId,
                UserId = senderUserId,
                SenderName = senderUser?.FullName ?? "Người dùng",
                SenderCardCode = senderUser?.CardCode ?? "",
                SenderRole = roles.FirstOrDefault() ?? "User",
                IsFromStaff = isStaff,
                Content = message.Content,
                SentAt = message.SentAt,
                IsRead = message.IsRead
            };

            return ApiResponse<ChatMessageDto>.SuccessResponse(dto);
        }

        // ─────────────────────────────────────────────────────────────────
        // 5. CLOSE CONVERSATION
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> CloseConversationAsync(int conversationId, int currentUserId, bool isStaff)
        {
            var conv = await _conversationRepo.GetByIdAsync(conversationId);
            if (conv == null)
            {
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy cuộc hội thoại.");
            }

            if (!isStaff && conv.UserId != currentUserId)
            {
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền kết thúc cuộc trò chuyện này.");
            }

            conv.Status = "Closed";
            conv.EndTime = DateTime.UtcNow;
            _conversationRepo.Update(conv);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Đã đóng cuộc hội thoại.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 6. MARK MESSAGES AS READ
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> MarkMessagesAsReadAsync(int conversationId, int currentUserId)
        {
            var messages = await _messageRepo.FindAsync(
                m => m.ChatConversationId == conversationId && m.UserId != currentUserId && !m.IsRead
            );

            bool changed = false;
            foreach (var m in messages)
            {
                m.IsRead = true;
                _messageRepo.Update(m);
                changed = true;
            }

            if (changed)
            {
                await _unitOfWork.SaveChangesAsync();
            }

            return ApiResponse<bool>.SuccessResponse(true);
        }

        // ─────────────────────────────────────────────────────────────────
        // 7. GET ON-DUTY STAFF
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<List<OnDutyStaffDto>>> GetOnDutyStaffAsync()
        {
            var nowUtc = DateTime.UtcNow;
            var vnTime = nowUtc.AddHours(7); // Giờ Việt Nam (UTC+7)
            var today = vnTime.Date;
            var currentTime = vnTime.TimeOfDay;

            var shifts = await _shiftRepo.GetAllAsync(s => s.Employees);
            var todayShifts = shifts
                .Where(s => s.Date.Date == today && s.Status != "Hủy")
                .ToList();

            var result = new List<OnDutyStaffDto>();

            var allEmployees = await _employeeRepo.GetAllAsync(
                e => e.User,
                e => e.User.Department
            );
            var employeeDict = allEmployees.ToDictionary(e => e.Id);

            foreach (var shift in todayShifts)
            {
                bool isActive = (shift.StartTime <= currentTime && currentTime <= shift.EndTime) || shift.Status == "Đang trực";

                foreach (var empSummary in shift.Employees)
                {
                    if (employeeDict.TryGetValue(empSummary.Id, out var emp) && emp.User != null)
                    {
                        result.Add(new OnDutyStaffDto
                        {
                            EmployeeId = emp.Id,
                            UserId = emp.UserId,
                            Code = emp.Code,
                            FullName = emp.User.FullName,
                            Position = emp.Position ?? "Thủ thư trực ban",
                            DepartmentName = emp.User.Department?.Name ?? "Thư viện HUIT",
                            ShiftName = shift.Name ?? "Ca trực thư viện",
                            ShiftTimeRange = $"{shift.StartTime:hh\\:mm} - {shift.EndTime:hh\\:mm}",
                            IsActiveShift = isActive,
                            IsOnline = true
                        });
                    }
                }
            }

            // Nếu hôm nay chưa có ca trực nào được tạo, hiển thị danh sách thủ thư/nhân sự chung
            if (!result.Any())
            {
                var libraryStaff = allEmployees
                    .Where(e => e.User != null && e.Status != "Nghỉ việc")
                    .Take(4)
                    .ToList();

                foreach (var emp in libraryStaff)
                {
                    result.Add(new OnDutyStaffDto
                    {
                        EmployeeId = emp.Id,
                        UserId = emp.UserId,
                        Code = emp.Code,
                        FullName = emp.User.FullName,
                        Position = emp.Position ?? "Nhân viên trực thư viện",
                        DepartmentName = emp.User.Department?.Name ?? "Thư viện HUIT",
                        ShiftName = "Hỗ trợ thường trực",
                        ShiftTimeRange = "07:00 - 21:00",
                        IsActiveShift = true,
                        IsOnline = true
                    });
                }
            }

            return ApiResponse<List<OnDutyStaffDto>>.SuccessResponse(result);
        }

        // ─────────────────────────────────────────────────────────────────
        // HELPER MAPPER
        // ─────────────────────────────────────────────────────────────────
        private async Task<ChatConversationDto> MapConversationDtoAsync(ChatConversation conv)
        {
            var userRoles = conv.User != null ? await _userManager.GetRolesAsync(conv.User) : new List<string>();

            // Lấy toàn bộ tin nhắn đã sắp xếp
            var rawMessages = conv.ChatMessages ?? new List<ChatMessage>();
            var orderedMessages = rawMessages.OrderBy(m => m.SentAt).ToList();

            // Lấy danh sách Users liên quan trong tin nhắn để map tên người gửi
            var senderUserIds = orderedMessages.Select(m => m.UserId).Distinct().ToList();
            var userMap = new Dictionary<int, (string Name, string CardCode, string Role, bool IsStaff)>();

            foreach (var uid in senderUserIds)
            {
                var u = await _userManager.FindByIdAsync(uid.ToString());
                if (u != null)
                {
                    var r = await _userManager.GetRolesAsync(u);
                    bool isStaff = r.Any(x => x.Equals("Admin", StringComparison.OrdinalIgnoreCase) ||
                                              x.Equals("Employee", StringComparison.OrdinalIgnoreCase));
                    userMap[uid] = (u.FullName, u.CardCode, r.FirstOrDefault() ?? "User", isStaff);
                }
            }

            var messageDtos = orderedMessages.Select(m =>
            {
                userMap.TryGetValue(m.UserId, out var sender);
                return new ChatMessageDto
                {
                    Id = m.Id,
                    ChatConversationId = m.ChatConversationId,
                    UserId = m.UserId,
                    SenderName = sender.Name ?? "Người dùng",
                    SenderCardCode = sender.CardCode ?? "",
                    SenderRole = sender.Role ?? "User",
                    IsFromStaff = sender.IsStaff,
                    Content = m.Content,
                    SentAt = m.SentAt,
                    IsRead = m.IsRead
                };
            }).ToList();

            var lastMessage = orderedMessages.LastOrDefault();
            var unreadCount = orderedMessages.Count(m => m.UserId == conv.UserId && !m.IsRead);

            return new ChatConversationDto
            {
                Id = conv.Id,
                UserId = conv.UserId,
                UserName = conv.User?.FullName ?? "Người dùng",
                UserCardCode = conv.User?.CardCode ?? "",
                UserEmail = conv.User?.Email ?? "",
                DepartmentName = conv.User?.Department?.Name,
                UserRole = userRoles.FirstOrDefault() ?? "User",
                StartTime = conv.StartTime,
                EndTime = conv.EndTime,
                Status = conv.Status ?? "Open",
                LastMessageContent = lastMessage?.Content,
                LastMessageTime = lastMessage?.SentAt,
                UnreadCount = unreadCount,
                Messages = messageDtos
            };
        }
    }
}
