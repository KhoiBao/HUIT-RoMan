using System;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Hạn mức mượn phòng của sinh viên: tối đa 2 lượt mỗi tuần,
    /// tuần tính theo giờ Việt Nam (UTC+7) từ Thứ Hai 00:00 đến Chủ Nhật 24:00.
    /// Đơn "Từ chối" / "Đã hủy" không tính vào hạn mức.
    /// </summary>
    public static class BookingQuotaPolicy
    {
        public const int MaxBookingsPerWeek = 2;
        public const int VietnamUtcOffsetHours = 7;

        /// <summary>Tổng thời gian gia hạn tối đa của một lượt mượn.</summary>
        public const int MaxExtensionMinutes = 60;

        /// <summary>
        /// Xác định tuần (Thứ Hai 00:00 → Chủ Nhật 24:00 giờ VN) chứa mốc thời gian cho trước
        /// </summary>
        public static (DateTime WeekStartUtc, DateTime WeekEndUtc) GetVietnamWeekRangeUtc(DateTime anyUtc)
        {
            var local = anyUtc.ToUniversalTime().AddHours(VietnamUtcOffsetHours);
            var daysFromMonday = ((int)local.DayOfWeek + 6) % 7;
            var weekStartLocal = local.Date.AddDays(-daysFromMonday);

            return (
                DateTime.SpecifyKind(weekStartLocal.AddHours(-VietnamUtcOffsetHours), DateTimeKind.Utc),
                DateTime.SpecifyKind(weekStartLocal.AddDays(7).AddHours(-VietnamUtcOffsetHours), DateTimeKind.Utc));
        }
    }
}
