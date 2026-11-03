using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.Application.Modules.Usage.Services
{
    /// <summary>
    /// Tự động đóng phiên "Đang sử dụng" quá giờ kết thúc + thời gian chờ (mặc định 15 phút)
    /// mà người dùng không bấm trả phòng: chuyển phiên/chi tiết/đơn sang "Hoàn thành",
    /// giải phóng phòng và gửi thông báo.
    /// Claim nguyên tử bằng UPDATE có điều kiện → không đóng lặp, an toàn đa instance.
    /// </summary>
    public class OverdueSessionAutoCloseService : IOverdueSessionAutoCloseService
    {
        private const string AutoCloseMarker = "[Tự động đóng: quá hạn trả phòng]";

        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<OverdueSessionAutoCloseService> _logger;
        private readonly IRepository<UsageSession> _usageSessionRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<Domain.Entities.Notification> _notificationRepo;
        private readonly IRepository<ViolationType> _violationTypeRepo;
        private readonly IRepository<ViolationRecord> _violationRecordRepo;

        public OverdueSessionAutoCloseService(IUnitOfWork unitOfWork, ILogger<OverdueSessionAutoCloseService> logger)
        {
            _unitOfWork = unitOfWork;
            _logger = logger;
            _usageSessionRepo = _unitOfWork.Repository<UsageSession>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _notificationRepo = _unitOfWork.Repository<Domain.Entities.Notification>();
            _violationTypeRepo = _unitOfWork.Repository<ViolationType>();
            _violationRecordRepo = _unitOfWork.Repository<ViolationRecord>();
        }

        public async Task<int> CloseOverdueSessionsAsync(int graceMinutes = 15, CancellationToken cancellationToken = default)
        {
            var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            var cutoff = now.AddMinutes(-Math.Max(0, graceMinutes));

            var candidates = (await _usageSessionRepo.FindAsync(
                    s => s.Status == "Đang sử dụng"
                       && s.BookingDetail != null
                       && s.BookingDetail.EndAt <= cutoff,
                    s => s.BookingDetail))
                .ToList();

            var closedCount = 0;

            foreach (var session in candidates)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var sessionId = session.Id;

                try
                {
                    var claimed = await _usageSessionRepo.UpdateIfAsync(
                        s => s.Id == sessionId && s.Status == "Đang sử dụng",
                        set => set
                            .SetProperty(s => s.Status, "Hoàn thành")
                            .SetProperty(s => s.ActualCheckOut, now)
                            .SetProperty(s => s.StaffNote, AppendMarker(session.StaffNote)));

                    if (claimed == 0)
                        continue;

                    var detail = session.BookingDetail;
                    if (detail != null && detail.Status != "Hoàn thành")
                    {
                        detail.Status = "Hoàn thành";
                        _bookingDetailRepo.Update(detail);

                        var room = await _roomRepo.GetByIdAsync(detail.RoomId);
                        if (room != null && room.Status == "Đang sử dụng")
                        {
                            room.Status = "Trống";
                            _roomRepo.Update(room);
                        }

                        var booking = await _bookingRepo.GetByIdAsync(detail.BookingId, b => b.BookingDetails);
                        if (booking != null
                            && booking.BookingDetails.All(d => d.Status == "Hoàn thành" || d.Status == "Từ chối" || d.Status == "Đã hủy"))
                        {
                            booking.Status = "Hoàn thành";
                            _bookingRepo.Update(booking);
                        }
                    }

                    var violationCode = await RecordLateCheckoutViolationAsync(session, detail, now);

                    var endLocal = detail != null ? detail.EndAt.ToUniversalTime().AddHours(7) : now.AddHours(7);
                    await _notificationRepo.AddAsync(new Domain.Entities.Notification
                    {
                        UserId = session.UserId,
                        Title = "Phiên sử dụng quá hạn được tự động đóng",
                        Content = $"Phiên sử dụng (đơn #{detail?.BookingId}, giờ kết thúc {endLocal:HH:mm} ngày {endLocal:dd/MM/yyyy}) không được xác nhận trả phòng nên hệ thống đã tự động đóng phiên và giải phóng phòng."
                            + (violationCode != null ? $" Biên bản vi phạm {violationCode} (VT01 — Trả phòng trễ giờ) đã được ghi nhận." : ""),
                        Type = 1,
                        IsRead = false,
                        SentAt = now,
                        CreatedAt = now
                    });

                    await _unitOfWork.SaveChangesAsync();
                    closedCount++;

                    _logger.LogInformation("Auto-closed overdue session #{SessionId} at {NowUtc}.", sessionId, now);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to auto-close overdue session #{SessionId}.", sessionId);
                }
            }

            return closedCount;
        }

        private static string AppendMarker(string? existingNote)
        {
            if (string.IsNullOrWhiteSpace(existingNote))
                return AutoCloseMarker;
            return existingNote.Contains(AutoCloseMarker) ? existingNote : $"{existingNote} | {AutoCloseMarker}";
        }

        /// <summary>Ghi nhận biên bản vi phạm VT01 (Trả phòng trễ giờ) cho phiên bị tự đóng.</summary>
        private async Task<string?> RecordLateCheckoutViolationAsync(
            UsageSession session, BookingDetail? detail, DateTime nowUtc)
        {
            if (detail == null)
                return null;

            var vt01 = (await _violationTypeRepo.FindAsync(vt => vt.Code == "VT01")).FirstOrDefault();
            if (vt01 == null)
            {
                _logger.LogWarning("ViolationType VT01 not found; skip recording late-checkout violation for session #{SessionId}.", session.Id);
                return null;
            }

            var todayStr = nowUtc.ToString("yyyyMMdd");
            var countToday = (await _violationRecordRepo.FindAsync(
                r => r.Code != null && r.Code.StartsWith($"VP-{todayStr}"))).Count();
            var newCode = $"VP-{todayStr}-{(countToday + 1):D3}";

            await _violationRecordRepo.AddAsync(new ViolationRecord
            {
                Code = newCode,
                UserId = session.UserId,
                ViolationTypeId = vt01.Id,
                UsageSessionId = session.Id,
                IncidentTime = nowUtc,
                Description = "Hệ thống tự động ghi nhận: không xác nhận trả phòng đúng giờ kết thúc đã đăng ký, phiên bị tự đóng.",
                Severity = vt01.Severity,
                PenaltyApplied = vt01.DefaultPenalty ?? "Nhắc nhở / Cảnh cáo lần đầu",
                Status = "Chờ xử lý",
                CreatedAt = nowUtc
            });

            return newCode;
        }
    }
}
