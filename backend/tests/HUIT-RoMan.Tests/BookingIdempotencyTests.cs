using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Chống gửi trùng khi tạo đơn bằng IdempotencyKey (header X-Idempotency-Key):
    /// - Gửi lại cùng key cho cùng người đặt → trả về đơn gốc, không tạo đơn mới.
    /// - Key khác → tạo đơn mới.
    /// - Duy nhất theo (UserId, Key): key giống nhau nhưng khác người đặt thì vẫn tạo đơn mới.
    /// </summary>
    public class BookingIdempotencyTests
    {
        [Fact]
        public async Task TaoDon_GuiLaiCungKey_TraVeDonGoc()
        {
            using var h = new BookingHarness();
            var req = NewRequest("KEY-ABC-001");

            var first = await h.BookingService.CreateBookingAsync(req);
            Assert.True(first.Success, first.Message);

            var second = await h.BookingService.CreateBookingAsync(NewRequest("KEY-ABC-001"));

            Assert.True(second.Success, second.Message);
            Assert.Equal(first.Data!.Id, second.Data!.Id);
            Assert.Equal(1, await h.Db.Bookings.CountAsync(b => b.UserId == BookingTestSeed.StudentAId));
        }

        [Fact]
        public async Task TaoDon_KeyKhac_TaoDonMoi()
        {
            using var h = new BookingHarness();

            var first = await h.BookingService.CreateBookingAsync(NewRequest("KEY-1"));
            var second = await h.BookingService.CreateBookingAsync(NewRequest("KEY-2", dayOffset: 1));

            Assert.True(first.Success, first.Message);
            Assert.True(second.Success, second.Message);
            Assert.NotEqual(first.Data!.Id, second.Data!.Id);
            Assert.Equal(2, await h.Db.Bookings.CountAsync(b => b.UserId == BookingTestSeed.StudentAId));
        }

        [Fact]
        public async Task TaoDon_KeyCuaUserKhac_VanTaoDonMoi()
        {
            using var h = new BookingHarness();

            var first = await h.BookingService.CreateBookingAsync(NewRequest("KEY-SHARED"));

            h.CurrentUser.UserId = BookingTestSeed.StudentBId;
            var second = await h.BookingService.CreateBookingAsync(NewRequest("KEY-SHARED", dayOffset: 1));

            Assert.True(first.Success, first.Message);
            Assert.True(second.Success, second.Message);
            Assert.Equal(2, await h.Db.Bookings.CountAsync(b => b.IdempotencyKey == "KEY-SHARED"));
        }

        [Fact]
        public async Task TaoDon_KeyQua64KyTu_BiLoi()
        {
            using var h = new BookingHarness();

            var res = await h.BookingService.CreateBookingAsync(NewRequest(new string('K', 65)));

            Assert.False(res.Success);
        }

        [Fact]
        public async Task TaoDon_KhongGuiKey_KhongGanKey()
        {
            using var h = new BookingHarness();

            var res = await h.BookingService.CreateBookingAsync(NewRequest("   "));

            Assert.True(res.Success, res.Message);
            var saved = await h.Db.Bookings.AsNoTracking().SingleAsync(b => b.UserId == BookingTestSeed.StudentAId);
            Assert.Null(saved.IdempotencyKey);
        }

        // ── HELPERS ───────────────────────────────────────────────────

        private static CreateBookingDto NewRequest(string? idempotencyKey, int dayOffset = 0)
        {
            var startLocal = NextWeekdayLocal(9).AddDays(dayOffset);
            return new CreateBookingDto
            {
                ActivityName = "Học nhóm",
                Purpose = "Ôn tập",
                GuestCount = 4,
                IdempotencyKey = idempotencyKey,
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
