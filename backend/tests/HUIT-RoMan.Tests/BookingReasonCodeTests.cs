using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Domain.Entities;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Mã luật từ chối gắn trên ApiResponse.Code khi tạo đơn:
    /// R01 trùng lịch, R03 sai khung thời gian sinh viên, R04 lệnh cấm, R12 thiếu thông tin.
    /// </summary>
    public class BookingReasonCodeTests
    {
        [Fact]
        public async Task TaoDon_BiLenhCam_TraVeMaR04()
        {
            using var h = new BookingHarness();
            h.Db.UserRestrictions.Add(new UserRestriction
            {
                UserId = BookingTestSeed.StudentAId,
                RestrictionType = "Cấm mượn phòng",
                Reason = "Vi phạm nội quy",
                Status = "Hoạt động",
                StartAt = DateTime.UtcNow.AddDays(-1)
            });
            h.Db.SaveChanges();

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.False(res.Success);
            Assert.Equal("R04_BI_CAM", res.Code);
        }

        [Fact]
        public async Task TaoDon_TrungLich_TraVeMaR01()
        {
            using var h = new BookingHarness();
            BookingTestSeed.MakeBooking(h.Db, ToUtc(NextWeekdayLocal(9)), status: "Đã duyệt");

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.False(res.Success);
            Assert.Equal("R01_TRUNG_LICH", res.Code);
        }

        [Fact]
        public async Task TaoDon_ThieuThongTin_TraVeMaR12()
        {
            using var h = new BookingHarness();
            var req = NewRequest();
            req.ActivityName = "";

            var res = await h.BookingService.CreateBookingAsync(req);

            Assert.False(res.Success);
            Assert.Equal("R12_THIEU_THONG_TIN", res.Code);
        }

        [Fact]
        public async Task TaoDon_SinhVienQua2Gio_TraVeMaR03()
        {
            using var h = new BookingHarness();
            var start = NextWeekdayLocal(9);
            var req = NewRequest();
            req.Details[0].StartAt = ToUtc(start);
            req.Details[0].EndAt = ToUtc(start.AddHours(2).AddMinutes(30));

            var res = await h.BookingService.CreateBookingAsync(req);

            Assert.False(res.Success);
            Assert.Equal("R03_QUA_THOI_GIAN", res.Code);
        }

        [Fact]
        public async Task TaoDon_ThanhCong_KhongGanMa()
        {
            using var h = new BookingHarness();

            var res = await h.BookingService.CreateBookingAsync(NewRequest());

            Assert.True(res.Success, res.Message);
            Assert.Null(res.Code);
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
