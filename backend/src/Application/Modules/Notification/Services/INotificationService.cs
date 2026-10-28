using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Notification.DTOs;

namespace HUIT_RoMan.Application.Modules.Notification.Services
{
    public interface INotificationService
    {
        Task<ApiResponse<NotificationListDto>> GetMyNotificationsAsync(int page = 1, int pageSize = 20, bool? isRead = null);
        Task<ApiResponse<int>> GetUnreadCountAsync();
        Task<ApiResponse<bool>> MarkAsReadAsync(int notificationId);
        Task<ApiResponse<int>> MarkAllAsReadAsync();
        Task<ApiResponse<bool>> DeleteNotificationAsync(int notificationId);
        Task<ApiResponse<NotificationDto>> CreateNotificationAsync(CreateNotificationDto dto);
    }
}

