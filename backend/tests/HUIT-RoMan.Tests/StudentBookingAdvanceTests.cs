using System;
using HUIT_RoMan.Application.Modules.Booking.Services;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Sinh viên chỉ được đặt phòng thư viện trước tối đa 2 tuần (14 ngày lịch VN).
    /// </summary>
    public class StudentBookingAdvanceTests
    {
        // now = 30/10/2026 08:00 giờ VN.
        private static readonly DateTime NowUtc = new(2026, 10, 30, 1, 0, 0, DateTimeKind.Utc);

        [Fact]
        public void Đúng14Ngày_ThìHợpLệ()
        {
            // 13/11/2026 09:00 giờ VN.
            var startUtc = new DateTime(2026, 11, 13, 2, 0, 0, DateTimeKind.Utc);

            Assert.Null(StudentBookingPolicy.ValidateAdvanceWindow(startUtc, NowUtc));
        }

        [Fact]
        public void Quá14Ngày_ThìTừChối()
        {
            // 14/11/2026 09:00 giờ VN.
            var startUtc = new DateTime(2026, 11, 14, 2, 0, 0, DateTimeKind.Utc);

            var error = StudentBookingPolicy.ValidateAdvanceWindow(startUtc, NowUtc);

            Assert.Equal("Chỉ được đặt phòng trước tối đa 2 tuần.", error);
        }
    }
}
