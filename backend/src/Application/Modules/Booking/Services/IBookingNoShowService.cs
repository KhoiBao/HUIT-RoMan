using System;
using System.Threading;
using System.Threading.Tasks;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Tác vụ nền tự động hủy đơn đã duyệt nhưng sinh viên không nhận phòng đúng hạn
    /// (quá thời điểm bắt đầu T mà Booking.CheckedInAt vẫn NULL).
    /// </summary>
    public interface IBookingNoShowService
    {
        /// <summary>
        /// Quét và hủy các đơn quá hạn. An toàn khi chạy lặp lại hoặc chạy đồng thời trên nhiều instance:
        /// mỗi đơn chỉ được hủy đúng một lần (atomic claim trên DB).
        /// Trả về số đơn đã bị tự động hủy trong lần gọi này.
        /// </summary>
        Task<int> CancelExpiredBookingsAsync(DateTime? nowUtc = null, CancellationToken cancellationToken = default);
    }
}
