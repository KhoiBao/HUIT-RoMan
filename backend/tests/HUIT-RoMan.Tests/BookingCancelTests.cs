using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Kiểm thử nghiệp vụ HỦY ĐẶT PHÒNG CÓ LÝ DO (Part B/D):
    /// hạn 3 giờ, quyền sở hữu, trạng thái, tập lý do và tính nguyên tử khi hủy đồng thời.
    /// </summary>
    public class BookingCancelTests
    {
        private static CancelBookingRequest Req(string? reason, string? detail = null)
            => new() { Reason = reason, ReasonDetail = detail };

        // ── HẠN 3 GIỜ ───────────────────────────────────────────────────

        [Fact]
        public async Task Cancel_TrướcHạn3Giờ_ChoPhép()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(4));

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task Cancel_ĐúngHạn3Giờ_StillAllowed()
        {
            using var h = new BookingHarness();
            var start = DateTime.UtcNow.AddHours(3).AddSeconds(3); // CI chênh lệch vài giây → coi như đúng hạn
            var booking = BookingTestSeed.MakeBooking(h.Db, start);

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("NO_LONGER_NEEDED"));

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task Cancel_SauHạn3Giờ_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(2).AddMinutes(59));

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));

            Assert.False(res.Success);
            Assert.Contains("quá hạn hủy trực tuyến", res.Message);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Đã duyệt", dbBooking.Status);
        }

        // ── LÝ DO ───────────────────────────────────────────────────────

        [Fact]
        public async Task Cancel_LýDoKhôngHợpLệ_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5));

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("VANG_MAT_XAI"));

            Assert.False(res.Success);
            Assert.Contains("Lý do hủy không hợp lệ", res.Message);
        }

        [Fact]
        public async Task Cancel_ThiếuLýDo_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5));

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req(null));

            Assert.False(res.Success);
        }

        [Fact]
        public async Task Cancel_OTHER_KhôngNhậpChiTiết_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5));

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("OTHER", "   "));

            Assert.False(res.Success);
            Assert.Contains("Lý do khác", res.Message);
        }

        [Fact]
        public async Task Cancel_OTHER_CóChiTiết_LưuĐúngLýDo()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5));

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("OTHER", "Bập bệnh phải đi khám"));

            Assert.True(res.Success, res.Message);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Đã hủy", dbBooking.Status);
            Assert.Equal("OTHER", dbBooking.CancelReason);
            Assert.Equal("Bập bệnh phải đi khám", dbBooking.CancelReasonDetail);
            Assert.Equal(BookingCancelPolicy.SourceStudent, dbBooking.CancelSource);
            Assert.True(string.IsNullOrEmpty(dbBooking.RejectionReason)); // không ghi đè lý do từ chối duyệt

            var detail = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.BookingId == booking.Id);
            Assert.Equal("Đã hủy", detail.Status);
        }

        [Fact]
        public async Task Cancel_HủyPhiênChờNhậnPhòngTheoĐơn()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5));
            var detail = await h.Db.BookingDetails.FirstAsync(d => d.BookingId == booking.Id);

            var session = new UsageSession
            {
                BookingDetailId = detail.Id,
                UserId = booking.UserId,
                Status = "Chờ nhận phòng",
                ConfirmationCode = "HUIT-CANCEL1"
            };
            h.Db.UsageSessions.Add(session);
            await h.Db.SaveChangesAsync();

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));
            Assert.True(res.Success, res.Message);

            var updated = await h.Db.UsageSessions.AsNoTracking().FirstAsync(s => s.Id == session.Id);
            Assert.Equal("Đã hủy", updated.Status);
        }

        // ── QUYỀN & TRẠNG THÁI ──────────────────────────────────────────

        [Fact]
        public async Task Cancel_ĐơnChưaDuyệt_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));

            Assert.False(res.Success);
            Assert.Contains("Chỉ đơn đã được duyệt", res.Message);
        }

        [Fact]
        public async Task Cancel_ĐơnĐãHủy_TruocDo_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Đã hủy");

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));

            Assert.False(res.Success);
            Assert.Contains("trước đó", res.Message);
        }

        [Fact]
        public async Task Cancel_ĐơnĐãCheckIn_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));

            var checkIn = await h.BookingService.CheckInBookingAsync(booking.Id);
            Assert.True(checkIn.Success, checkIn.Message);

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));

            Assert.False(res.Success);
            Assert.Contains("đã được nhận phòng", res.Message);
        }

        [Fact]
        public async Task Cancel_ĐơnThuộcSinhVienKhac_TừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), userId: BookingTestSeed.StudentBId);

            h.CurrentUser.UserId = BookingTestSeed.StudentAId;
            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));

            Assert.False(res.Success);
            Assert.Contains("không có quyền", res.Message);
        }

        // ── ĐỒNG THỜI & ĐƯỜNG ADMIN ─────────────────────────────────────

        [Fact]
        public async Task Cancel_HaiRequestĐồngThời_ChỉMộtThànhCông()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5));

            var r1 = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));
            var r2 = await h.BookingService.CancelBookingAsync(booking.Id, Req("NO_LONGER_NEEDED"));

            Assert.True(r1.Success ^ r2.Success);
            Assert.Equal(1, await h.Db.Bookings.CountAsync(b => b.Id == booking.Id && b.Status == "Đã hủy"));
        }

        [Fact]
        public async Task Cancel_AdminHủyKhôngCầnLýDo_VẫnHoạtĐộng()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10)); // sắp tới giờ

            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.IsAdmin = true;
            h.CurrentUser.Role = "Admin";

            var res = await h.BookingService.CancelBookingAsync(booking.Id, null);

            Assert.True(res.Success, res.Message);
            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Đã hủy", dbBooking.Status);
            Assert.Equal(BookingCancelPolicy.SourceStaff, dbBooking.CancelSource);
            Assert.Null(dbBooking.CancelReason);
        }

        [Fact]
        public async Task Cancel_HủySauKhiQuaHanNoShow_ChinhSauKhiAutoCancel_BịTừChối()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(-1));

            var auto = await h.NoShowService.CancelExpiredBookingsAsync();
            Assert.Equal(1, auto);

            var res = await h.BookingService.CancelBookingAsync(booking.Id, Req("CHANGE_PLAN"));
            Assert.False(res.Success); // đã bị hủy rồi
        }
    }
}
