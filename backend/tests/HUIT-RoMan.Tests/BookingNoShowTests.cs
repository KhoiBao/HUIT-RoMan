using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Kiểm thử tác vụ nền tự động hủy đơn không nhận phòng đúng hạn (Part A.5 / Part D):
    /// chỉ hủy đơn quá hạn chưa check-in, an toàn khi chạy lặp (không hủy lặp, không trùng thông báo).
    /// </summary>
    public class BookingNoShowTests
    {
        [Fact]
        public async Task NoShow_ĐơnQuáHạn_ChưaCheckIn_BịTựĐộngHủy()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-2)); // đã quá T

            var cancelled = await h.NoShowService.CancelExpiredBookingsAsync();

            Assert.Equal(1, cancelled);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Đã hủy", dbBooking.Status);
            Assert.Equal(BookingCancelPolicy.ReasonNoShow, dbBooking.CancelReason);
            Assert.Equal(BookingCancelPolicy.SourceAuto, dbBooking.CancelSource);

            var detail = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.BookingId == booking.Id);
            Assert.Equal("Đã hủy", detail.Status);
        }

        [Fact]
        public async Task NoShow_ĐơnĐãCheckIn_KhôngBịHủy()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));
            var checkIn = await h.BookingService.CheckInBookingAsync(booking.Id);
            Assert.True(checkIn.Success, checkIn.Message);

            var cancelled = await h.NoShowService.CancelExpiredBookingsAsync();

            Assert.Equal(0, cancelled);
            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Đang sử dụng", dbBooking.Status);
        }

        [Fact]
        public async Task NoShow_ĐơnTrướcGiờChưaCheckIn_KhôngBịHủy()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(30));

            var cancelled = await h.NoShowService.CancelExpiredBookingsAsync();

            Assert.Equal(0, cancelled);
            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Đã duyệt", dbBooking.Status);
        }

        [Fact]
        public async Task NoShow_ĐơnChưaDuyệt_KhôngBịXửLýNhưNoShow()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-5), status: "Chờ duyệt");

            var cancelled = await h.NoShowService.CancelExpiredBookingsAsync();

            Assert.Equal(0, cancelled);
            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Chờ duyệt", dbBooking.Status);
        }

        [Fact]
        public async Task NoShow_ĐơnĐãHủyTrướcĐó_KhôngBịXửLýLại()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-5), status: "Đã hủy");

            var cancelled = await h.NoShowService.CancelExpiredBookingsAsync();

            Assert.Equal(0, cancelled);
        }

        [Fact]
        public async Task NoShow_ChạyLặpLại_KhôngHủyLặp_KhôngTrùngThôngBáo()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-2));

            var first = await h.NoShowService.CancelExpiredBookingsAsync();
            var second = await h.NoShowService.CancelExpiredBookingsAsync();
            var third = await h.NoShowService.CancelExpiredBookingsAsync();

            Assert.Equal(1, first);
            Assert.Equal(0, second);
            Assert.Equal(0, third);

            // Đúng một thông báo được tạo, đúng một lần hủy.
            Assert.Equal(1, await h.Db.Notifications.CountAsync(n => n.UserId == BookingTestSeed.StudentAId));
            var detail = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.BookingId == booking.Id);
            Assert.Equal("Đã hủy", detail.Status);
        }

        [Fact]
        public async Task NoShow_HủyGiảiPhongPhongChoLichMoi()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-2));
            var start = await h.Db.BookingDetails.AsNoTracking()
                .Where(d => d.BookingId == booking.Id)
                .Select(d => d.StartAt)
                .FirstAsync();

            await h.NoShowService.CancelExpiredBookingsAsync();

            // Sau khi hủy, khung giờ không còn bị chiếm: một đơn mới cùng phòng/cùng giờ được chấp nhận.
            var conflict = await h.Db.BookingDetails.AsNoTracking()
                .CountAsync(d => d.RoomId == BookingTestSeed.RoomId
                              && d.Status != "Từ chối"
                              && d.Status != "Đã hủy"
                              && d.StartAt < start.AddHours(2)
                              && d.EndAt > start);
            Assert.Equal(0, conflict);
        }

        [Fact]
        public async Task NoShow_2ĐơnQuáHạn_Cả2ĐềuBịHủy()
        {
            using var h = new BookingHarness();
            var b1 = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-10));
            var b2 = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-5));

            var cancelled = await h.NoShowService.CancelExpiredBookingsAsync();

            Assert.Equal(2, cancelled);
            Assert.Equal(2, await h.Db.Bookings.CountAsync(b => b.Status == "Đã hủy"));
        }
    }
}
