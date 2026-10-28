using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Notification.DTOs
{
    public static class NotificationType
    {
        public const int General = 0;              // Thông báo chung
        public const int BookingStatus = 1;        // Duyệt, từ chối, hủy, no-show
        public const int BookingReminderStart = 2; // Nhắc sắp đến giờ nhận phòng
        public const int BookingReminderEnd = 3;   // Nhắc sắp hết giờ sử dụng phòng
        public const int Violation = 4;            // Vi phạm, xử phạt
    }

    public class NotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int Type { get; set; }
        public string TypeName { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime SentAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public int UserId { get; set; }
    }

    public class CreateNotificationDto
    {
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public int Type { get; set; } = NotificationType.General;
    }

    public class NotificationListDto
    {
        public int TotalCount { get; set; }
        public int UnreadCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public List<NotificationDto> Items { get; set; } = new List<NotificationDto>();
    }
}

