using System;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Usage.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Tổng thời gian gia hạn của một lượt mượn không được vượt quá 60 phút
    /// (mã R13_VUOT_HAN_MUC_GIA_HAN), tính trên tổng các BookingExtension "Đã áp dụng".
    /// </summary>
    public class BookingExtensionCapTests
    {
        [Fact]
        public async Task GiaHan_Lan1_60Phut_ThanhCong()
        {
            using var h = new BookingHarness();
            var (session, detail) = await SeedActiveSessionAsync(h);

            var res = await h.UsageService.ExtendAsync(session.Id, NewExtend(detail.EndAt, 60));

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task GiaHan_Lan2_TongVuot60_BiChanR13()
        {
            using var h = new BookingHarness();
            var (session, detail) = await SeedActiveSessionAsync(h);
            SeedExtension(h, session.Id, detail, 30);

            var res = await h.UsageService.ExtendAsync(session.Id, NewExtend(detail.EndAt, 45));

            Assert.False(res.Success);
            Assert.Equal("R13_VUOT_HAN_MUC_GIA_HAN", res.Code);
            Assert.Contains("30", res.Message);
        }

        [Fact]
        public async Task GiaHan_Lan2_TongDung60_ThanhCong()
        {
            using var h = new BookingHarness();
            var (session, detail) = await SeedActiveSessionAsync(h);
            var originalEndAt = detail.EndAt;
            SeedExtension(h, session.Id, detail, 30);

            var res = await h.UsageService.ExtendAsync(session.Id, NewExtend(originalEndAt, 30));

            Assert.True(res.Success, res.Message);

            var updated = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.Id == detail.Id);
            Assert.Equal(ToUtc(originalEndAt.AddMinutes(30)), updated.EndAt);
        }

        [Fact]
        public async Task GiaHan_TongDa60_BiChanR13()
        {
            using var h = new BookingHarness();
            var (session, detail) = await SeedActiveSessionAsync(h);
            SeedExtension(h, session.Id, detail, 60);

            var res = await h.UsageService.ExtendAsync(session.Id, NewExtend(detail.EndAt, 15));

            Assert.False(res.Success);
            Assert.Equal("R13_VUOT_HAN_MUC_GIA_HAN", res.Code);
        }

        // ── HELPERS ───────────────────────────────────────────────────

        private static async Task<(UsageSession Session, BookingDetail Detail)> SeedActiveSessionAsync(BookingHarness h)
        {
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(-1));
            var detail = await h.Db.BookingDetails.FirstAsync(d => d.BookingId == booking.Id);

            var session = new UsageSession
            {
                BookingDetailId = detail.Id,
                UserId = booking.UserId,
                Status = "Đang sử dụng",
                ConfirmationCode = "HUIT-EXT001"
            };
            h.Db.UsageSessions.Add(session);
            await h.Db.SaveChangesAsync();

            return (session, detail);
        }

        private static void SeedExtension(BookingHarness h, int sessionId, BookingDetail detail, int minutes)
        {
            h.Db.BookingExtensions.Add(new BookingExtension
            {
                BookingDetailId = detail.Id,
                UsageSessionId = sessionId,
                PreviousEndAt = detail.EndAt.AddMinutes(-minutes),
                NewEndAt = detail.EndAt,
                RequestedByUserId = BookingTestSeed.StudentAId,
                RequestedAt = DateTime.UtcNow,
                Status = "Đã áp dụng",
                CreatedAt = DateTime.UtcNow
            });
            h.Db.SaveChanges();
        }

        private static ExtendUsageSessionRequestDto NewExtend(DateTime endAtUtc, int minutes) => new()
        {
            NewEndAt = ToUtc(endAtUtc.AddMinutes(minutes))
        };

        private static DateTime ToUtc(DateTime utc) =>
            DateTime.SpecifyKind(utc, DateTimeKind.Utc);
    }
}
