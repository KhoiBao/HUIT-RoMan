using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Domain.Entities;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Hạn mức 2 lượt mượn mỗi tuần cho sinh viên khi tạo đơn:
    /// - Lượt thứ 3 trong cùng tuần bị chặn, mã R02_VUOT_HAN_MUC.
    /// - Đơn "Đã hủy" / "Từ chối" không đếm.
    /// - Đơn tạo hộ cho sinh viên vẫn tính vào hạn mức của sinh viên đó.
    /// - Nhân sự / giảng viên không bị giới hạn.
    /// - Đơn của tuần trước không đếm vào tuần này.
    /// </summary>
    public class BookingQuotaTests
    {
        [Fact]
        public async Task TaoDon_SinhVienLan3TrongTuan_BiChanR02()
        {
            using var h = new BookingHarness();
            var day = NextWeekdayLocal(9);
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(1)));
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(2)));

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.False(res.Success);
            Assert.Equal("R02_VUOT_HAN_MUC", res.Code);
            Assert.Equal(2, h.Db.Bookings.Count(b => b.UserId == BookingTestSeed.StudentAId));
        }

        [Fact]
        public async Task TaoDon_DonDaHuyKhongDemHanMuc()
        {
            using var h = new BookingHarness();
            var day = NextWeekdayLocal(9);
            // Đơn "Đã hủy" trùng khung giờ với đơn mới: không chặn trùng lịch, không đếm hạn mức
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day), status: "Đã hủy");
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddHours(13)));

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task TaoDon_DonBiTuChoiKhongDemHanMuc()
        {
            using var h = new BookingHarness();
            var day = NextWeekdayLocal(9);
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day), status: "Từ chối");
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddHours(13)));

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task TaoHoChoSinhVien_DemVaoHanMucCuaSinhVien()
        {
            using var h = new BookingHarness();
            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "Admin";
            h.CurrentUser.IsAdmin = true;

            var day = NextWeekdayLocal(9);
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(1)), userId: BookingTestSeed.StudentAId);
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(2)), userId: BookingTestSeed.StudentAId);

            var req = NewRequest();
            req.UserId = BookingTestSeed.StudentAId;

            var res = await h.BookingService.CreateBookingAsync(req);

            Assert.False(res.Success);
            Assert.Equal("R02_VUOT_HAN_MUC", res.Code);
        }

        [Fact]
        public async Task TaoDon_NhanVienKhongBiGioiHan()
        {
            using var h = new BookingHarness();
            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "Employee";

            var day = NextWeekdayLocal(9);
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(1)), userId: BookingTestSeed.AdminId);
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(2)), userId: BookingTestSeed.AdminId);

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task TaoDon_DonTuanTruocKhongDemVaoTuanNay()
        {
            using var h = new BookingHarness();
            var day = NextWeekdayLocal(9);
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(-7)));
            BookingTestSeed.MakeBooking(h.Db, ToUtc(day.AddDays(-8)));

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.True(res.Success, res.Message);
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
                Details = new List<BookingDetailItemDto>
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
