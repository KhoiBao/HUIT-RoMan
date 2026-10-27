using System;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Quy định nhận phòng (check-in) của đơn đặt phòng.
    /// Với thời điểm bắt đầu đặt phòng T:
    ///   - trước T - 15 phút : chưa mở nhận phòng.
    ///   - [T - 15 phút, T)  : được phép nhận phòng.
    ///   - từ T trở đi       : hết hạn nhận phòng; nếu sinh viên chưa check-in
    ///                         đơn sẽ bị tác vụ nền tự động hủy (BookingNoShowService).
    /// Không có thời gian gia hạn sau T.
    /// </summary>
    public static class BookingCheckInPolicy
    {
        public static readonly TimeSpan OpenBeforeStart = TimeSpan.FromMinutes(15);

        public enum State
        {
            /// <summary>Chưa đến giờ mở nhận phòng (now &lt; T - 15 phút).</summary>
            NotOpen,
            /// <summary>Đang trong khoảng được phép nhận phòng [T - 15 phút, T).</summary>
            Open,
            /// <summary>Đã đến T: hết hạn nhận phòng, đơn sẽ bị tự động hủy.</summary>
            Expired
        }

        /// <summary>Đánh giá trạng thái cửa sổ nhận phòng tại thời điểm nowUtc.</summary>
        public static State Evaluate(DateTime startAtUtc, DateTime nowUtc)
        {
            var start = startAtUtc.Kind == DateTimeKind.Utc ? startAtUtc : DateTime.SpecifyKind(startAtUtc, DateTimeKind.Utc);
            var now = nowUtc.Kind == DateTimeKind.Utc ? nowUtc : DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc);

            if (now < start - OpenBeforeStart) return State.NotOpen;
            if (now < start) return State.Open;
            return State.Expired;
        }

        /// <summary>
        /// Thông báo lỗi nghiệp vụ khi không được check-in tại thời điểm nowUtc
        /// (chỉ kiểm tra thời gian; các điều kiện khác do service đảm nhiệm).
        /// Trả về null nếu thời điểm hợp lệ.
        /// </summary>
        public static string? ValidateWindow(DateTime startAtUtc, DateTime nowUtc)
        {
            return Evaluate(startAtUtc, nowUtc) switch
            {
                State.NotOpen => $"Chưa đến thời điểm nhận phòng. Bạn chỉ có thể nhận phòng từ {startAtUtc.AddHours(7).Add(-OpenBeforeStart):HH:mm} (trước giờ bắt đầu {OpenBeforeStart.TotalMinutes} phút).",
                State.Expired => "Đã hết thời hạn nhận phòng (quá giờ bắt đầu đặt phòng). Đơn sẽ được xử lý hủy theo quy định nếu chưa nhận phòng.",
                _ => null
            };
        }
    }
}
