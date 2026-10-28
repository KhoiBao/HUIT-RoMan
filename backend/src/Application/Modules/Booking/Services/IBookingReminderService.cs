using System;
using System.Threading;
using System.Threading.Tasks;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    public interface IBookingReminderService
    {
        /// <summary>
        /// Quét và gửi thông báo nhắc lịch cho các đơn đặt phòng:
        /// 1. Nhắc lịch sắp đến giờ nhận phòng (trước 30 phút).
        /// 2. Nhắc lịch sắp hết thời gian sử dụng phòng (trước 15 phút).
        /// </summary>
        /// <returns>Tổng số thông báo nhắc lịch đã tạo trong lượt quét.</returns>
        Task<int> SendRemindersAsync(DateTime? nowUtc = null, CancellationToken cancellationToken = default);
    }
}

