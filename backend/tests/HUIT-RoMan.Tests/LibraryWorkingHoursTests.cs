using System;
using System.Collections.Generic;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Modules.WorkingHours.Services;
using Moq;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Giờ phục vụ Thư viện chặn các lượt đặt ngoài khung giờ cấu hình,
    /// quy đổi từ UTC sang giờ Việt Nam (UTC+7).
    /// </summary>
    public class LibraryWorkingHoursTests
    {
        private static LibraryWorkingHoursProvider CreateProvider() =>
            new(Mock.Of<IUnitOfWork>());

        private static Dictionary<int, WorkingDayConfig> Week(
            bool sundayClosed = true)
        {
            var week = new Dictionary<int, WorkingDayConfig>();
            for (var day = 0; day <= 6; day++)
            {
                week[day] = new WorkingDayConfig
                {
                    OpenTime = new TimeSpan(7, 0, 0),
                    CloseTime = new TimeSpan(20, 0, 0),
                    IsClosed = sundayClosed && day == (int)DayOfWeek.Sunday
                };
            }
            return week;
        }

        [Fact]
        public void TrongKhungGio_ThiHopLe()
        {
            var error = CreateProvider().Validate(
                Week(),
                new DateTime(2026, 10, 26, 1, 0, 0, DateTimeKind.Utc),   // 08:00 VN
                new DateTime(2026, 10, 26, 3, 0, 0, DateTimeKind.Utc));  // 10:00 VN

            Assert.Null(error);
        }

        [Fact]
        public void VuotGioDongCua_ThiBaoLoi()
        {
            var error = CreateProvider().Validate(
                Week(),
                new DateTime(2026, 10, 26, 1, 0, 0, DateTimeKind.Utc),    // 08:00 VN
                new DateTime(2026, 10, 26, 14, 0, 0, DateTimeKind.Utc));  // 21:00 VN

            Assert.NotNull(error);
            Assert.Contains("07:00 – 20:00", error);
        }

        [Fact]
        public void TruocGioMoCua_ThiBaoLoi()
        {
            var error = CreateProvider().Validate(
                Week(),
                new DateTime(2026, 10, 26, 23, 0, 0, DateTimeKind.Utc),   // 06:00 VN hôm sau
                new DateTime(2026, 10, 27, 1, 0, 0, DateTimeKind.Utc));   // 08:00 VN

            Assert.NotNull(error);
            Assert.Contains("07:00 – 20:00", error);
        }

        [Fact]
        public void NgayNghi_ThiBaoLoi()
        {
            var error = CreateProvider().Validate(
                Week(),
                new DateTime(2026, 10, 25, 2, 0, 0, DateTimeKind.Utc),   // 09:00 VN Chủ Nhật
                new DateTime(2026, 10, 25, 3, 0, 0, DateTimeKind.Utc));

            Assert.NotNull(error);
            Assert.Contains("Chủ Nhật", error);
        }

        [Fact]
        public void QuaNgayKhac_ThiBaoLoi()
        {
            var error = CreateProvider().Validate(
                Week(),
                new DateTime(2026, 10, 26, 16, 0, 0, DateTimeKind.Utc),  // 23:00 VN thứ Hai
                new DateTime(2026, 10, 27, 1, 0, 0, DateTimeKind.Utc));  // 08:00 VN thứ Ba

            Assert.NotNull(error);
            Assert.Contains("cùng một ngày", error);
        }

        [Fact]
        public void KetThucTruocBatDau_ThiBaoLoi()
        {
            var error = CreateProvider().Validate(
                Week(),
                new DateTime(2026, 10, 26, 3, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 10, 26, 1, 0, 0, DateTimeKind.Utc));

            Assert.NotNull(error);
        }

        [Fact]
        public void CauHinhTuyChinh_DuocApDung()
        {
            var week = Week();
            week[(int)DayOfWeek.Monday] = new WorkingDayConfig
            {
                OpenTime = new TimeSpan(8, 0, 0),
                CloseTime = new TimeSpan(17, 0, 0),
                IsClosed = false
            };

            var provider = CreateProvider();
            var inRange = provider.Validate(
                week,
                new DateTime(2026, 10, 26, 2, 0, 0, DateTimeKind.Utc),    // 09:00 VN
                new DateTime(2026, 10, 26, 4, 0, 0, DateTimeKind.Utc));   // 11:00 VN
            var outOfRange = provider.Validate(
                week,
                new DateTime(2026, 10, 26, 2, 0, 0, DateTimeKind.Utc),    // 09:00 VN
                new DateTime(2026, 10, 26, 11, 0, 0, DateTimeKind.Utc));  // 18:00 VN

            Assert.Null(inRange);
            Assert.NotNull(outOfRange);
            Assert.Contains("08:00 – 17:00", outOfRange);
        }
    }
}
