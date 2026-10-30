using System;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Quy định mượn phòng dành cho sinh viên tại Thư viện HUIT:
    /// 07:00–20:00, tối đa 2 giờ/lượt, không nhận Chủ Nhật,
    /// không đặt thời gian đã qua và chỉ áp dụng cho phòng học nhóm/phòng thuyết trình.
    /// </summary>
    public static class StudentBookingPolicy
    {
        public static readonly TimeSpan OpenTime = new TimeSpan(7, 0, 0);
        public static readonly TimeSpan CloseTime = new TimeSpan(20, 0, 0);
        public static readonly TimeSpan MaxDuration = TimeSpan.FromHours(2);
        public const int MaxAdvanceDays = 14;

        public static bool IsStudent(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return false;
            var normalized = role.Trim().ToLowerInvariant();
            return normalized == "student"
                || normalized == "sinh viên"
                || normalized == "sinh vien";
        }

        public static bool IsBookableRoomType(string? roomTypeName)
        {
            if (string.IsNullOrWhiteSpace(roomTypeName)) return false;
            var normalized = roomTypeName.Trim().ToLowerInvariant();
            return normalized.Contains("nhóm")
                || normalized.Contains("nhom")
                || normalized.Contains("thuyết trình")
                || normalized.Contains("thuyet trinh");
        }

        /// <summary>
        /// Kiểm tra một lượt đặt phòng của sinh viên theo giờ UTC.
        /// Trả về thông báo lỗi, hoặc null nếu hợp lệ.
        /// </summary>
        public static string? ValidateWindow(
            DateTime startUtc,
            DateTime endUtc,
            DateTime nowUtc)
        {
            var start = startUtc.ToUniversalTime();
            var end = endUtc.ToUniversalTime();
            var localStart = start.AddHours(7);
            var localEnd = end.AddHours(7);

            if (end <= start)
                return "Thời gian kết thúc phải sau thời gian bắt đầu.";

            if (localStart.Date != localEnd.Date)
                return "Mỗi lượt đặt phòng phải nằm trong cùng một ngày.";

            if (localStart.DayOfWeek == DayOfWeek.Sunday)
                return "Thư viện không phục vụ mượn phòng vào Chủ Nhật.";

            if (start <= nowUtc.ToUniversalTime())
                return "Không thể đặt thời gian đã qua trong ngày.";

            if (localStart.TimeOfDay < OpenTime || localEnd.TimeOfDay > CloseTime)
                return "Sinh viên chỉ có thể đặt phòng trong khung giờ 07:00 – 20:00.";

            if (end - start > MaxDuration)
                return "Sinh viên chỉ được đặt tối đa 2 giờ mỗi lượt.";

            return null;
        }

        /// <summary>
        /// Chặn đặt phòng thư viện trước quá 14 ngày (tính theo ngày lịch Việt Nam).
        /// Trả về thông báo lỗi, hoặc null nếu hợp lệ.
        /// </summary>
        public static string? ValidateAdvanceWindow(DateTime startUtc, DateTime nowUtc)
        {
            var localStart = startUtc.ToUniversalTime().AddHours(7).Date;
            var localToday = nowUtc.ToUniversalTime().AddHours(7).Date;

            if (localStart > localToday.AddDays(MaxAdvanceDays))
                return "Chỉ được đặt phòng trước tối đa 2 tuần.";

            return null;
        }
    }
}
