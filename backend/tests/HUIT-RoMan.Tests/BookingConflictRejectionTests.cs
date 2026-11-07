using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// FIFO trùng lịch: đơn mới thua → được lưu thành đơn "Từ chối" kèm mã R01,
    /// nhận notification và email gợi ý đổi phòng/giờ; không ghi ApprovalHistory
    /// (lịch sử duyệt chỉ dành cho quyết định trong pipeline).
    /// </summary>
    public class BookingConflictRejectionTests
    {
        [Fact]
        public async Task TrungLich_TaoDonTuChoi_KeMaR01TrongRejectionReason()
        {
            using var h = new BookingHarness();
            BookingTestSeed.MakeBooking(h.Db, ToUtc(NextWeekdayLocal(9)), status: "Đã duyệt");
            var request = NewRequest();

            var res = await h.BookingService.CreateBookingAsync(request);

            Assert.False(res.Success);
            Assert.Equal("R01_TRUNG_LICH", res.Code);

            var rejected = await h.Db.Bookings.AsNoTracking()
                .Where(b => b.UserId == BookingTestSeed.StudentAId && b.Status == "Từ chối")
                .SingleAsync();
            Assert.StartsWith("R01_TRUNG_LICH", rejected.RejectionReason);
            Assert.Equal(request.ActivityName, rejected.ActivityName);

            var detail = await h.Db.BookingDetails.AsNoTracking()
                .SingleAsync(d => d.BookingId == rejected.Id);
            Assert.Equal(BookingTestSeed.RoomId, detail.RoomId);
            Assert.Equal("Từ chối", detail.Status);
            Assert.Equal(request.Details[0].StartAt, detail.StartAt);
            Assert.Equal(request.Details[0].EndAt, detail.EndAt);
        }

        [Fact]
        public async Task TrungLich_GuiNotificationVaEmailGoiYDoiPhongGio()
        {
            using var h = new BookingHarness();
            BookingTestSeed.MakeBooking(h.Db, ToUtc(NextWeekdayLocal(9)), status: "Đã duyệt");

            await h.BookingService.CreateBookingAsync(NewRequest());

            var notification = await h.Db.Notifications.AsNoTracking()
                .Where(n => n.UserId == BookingTestSeed.StudentAId)
                .SingleAsync();
            Assert.Contains("từ chối", notification.Content, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("phòng hoặc khung giờ khác", notification.Content);

            h.EmailMock.Verify(m => m.SendBookingApprovalEmailAsync(
                "svA@huit.edu.vn",
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<string>(),
                "Từ chối",
                It.Is<string?>(r => r != null && r.Contains("R01_TRUNG_LICH") && r.Contains("phòng hoặc khung giờ khác")),
                It.IsAny<string?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task TrungLich_KhongGhiApprovalHistory()
        {
            using var h = new BookingHarness();
            BookingTestSeed.MakeBooking(h.Db, ToUtc(NextWeekdayLocal(9)), status: "Đã duyệt");

            await h.BookingService.CreateBookingAsync(NewRequest());

            var rejected = await h.Db.Bookings.AsNoTracking()
                .FirstAsync(b => b.UserId == BookingTestSeed.StudentAId && b.Status == "Từ chối");
            Assert.False(await h.Db.ApprovalHistories.AsNoTracking()
                .AnyAsync(x => x.BookingId == rejected.Id));
        }

        [Fact]
        public async Task TrungLich_EmailLoi_VanTraKetQuaTuChoi()
        {
            using var h = new BookingHarness();
            h.EmailMock
                .Setup(m => m.SendBookingApprovalEmailAsync(
                    It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(),
                    It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(),
                    It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("SMTP down"));
            BookingTestSeed.MakeBooking(h.Db, ToUtc(NextWeekdayLocal(9)), status: "Đã duyệt");

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.False(res.Success);
            Assert.Equal("R01_TRUNG_LICH", res.Code);
            Assert.True(await h.Db.Bookings.AsNoTracking()
                .AnyAsync(b => b.UserId == BookingTestSeed.StudentAId && b.Status == "Từ chối"));
        }

        // ── HELPERS ───────────────────────────────────────────────────

        private static CreateBookingDto NewRequest()
        {
            var startLocal = NextWeekdayLocal(9);
            return new CreateBookingDto
            {
                ActivityName = "Học nhóm",
                Purpose = "Ôn tập",
                GuestCount = 4,
                Details = new System.Collections.Generic.List<BookingDetailItemDto>
                {
                    new()
                    {
                        RoomId = BookingTestSeed.RoomId,
                        StartAt = ToUtc(startLocal),
                        EndAt = ToUtc(startLocal.AddHours(1)),
                        GuestCount = 4,
                        Purpose = "Ôn tập"
                    }
                }
            };
        }

        private static DateTime ToUtc(DateTime local) =>
            DateTime.SpecifyKind(local.AddHours(-7), DateTimeKind.Utc);

        private static DateTime NextWeekdayLocal(int hour)
        {
            var date = DateTime.UtcNow.AddHours(7).Date.AddDays(1);
            while (date.DayOfWeek == DayOfWeek.Sunday)
                date = date.AddDays(1);
            return DateTime.SpecifyKind(date.AddHours(hour), DateTimeKind.Unspecified);
        }
    }
}
