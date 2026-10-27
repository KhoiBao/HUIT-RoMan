using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Usage.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Kiểm thử nghiệp vụ NHẬN PHÒNG (check-in) theo Part D:
    /// cửa sổ [T - 15 phút, T), quyền sở hữu, trạng thái, chống check-in lặp.
    /// </summary>
    public class BookingCheckInTests
    {
        // ── CỬA SỔ GIỜ ──────────────────────────────────────────────────

        [Fact]
        public async Task CheckIn_Trước_T_15_Phút_Bị_Từ_Chối()
        {
            using var h = new BookingHarness();
            var start = DateTime.UtcNow.AddMinutes(20); // còn 20 phút nữa mới mở
            var booking = BookingTestSeed.MakeBooking(h.Db, start);

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.False(res.Success);
            Assert.Contains("Chưa đến thời điểm nhận phòng", res.Message);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Null(dbBooking.CheckedInAt);
            Assert.Equal("Đã duyệt", dbBooking.Status);
        }

        [Fact]
        public async Task CheckIn_Đúng_T_15_Phút_Trước_Start_Thành_Công()
        {
            using var h = new BookingHarness();
            var start = DateTime.UtcNow.AddMinutes(15);
            var booking = BookingTestSeed.MakeBooking(h.Db, start);

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.True(res.Success, res.Message);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.NotNull(dbBooking.CheckedInAt);

            var detail = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.BookingId == booking.Id);
            Assert.Equal("Đang sử dụng", detail.Status);

            var session = await h.Db.UsageSessions.AsNoTracking().FirstOrDefaultAsync(s => s.BookingDetailId == detail.Id);
            Assert.NotNull(session);
            Assert.Equal("Đang sử dụng", session!.Status);
        }

        [Fact]
        public async Task CheckIn_Ngay_Trước_Start_Vẫn_Thành_Công()
        {
            using var h = new BookingHarness();
            var start = DateTime.UtcNow.AddSeconds(30);
            var booking = BookingTestSeed.MakeBooking(h.Db, start);

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task CheckIn_Đúng_Start_Bị_Từ_Chối()
        {
            using var h = new BookingHarness();
            var start = DateTime.UtcNow; // đúng T
            var booking = BookingTestSeed.MakeBooking(h.Db, start);

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.False(res.Success);
            Assert.Contains("hết thời hạn nhận phòng", res.Message);
        }

        [Fact]
        public async Task CheckIn_Sau_Start_Bị_Từ_Chối()
        {
            using var h = new BookingHarness();
            var start = DateTime.UtcNow.AddMinutes(-5);
            var booking = BookingTestSeed.MakeBooking(h.Db, start);

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.False(res.Success);
        }

        // ── QUYỀN SỞ HỮU & TRẠNG THÁI ───────────────────────────────────

        [Fact]
        public async Task CheckIn_Đơn_Chưa_Duyệt_Bị_Từ_Chối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), status: "Chờ duyệt");

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.False(res.Success);
            Assert.Contains("chưa được duyệt", res.Message);
        }

        [Fact]
        public async Task CheckIn_Đơn_Thuộc_Sinh_Viên_Khác_Bị_Từ_Chối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), userId: BookingTestSeed.StudentBId);

            h.CurrentUser.UserId = BookingTestSeed.StudentAId; // không phải chủ đơn
            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.False(res.Success);
            Assert.Contains("chính mình", res.Message);
        }

        [Fact]
        public async Task CheckIn_Đơn_Đã_Hủy_Bị_Từ_Chối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), status: "Đã hủy");

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.False(res.Success);
            Assert.Contains("đã bị hủy", res.Message);
        }

        [Fact]
        public async Task CheckIn_Lần_Thứ_Hai_Bị_Từ_Chối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));

            var first = await h.BookingService.CheckInBookingAsync(booking.Id);
            Assert.True(first.Success, first.Message);

            var second = await h.BookingService.CheckInBookingAsync(booking.Id);
            Assert.False(second.Success);
            Assert.Contains("trước đó", second.Message);
        }

        [Fact]
        public async Task CheckIn_CheckInĐồngThời_2Request_Chi_1_Request_Thành_Công()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));

            var r1 = await h.BookingService.CheckInBookingAsync(booking.Id);
            var r2 = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.True(r1.Success ^ r2.Success);
            Assert.Equal(1, await h.Db.UsageSessions.CountAsync(s => s.Status == "Đang sử dụng"));
        }

        [Fact]
        public async Task CheckIn_NhieuChiTiet_Don_CheckInTatCaPhong()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), detailCount: 2);

            var res = await h.BookingService.CheckInBookingAsync(booking.Id);

            Assert.True(res.Success, res.Message);
            var details = await h.Db.BookingDetails.AsNoTracking().Where(d => d.BookingId == booking.Id).ToListAsync();
            Assert.All(details, d => Assert.Equal("Đang sử dụng", d.Status));
        }

        // ── ĐƯỜNG CHECK-IN QUA MÃ / CHI TIẾT (UsageService) ─────────────

        [Fact]
        public async Task CheckIn_QuaChiTiet_CũngÁpDụngCửaSổ15Phút()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(20)); // chưa mở
            var detail = await h.Db.BookingDetails.FirstAsync(d => d.BookingId == booking.Id);

            var res = await h.UsageService.CheckInAsync(new CheckInRequestDto
            {
                BookingDetailId = detail.Id,
                ActualGuestCount = 4
            });

            Assert.False(res.Success);
            Assert.Contains("Chưa đến thời điểm nhận phòng", res.Message);
        }

        [Fact]
        public async Task CheckIn_QuaChiTiet_TrongCửaSổ_Thành_Công_Và_GhiCheckedInAt()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));
            var detail = await h.Db.BookingDetails.FirstAsync(d => d.BookingId == booking.Id);

            var res = await h.UsageService.CheckInAsync(new CheckInRequestDto
            {
                BookingDetailId = detail.Id,
                ActualGuestCount = 4
            });

            Assert.True(res.Success, res.Message);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.NotNull(dbBooking.CheckedInAt);
        }

        [Fact]
        public async Task CheckIn_QuaChiTiet_ĐơnĐãHủy_BịTừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), status: "Đã hủy");
            var detail = await h.Db.BookingDetails.FirstAsync(d => d.BookingId == booking.Id);

            var res = await h.UsageService.CheckInAsync(new CheckInRequestDto { BookingDetailId = detail.Id });

            Assert.False(res.Success);
            // Chi tiết đơn đã hủy không còn ở trạng thái "Đã duyệt" → bị chặn ngay ở bước kiểm tra chi tiết.
            Assert.Contains("Chỉ có thể Check-in cho phòng đã được duyệt", res.Message);
        }
    }
}
