using System;
using HUIT_RoMan.Application.Modules.Booking.Services;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Tuần hạn mức theo giờ Việt Nam (UTC+7): bắt đầu Thứ Hai 00:00, kết thúc Chủ Nhật 24:00.
    /// Mốc tham chiếu: 2026-11-09 là Thứ Hai, 2026-11-15 là Chủ Nhật.
    /// </summary>
    public class BookingQuotaPolicyTests
    {
        [Fact]
        public void TuanBatDauThuHai_KetThucChuNhat_GioVN()
        {
            // Thứ Tư 2026-11-11, 15:00 giờ VN = 08:00 UTC
            var (weekStartUtc, weekEndUtc) = BookingQuotaPolicy.GetVietnamWeekRangeUtc(
                new DateTime(2026, 11, 11, 8, 0, 0, DateTimeKind.Utc));

            Assert.Equal(new DateTime(2026, 11, 8, 17, 0, 0, DateTimeKind.Utc), weekStartUtc);   // Thứ Hai 00:00 VN
            Assert.Equal(new DateTime(2026, 11, 15, 17, 0, 0, DateTimeKind.Utc), weekEndUtc);   // Thứ Hai tuần sau 00:00 VN
        }

        [Fact]
        public void RanhGioiTiet00_ThuHaiThuocTuanMoi()
        {
            // Thứ Hai 2026-11-09, 00:30 giờ VN = 2026-11-08 17:30 UTC → tuần mới bắt đầu đúng đó
            var (weekStartUtc, weekEndUtc) = BookingQuotaPolicy.GetVietnamWeekRangeUtc(
                new DateTime(2026, 11, 8, 17, 30, 0, DateTimeKind.Utc));

            Assert.Equal(new DateTime(2026, 11, 8, 17, 0, 0, DateTimeKind.Utc), weekStartUtc);
            Assert.Equal(new DateTime(2026, 11, 15, 17, 0, 0, DateTimeKind.Utc), weekEndUtc);
        }

        [Fact]
        public void ChuNhatTiet23_59VanThuocTuanDo()
        {
            // Chủ Nhật 2026-11-15, 23:59 giờ VN = 16:59 UTC
            var (weekStartUtc, weekEndUtc) = BookingQuotaPolicy.GetVietnamWeekRangeUtc(
                new DateTime(2026, 11, 15, 16, 59, 0, DateTimeKind.Utc));

            Assert.Equal(new DateTime(2026, 11, 8, 17, 0, 0, DateTimeKind.Utc), weekStartUtc);
            Assert.Equal(new DateTime(2026, 11, 15, 17, 0, 0, DateTimeKind.Utc), weekEndUtc);
        }

        [Fact]
        public void UtcToiTinhNangNgayVN()
        {
            // 2026-11-07 18:00 UTC = Chủ Nhật 2026-11-08 01:00 giờ VN → tuần bắt đầu Thứ Hai 02/11
            var (weekStartUtc, weekEndUtc) = BookingQuotaPolicy.GetVietnamWeekRangeUtc(
                new DateTime(2026, 11, 7, 18, 0, 0, DateTimeKind.Utc));

            Assert.Equal(new DateTime(2026, 11, 1, 17, 0, 0, DateTimeKind.Utc), weekStartUtc);  // Thứ Hai 02/11 00:00 VN
            Assert.Equal(new DateTime(2026, 11, 8, 17, 0, 0, DateTimeKind.Utc), weekEndUtc);
        }

        [Fact]
        public void HanMucLa2LuotMoiTuan()
        {
            Assert.Equal(2, BookingQuotaPolicy.MaxBookingsPerWeek);
        }
    }
}
