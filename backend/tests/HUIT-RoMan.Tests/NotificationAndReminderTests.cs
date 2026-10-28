using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Notification.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    public class NotificationAndReminderTests
    {
        [Fact]
        public async Task Notification_GetMyNotifications_ChỉTrảVềCủaUserHiệnTại()
        {
            using var h = new BookingHarness();
            var service = h.CreateNotificationService();

            // Thêm 2 thông báo cho StudentA, 1 cho StudentB
            h.Db.Notifications.Add(new Notification
            {
                UserId = BookingTestSeed.StudentAId,
                Title = "Thông báo 1",
                Content = "Nội dung 1",
                Type = NotificationType.BookingStatus,
                IsRead = false,
                SentAt = DateTime.UtcNow
            });
            h.Db.Notifications.Add(new Notification
            {
                UserId = BookingTestSeed.StudentAId,
                Title = "Thông báo 2",
                Content = "Nội dung 2",
                Type = NotificationType.BookingReminderStart,
                IsRead = true,
                SentAt = DateTime.UtcNow.AddMinutes(-10)
            });
            h.Db.Notifications.Add(new Notification
            {
                UserId = BookingTestSeed.StudentBId,
                Title = "Thông báo B",
                Content = "Nội dung B",
                Type = NotificationType.BookingStatus,
                IsRead = false,
                SentAt = DateTime.UtcNow
            });
            await h.Db.SaveChangesAsync();

            var result = await service.GetMyNotificationsAsync(1, 10);

            Assert.True(result.Success);
            Assert.Equal(2, result.Data!.TotalCount);
            Assert.Equal(1, result.Data.UnreadCount);
            Assert.All(result.Data.Items, item => Assert.Equal(BookingTestSeed.StudentAId, item.UserId));
        }

        [Fact]
        public async Task Notification_MarkAsRead_CậpNhậtĐãĐọc()
        {
            using var h = new BookingHarness();
            var service = h.CreateNotificationService();

            var notif = new Notification
            {
                UserId = BookingTestSeed.StudentAId,
                Title = "Thông báo kiểm tra",
                Content = "Nội dung kiểm tra",
                Type = NotificationType.BookingStatus,
                IsRead = false,
                SentAt = DateTime.UtcNow
            };
            h.Db.Notifications.Add(notif);
            await h.Db.SaveChangesAsync();

            var readRes = await service.MarkAsReadAsync(notif.Id);
            Assert.True(readRes.Success);

            var dbNotif = await h.Db.Notifications.FirstAsync(n => n.Id == notif.Id);
            Assert.True(dbNotif.IsRead);
            Assert.NotNull(dbNotif.ReadAt);

            var unreadRes = await service.GetUnreadCountAsync();
            Assert.Equal(0, unreadRes.Data);
        }

        [Fact]
        public async Task Notification_MarkAllAsRead_ĐánhDấuToànBộ()
        {
            using var h = new BookingHarness();
            var service = h.CreateNotificationService();

            h.Db.Notifications.Add(new Notification
            {
                UserId = BookingTestSeed.StudentAId,
                Title = "T1",
                Content = "C1",
                IsRead = false,
                SentAt = DateTime.UtcNow
            });
            h.Db.Notifications.Add(new Notification
            {
                UserId = BookingTestSeed.StudentAId,
                Title = "T2",
                Content = "C2",
                IsRead = false,
                SentAt = DateTime.UtcNow
            });
            await h.Db.SaveChangesAsync();

            var allRes = await service.MarkAllAsReadAsync();
            Assert.True(allRes.Success);
            Assert.Equal(2, allRes.Data);

            var unreadRes = await service.GetUnreadCountAsync();
            Assert.Equal(0, unreadRes.Data);
        }

        [Fact]
        public async Task Booking_DuyệtĐơn_TựĐộngTạoThôngBáo()
        {
            using var h = new BookingHarness();
            // Đặt đơn ở trạng thái Chờ duyệt
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(2), BookingTestSeed.StudentAId, "Chờ duyệt");
            foreach (var detail in booking.BookingDetails)
            {
                detail.Status = "Chờ duyệt";
            }
            await h.Db.SaveChangesAsync();

            // Đổi quyền sang Admin để duyệt
            h.CurrentUser.IsAdmin = true;
            h.CurrentUser.Role = "Admin";

            var approveRes = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto
            {
                Decision = "Đã duyệt",
                RejectionReason = ""
            });

            Assert.True(approveRes.Success, approveRes.Message);

            var notif = await h.Db.Notifications
                .Where(n => n.UserId == booking.UserId && n.Type == NotificationType.BookingStatus)
                .OrderByDescending(n => n.CreatedAt)
                .FirstOrDefaultAsync();

            Assert.NotNull(notif);
            Assert.Contains("duyệt", notif.Title, StringComparison.OrdinalIgnoreCase);
            Assert.Contains($"#{booking.Id}", notif.Content);
        }

        [Fact]
        public async Task BookingReminder_NhắcLịchSắpĐến_HoạtĐộngVàKhôngGửiLặp()
        {
            using var h = new BookingHarness();
            var reminderService = h.CreateReminderService();

            // Tạo đơn bắt đầu trong 20 phút tới (nằm trong khung 30 phút)
            var startAt = DateTime.UtcNow.AddMinutes(20);
            var booking = BookingTestSeed.MakeBooking(h.Db, startAt, BookingTestSeed.StudentAId, "Đã duyệt");
            booking.CheckedInAt = null;
            await h.Db.SaveChangesAsync();

            // Quét lần 1: Phải tạo 1 thông báo nhắc sắp đến
            var count1 = await reminderService.SendRemindersAsync();
            Assert.True(count1 >= 1);

            var notif = await h.Db.Notifications.FirstOrDefaultAsync(
                n => n.UserId == booking.UserId && n.Type == NotificationType.BookingReminderStart);

            Assert.NotNull(notif);
            Assert.Contains($"Đơn #{booking.Id}", notif.Content);
            Assert.Contains("check-in", notif.Content, StringComparison.OrdinalIgnoreCase);

            // Quét lần 2: Không được gửi lặp lại (idempotent)
            var count2 = await reminderService.SendRemindersAsync();
            Assert.Equal(0, count2);
        }

        [Fact]
        public async Task BookingReminder_NhắcLịchSắpKếtThúc_HoạtĐộngVàKhôngGửiLặp()
        {
            using var h = new BookingHarness();
            var reminderService = h.CreateReminderService();

            // Tạo đơn đã check-in, sắp kết thúc trong 10 phút tới
            var now = DateTime.UtcNow;
            var booking = BookingTestSeed.MakeBooking(h.Db, now.AddHours(-1), BookingTestSeed.StudentAId, "Đã duyệt");
            booking.CheckedInAt = now.AddHours(-1);
            foreach (var detail in booking.BookingDetails)
            {
                detail.Status = "Đang sử dụng";
                detail.EndAt = now.AddMinutes(10); // kết thúc trong 10 phút
            }
            await h.Db.SaveChangesAsync();

            // Quét lần 1: Tạo thông báo nhắc kết thúc
            var count1 = await reminderService.SendRemindersAsync();
            Assert.True(count1 >= 1);

            var notif = await h.Db.Notifications.FirstOrDefaultAsync(
                n => n.UserId == booking.UserId && n.Type == NotificationType.BookingReminderEnd);

            Assert.NotNull(notif);
            Assert.Contains($"Đơn #{booking.Id}", notif.Content);
            Assert.Contains("trả phòng", notif.Content, StringComparison.OrdinalIgnoreCase);

            // Quét lần 2: Không gửi lặp
            var count2 = await reminderService.SendRemindersAsync();
            Assert.Equal(0, count2);
        }
    }
}
