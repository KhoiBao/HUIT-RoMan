using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Quy định hủy đặt phòng trực tuyến của sinh viên:
    /// chỉ hợp lệ khi now &lt;= T - 3 giờ (T = thời điểm bắt đầu đặt phòng),
    /// đơn đã được duyệt, chưa bị hủy và chưa nhận phòng.
    /// Lý do hủy bắt buộc, lưu trực tiếp trên bảng Bookings (CancelReason/CancelReasonDetail).
    /// </summary>
    public static class BookingCancelPolicy
    {
        public static readonly TimeSpan MinLeadTime = TimeSpan.FromHours(3);

        public const string ReasonChangePlan = "CHANGE_PLAN";
        public const string ReasonNoLongerNeeded = "NO_LONGER_NEEDED";
        public const string ReasonOther = "OTHER";
        /// <summary>Lý do mặc định khi tác vụ nền tự động hủy (không nhận phòng đúng hạn).</summary>
        public const string ReasonNoShow = "NO_SHOW";

        /// <summary>Nguồn hủy (CancelSource trên Booking).</summary>
        public const string SourceStudent = "STUDENT";
        public const string SourceAuto = "AUTO";
        public const string SourceStaff = "STAFF";

        public static readonly IReadOnlyDictionary<string, string> ReasonLabels = new Dictionary<string, string>
        {
            [ReasonChangePlan] = "Thay đổi kế hoạch",
            [ReasonNoLongerNeeded] = "Không còn nhu cầu sử dụng",
            [ReasonOther] = "Lý do khác",
            [ReasonNoShow] = "Không nhận phòng đúng hạn (tự động hủy)"
        };

        public static readonly IReadOnlyList<string> StudentReasonCodes = new[]
        {
            ReasonChangePlan,
            ReasonNoLongerNeeded,
            ReasonOther
        };

        /// <summary>Đúng thời điểm T - 3 giờ vẫn được hủy; sau đó thì không.</summary>
        public static bool IsWithinDeadline(DateTime startAtUtc, DateTime nowUtc)
        {
            var start = startAtUtc.Kind == DateTimeKind.Utc ? startAtUtc : DateTime.SpecifyKind(startAtUtc, DateTimeKind.Utc);
            var now = nowUtc.Kind == DateTimeKind.Utc ? nowUtc : DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc);
            return now <= start - MinLeadTime;
        }

        /// <summary>
        /// Kiểm tra mã lý do và nội dung chi tiết (bắt buộc nhập khi lý do là OTHER).
        /// Trả về null nếu hợp lệ, ngược lại trả về thông báo lỗi.
        /// </summary>
        public static string? ValidateReason(string? reasonCode, string? reasonDetail)
        {
            var code = (reasonCode ?? string.Empty).Trim().ToUpperInvariant();
            if (!StudentReasonCodes.Contains(code))
                return "Lý do hủy không hợp lệ. Vui lòng chọn một trong: Thay đổi kế hoạch, Không còn nhu cầu sử dụng, Lý do khác.";

            if (code == ReasonOther && string.IsNullOrWhiteSpace(reasonDetail))
                return "Vui lòng nhập nội dung giải thích cụ thể khi chọn 'Lý do khác'.";

            return null;
        }

        public static string GetReasonLabel(string? reasonCode)
        {
            var code = (reasonCode ?? string.Empty).Trim().ToUpperInvariant();
            return ReasonLabels.TryGetValue(code, out var label) ? label : (reasonCode ?? "");
        }
    }
}
