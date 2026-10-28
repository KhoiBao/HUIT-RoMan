using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Modules.Notification.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    public class BookingReminderService : IBookingReminderService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<BookingReminderService> _logger;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly IRepository<Domain.Entities.Notification> _notificationRepo;

        public BookingReminderService(IUnitOfWork unitOfWork, ILogger<BookingReminderService> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _notificationRepo = _unitOfWork.Repository<Domain.Entities.Notification>();
        }

        public async Task<int> SendRemindersAsync(DateTime? nowUtc = null, CancellationToken cancellationToken = default)
        {
            var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
            int reminderCount = 0;

            reminderCount += await SendUpcomingStartRemindersAsync(now, cancellationToken);
            reminderCount += await SendUpcomingEndRemindersAsync(now, cancellationToken);

            return reminderCount;
        }

        /// <summary>
        /// 1. Nhắc lịch sắp đến giờ nhận phòng:
        /// Tìm các chi tiết đơn đã duyệt, chưa nhận phòng (CheckedInAt == null),
        /// thời gian bắt đầu trong vòng 30 phút tới (now < StartAt <= now + 30 phút).
        /// </summary>
        private async Task<int> SendUpcomingStartRemindersAsync(DateTime now, CancellationToken cancellationToken)
        {
            var windowEnd = now.AddMinutes(30);

            var candidateDetails = (await _bookingDetailRepo.FindAsync(
                d => !d.IsDeleted
                  && (d.Status == "Đã duyệt" || d.Status == "Chờ duyệt")
                  && d.StartAt > now
                  && d.StartAt <= windowEnd,
                d => d.Room,
                d => d.Booking
            )).Where(d => d.Booking != null
                       && !d.Booking.IsDeleted
                       && (d.Booking.Status == "Đã duyệt" || d.Booking.Status == "Duyệt một phần")
                       && d.Booking.CheckedInAt == null)
              .ToList();

            int count = 0;

            foreach (var detail in candidateDetails)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var booking = detail.Booking;
                var roomName = detail.Room?.Name ?? $"Phòng #{detail.RoomId}";
                var tag = $"Đơn #{booking.Id} (Mã chi tiết: #{detail.Id})";

                // Kiểm tra xem đã gửi thông báo nhắc lịch cho chi tiết này chưa (idempotent)
                var existing = await _notificationRepo.FindAsync(
                    n => n.UserId == booking.UserId
                      && n.Type == NotificationType.BookingReminderStart
                      && !n.IsDeleted
                      && n.Content.Contains(tag)
                );

                if (existing.Any())
                {
                    continue;
                }

                var startLocal = detail.StartAt.ToUniversalTime().AddHours(7);
                var notification = new Domain.Entities.Notification
                {
                    UserId = booking.UserId,
                    Title = $"Nhắc lịch: Sắp đến giờ nhận {roomName}",
                    Content = $"{tag} tại {roomName} sắp bắt đầu lúc {startLocal:HH:mm} ngày {startLocal:dd/MM/yyyy}. Vui lòng có mặt đúng giờ để check-in nhận phòng.",
                    Type = NotificationType.BookingReminderStart,
                    IsRead = false,
                    SentAt = now,
                    CreatedAt = now
                };

                await _notificationRepo.AddAsync(notification);
                await _unitOfWork.SaveChangesAsync();
                count++;

                _logger.LogInformation("Sent upcoming start reminder to user #{UserId} for detail #{DetailId} at {NowUtc}.",
                    booking.UserId, detail.Id, now);
            }

            return count;
        }

        /// <summary>
        /// 2. Nhắc lịch sắp hết thời gian sử dụng phòng:
        /// Tìm các chi tiết đang sử dụng hoặc đơn đã check-in nhưng chưa trả phòng,
        /// thời gian kết thúc trong vòng 15 phút tới (now < EndAt <= now + 15 phút).
        /// </summary>
        private async Task<int> SendUpcomingEndRemindersAsync(DateTime now, CancellationToken cancellationToken)
        {
            var windowEnd = now.AddMinutes(15);

            var candidateDetails = (await _bookingDetailRepo.FindAsync(
                d => !d.IsDeleted
                  && (d.Status == "Đang sử dụng" || d.Status == "Đã duyệt")
                  && d.EndAt > now
                  && d.EndAt <= windowEnd,
                d => d.Room,
                d => d.Booking
            )).Where(d => d.Booking != null
                       && !d.Booking.IsDeleted
                       && d.Booking.CheckedInAt != null
                       && d.Booking.Status != "Đã hủy"
                       && d.Status != "Hoàn thành"
                       && d.Status != "Đã hủy"
                       && d.Status != "Từ chối")
              .ToList();

            int count = 0;

            foreach (var detail in candidateDetails)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var booking = detail.Booking;
                var roomName = detail.Room?.Name ?? $"Phòng #{detail.RoomId}";
                var tag = $"Đơn #{booking.Id} (Mã chi tiết: #{detail.Id})";

                // Kiểm tra xem đã gửi thông báo nhắc kết thúc cho chi tiết này chưa
                var existing = await _notificationRepo.FindAsync(
                    n => n.UserId == booking.UserId
                      && n.Type == NotificationType.BookingReminderEnd
                      && !n.IsDeleted
                      && n.Content.Contains(tag)
                );

                if (existing.Any())
                {
                    continue;
                }

                var endLocal = detail.EndAt.ToUniversalTime().AddHours(7);
                var notification = new Domain.Entities.Notification
                {
                    UserId = booking.UserId,
                    Title = $"Nhắc lịch: Sắp hết thời gian sử dụng {roomName}",
                    Content = $"{tag} tại {roomName} sắp hết giờ sử dụng lúc {endLocal:HH:mm} hôm nay. Vui lòng dọn dẹp vệ sinh, kiểm tra thiết bị và thực hiện thủ tục trả phòng.",
                    Type = NotificationType.BookingReminderEnd,
                    IsRead = false,
                    SentAt = now,
                    CreatedAt = now
                };

                await _notificationRepo.AddAsync(notification);
                await _unitOfWork.SaveChangesAsync();
                count++;

                _logger.LogInformation("Sent upcoming end reminder to user #{UserId} for detail #{DetailId} at {NowUtc}.",
                    booking.UserId, detail.Id, now);
            }

            return count;
        }
    }
}
