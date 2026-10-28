using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Notification.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.Application.Modules.Notification.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Domain.Entities.Notification> _notificationRepo;
        private readonly ICurrentUserService _currentUser;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUser,
            ILogger<NotificationService> logger)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
            _logger = logger;
            _notificationRepo = _unitOfWork.Repository<Domain.Entities.Notification>();
        }

        public async Task<ApiResponse<NotificationListDto>> GetMyNotificationsAsync(int page = 1, int pageSize = 20, bool? isRead = null)
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<NotificationListDto>.ErrorResponse("Bạn cần đăng nhập để xem thông báo.");
            }

            var userId = _currentUser.UserId.Value;
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 20 : (pageSize > 100 ? 100 : pageSize);

            var list = (await _notificationRepo.FindAsync(
                n => n.UserId == userId && !n.IsDeleted
            )).ToList();

            var filtered = isRead.HasValue ? list.Where(n => n.IsRead == isRead.Value).ToList() : list;

            var totalCount = filtered.Count;
            var unreadCount = list.Count(n => !n.IsRead);

            var items = filtered
                .OrderByDescending(n => n.SentAt)
                .ThenByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapToDto)
                .ToList();

            var result = new NotificationListDto
            {
                TotalCount = totalCount,
                UnreadCount = unreadCount,
                Page = page,
                PageSize = pageSize,
                Items = items
            };

            return ApiResponse<NotificationListDto>.SuccessResponse(result);
        }

        public async Task<ApiResponse<int>> GetUnreadCountAsync()
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<int>.SuccessResponse(0);
            }

            var userId = _currentUser.UserId.Value;
            var unreadCount = (await _notificationRepo.FindAsync(
                n => n.UserId == userId && !n.IsDeleted && !n.IsRead
            )).Count();

            return ApiResponse<int>.SuccessResponse(unreadCount);
        }

        public async Task<ApiResponse<bool>> MarkAsReadAsync(int notificationId)
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<bool>.ErrorResponse("Bạn cần đăng nhập.");
            }

            var notification = await _notificationRepo.GetByIdAsync(notificationId);
            if (notification == null || notification.IsDeleted || notification.UserId != _currentUser.UserId.Value)
            {
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy thông báo.");
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                notification.UpdatedAt = DateTime.UtcNow;
                _notificationRepo.Update(notification);
                await _unitOfWork.SaveChangesAsync();
            }

            return ApiResponse<bool>.SuccessResponse(true, "Đã đánh dấu thông báo là đã đọc.");
        }

        public async Task<ApiResponse<int>> MarkAllAsReadAsync()
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<int>.ErrorResponse("Bạn cần đăng nhập.");
            }

            var userId = _currentUser.UserId.Value;
            var unreadNotifications = (await _notificationRepo.FindAsync(
                n => n.UserId == userId && !n.IsDeleted && !n.IsRead
            )).ToList();

            var now = DateTime.UtcNow;
            foreach (var n in unreadNotifications)
            {
                n.IsRead = true;
                n.ReadAt = now;
                n.UpdatedAt = now;
                _notificationRepo.Update(n);
            }

            if (unreadNotifications.Count > 0)
            {
                await _unitOfWork.SaveChangesAsync();
            }

            return ApiResponse<int>.SuccessResponse(unreadNotifications.Count, "Đã đánh dấu tất cả thông báo là đã đọc.");
        }

        public async Task<ApiResponse<bool>> DeleteNotificationAsync(int notificationId)
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<bool>.ErrorResponse("Bạn cần đăng nhập.");
            }

            var notification = await _notificationRepo.GetByIdAsync(notificationId);
            if (notification == null || notification.IsDeleted || notification.UserId != _currentUser.UserId.Value)
            {
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy thông báo.");
            }

            // Soft-delete
            notification.IsDeleted = true;
            notification.UpdatedAt = DateTime.UtcNow;
            _notificationRepo.Update(notification);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Đã xóa thông báo.");
        }

        public async Task<ApiResponse<NotificationDto>> CreateNotificationAsync(CreateNotificationDto dto)
        {
            var now = DateTime.UtcNow;
            var entity = new Domain.Entities.Notification
            {
                UserId = dto.UserId,
                Title = dto.Title,
                Content = dto.Content,
                Type = dto.Type,
                IsRead = false,
                SentAt = now,
                CreatedAt = now
            };

            await _notificationRepo.AddAsync(entity);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<NotificationDto>.SuccessResponse(MapToDto(entity), "Tạo thông báo thành công.");
        }

        private static NotificationDto MapToDto(Domain.Entities.Notification entity)
        {
            return new NotificationDto
            {
                Id = entity.Id,
                Title = entity.Title,
                Content = entity.Content,
                Type = entity.Type,
                TypeName = GetTypeName(entity.Type),
                IsRead = entity.IsRead,
                SentAt = entity.SentAt,
                ReadAt = entity.ReadAt,
                CreatedAt = entity.CreatedAt,
                UserId = entity.UserId
            };
        }

        private static string GetTypeName(int type)
        {
            return type switch
            {
                NotificationType.BookingStatus => "Đơn đặt phòng",
                NotificationType.BookingReminderStart => "Nhắc giờ nhận phòng",
                NotificationType.BookingReminderEnd => "Nhắc giờ trả phòng",
                NotificationType.Violation => "Xử lý vi phạm",
                _ => "Thông báo chung"
            };
        }
    }
}

