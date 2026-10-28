using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Tự động hủy đơn đặt phòng đã duyệt nhưng không được nhận phòng đúng hạn (no-show).
    /// Quy tắc: đơn (Đã duyệt / Duyệt một phần) chưa check-in và thời điểm bắt đầu T đã tới
    /// → chuyển đơn + các chi tiết sang "Đã hủy", hủy phiên sử dụng đang chờ, ghi nhận lý do
    /// NO_SHOW / nguồn AUTO và tạo thông báo cho sinh viên.
    /// Tính an toàn:
    ///  - Claim nguyên tử bằng UPDATE có điều kiện (single-writer) → không hủy lặp,
    ///    không gửi trùng thông báo, kể cả chạy song song trên nhiều instance backend.
    ///  - Không hủy đơn đã check-in, đã bị hủy trước đó hoặc chưa được duyệt.
    /// </summary>
    public class BookingNoShowService : IBookingNoShowService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<BookingNoShowService> _logger;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly IRepository<UsageSession> _usageSessionRepo;
        private readonly IRepository<Domain.Entities.Notification> _notificationRepo;

        public BookingNoShowService(IUnitOfWork unitOfWork, ILogger<BookingNoShowService> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _usageSessionRepo = _unitOfWork.Repository<UsageSession>();
            _notificationRepo = _unitOfWork.Repository<Domain.Entities.Notification>();
        }

        public async Task<int> CancelExpiredBookingsAsync(DateTime? nowUtc = null, CancellationToken cancellationToken = default)
        {
            var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);

            var candidates = (await _bookingRepo.FindAsync(
                    b => (b.Status == "Đã duyệt" || b.Status == "Duyệt một phần")
                       && b.CheckedInAt == null,
                    b => b.BookingDetails))
                .Where(b => GetBookingStartAt(b) <= now)
                .Where(b => (b.BookingDetails ?? new List<BookingDetail>())
                    .All(d => d.Status != "Đang sử dụng" && d.Status != "Hoàn thành"))
                .ToList();

            int cancelledCount = 0;

            foreach (var candidate in candidates)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var bookingId = candidate.Id;

                try
                {
                    // Atomic claim: đơn chỉ chuyển sang "Đã hủy" đúng một lần trên toàn hệ thống.
                    var claimed = await _bookingRepo.UpdateIfAsync(
                        b => b.Id == bookingId
                           && (b.Status == "Đã duyệt" || b.Status == "Duyệt một phần")
                           && b.CheckedInAt == null,
                        set => set
                            .SetProperty(b => b.Status, "Đã hủy")
                            .SetProperty(b => b.CancelReason, BookingCancelPolicy.ReasonNoShow)
                            .SetProperty(b => b.CancelReasonDetail, (string?)null)
                            .SetProperty(b => b.CancelSource, BookingCancelPolicy.SourceAuto)
                            .SetProperty(b => b.UpdatedAt, now));

                    if (claimed == 0)
                    {
                        // Đơn đã được check-in / hủy bởi request khác — bỏ qua, không xử lý lại.
                        continue;
                    }

                    // Hủy các chi tiết đang chờ (giải phóng khung giờ theo logic hiện có:
                    // schedule/booking availability đều loại trừ chi tiết "Đã hủy").
                    var details = (await _bookingDetailRepo.FindAsync(d => d.BookingId == bookingId)).ToList();
                    foreach (var detail in details)
                    {
                        if (detail.Status == "Đã hủy" || detail.Status == "Từ chối" || detail.Status == "Hoàn thành")
                            continue;
                        detail.Status = "Đã hủy";
                        _bookingDetailRepo.Update(detail);
                    }

                    // Hủy các phiên sử dụng đang chờ nhận phòng của đơn này (idempotent).
                    var sessions = (await _usageSessionRepo.FindAsync(
                        s => s.BookingDetailId != 0 && details.Select(d => d.Id).Contains(s.BookingDetailId)
                          && s.Status == "Chờ nhận phòng")).ToList();
                    foreach (var session in sessions)
                    {
                        session.Status = "Đã hủy";
                        _usageSessionRepo.Update(session);
                    }

                    // Thông báo cho sinh viên (entity Notification đã tồn tại trong schema).
                    var booking = await _bookingRepo.GetByIdAsync(bookingId);
                    var startLocal = GetBookingStartAt(candidate).AddHours(7);
                    await _notificationRepo.AddAsync(new Domain.Entities.Notification
                    {
                        UserId = booking?.UserId ?? candidate.UserId,
                        Title = "Đơn đặt phòng bị tự động hủy",
                        Content = $"Đơn #{bookingId} không được nhận phòng đúng hạn (trước {startLocal:HH:mm} ngày {startLocal:dd/MM/yyyy}) nên đã bị hệ thống tự động hủy.",
                        Type = 1,
                        IsRead = false,
                        SentAt = now,
                        CreatedAt = now
                    });

                    await _unitOfWork.SaveChangesAsync();
                    cancelledCount++;

                    _logger.LogInformation("Auto-cancelled no-show booking #{BookingId} at {NowUtc}.", bookingId, now);
                }
                catch (Exception ex)
                {
                    // Không để một đơn lỗi làm dừng cả vòng quét.
                    _logger.LogWarning(ex, "Failed to auto-cancel no-show booking #{BookingId}.", bookingId);
                }
            }

            return cancelledCount;
        }

        private static DateTime GetBookingStartAt(Domain.Entities.Booking booking)
        {
            var activeStarts = (booking.BookingDetails ?? new List<BookingDetail>())
                .Where(d => d.Status != "Từ chối" && d.Status != "Đã hủy")
                .Select(d => d.StartAt)
                .ToList();

            if (activeStarts.Count == 0)
            {
                activeStarts = (booking.BookingDetails ?? new List<BookingDetail>())
                    .Select(d => d.StartAt)
                    .ToList();
            }

            var start = activeStarts.Count > 0 ? activeStarts.Min() : booking.RequestedAt;
            return DateTime.SpecifyKind(start, DateTimeKind.Utc);
        }
    }
}
