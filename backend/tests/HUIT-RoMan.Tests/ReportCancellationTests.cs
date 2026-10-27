using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Report.DTOs;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Kiểm thử báo cáo Part C: phân biệt sinh viên tự hủy / tự động hủy (no-show),
    /// không tính đơn "Từ chối" là đơn hủy, không suy đoán lý do đơn cũ.
    /// </summary>
    public class ReportCancellationTests
    {
        private static ReportFilterDto WideFilter() => new()
        {
            FromDate = DateTime.UtcNow.AddDays(-30),
            ToDate = DateTime.UtcNow.AddDays(1)
        };

        private static void MarkCancelled(ApplicationDbContext db, int bookingId, string? source, string? reason, string? detail = null)
        {
            var booking = db.Bookings.First(b => b.Id == bookingId);
            booking.Status = "Đã hủy";
            booking.CancelSource = source;
            booking.CancelReason = reason;
            booking.CancelReasonDetail = detail;
            db.SaveChanges();
        }

        [Fact]
        public async Task Reports_PhânBiệtĐơnHủyTheoNguồn()
        {
            using var h = new BookingHarness();

            var studentCancelled = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2));
            var noShowCancelled = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2));
            var legacyCancelled = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2));
            var rejected = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2), status: "Từ chối");
            var approved = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2));

            MarkCancelled(h.Db, studentCancelled.Id, BookingCancelPolicy.SourceStudent, BookingCancelPolicy.ReasonChangePlan);
            MarkCancelled(h.Db, noShowCancelled.Id, BookingCancelPolicy.SourceAuto, BookingCancelPolicy.ReasonNoShow);
            MarkCancelled(h.Db, legacyCancelled.Id, null, null); // đơn cũ trước khi có tính năng

            var report = await h.CreateReportService().GetBookingStatsReportAsync(WideFilter());

            Assert.True(report.Success, report.Message);
            var overview = report.Data!.Overview;

            Assert.Equal(5, overview.TotalBookings);
            Assert.Equal(3, overview.CancelledBookings);
            Assert.Equal(1, overview.CancelledByStudent);
            Assert.Equal(1, overview.CancelledByNoShow);
            Assert.Equal(1, overview.CancelledUnknownSource);
            Assert.Equal(0, overview.CancelledByStaff);
            // Đơn từ chối không bị tính là đơn hủy
            Assert.Equal(1, overview.RejectedBookings);
        }

        [Fact]
        public async Task Reports_ThongKeHuyTheoLyDo_KhongSuyDoanLyDoDonCu()
        {
            using var h = new BookingHarness();

            var c1 = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2));
            var c2 = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2));
            var c3 = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2));

            MarkCancelled(h.Db, c1.Id, BookingCancelPolicy.SourceStudent, BookingCancelPolicy.ReasonChangePlan);
            MarkCancelled(h.Db, c2.Id, BookingCancelPolicy.SourceStudent, BookingCancelPolicy.ReasonChangePlan);
            MarkCancelled(h.Db, c3.Id, null, null); // đơn cũ không có dữ liệu

            var report = await h.CreateReportService().GetBookingStatsReportAsync(WideFilter());
            var stats = report.Data!.CancellationReasonStats;

            Assert.Equal(2, stats.Count);
            var changePlan = stats.First(s => s.Name == "Thay đổi kế hoạch");
            Assert.Equal(2, changePlan.Count);
            var unknown = stats.First(s => s.Name == "Chưa có thông tin lý do hủy");
            Assert.Equal(1, unknown.Count);
        }

        [Fact]
        public async Task Reports_ĐơnTừChốiKhôngBịĐếmThànhĐơnHủy()
        {
            using var h = new BookingHarness();

            BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddDays(2), status: "Từ chối");

            var report = await h.CreateReportService().GetBookingStatsReportAsync(WideFilter());

            var overview = report.Data!.Overview;
            Assert.Equal(0, overview.CancelledBookings);
            Assert.Equal(1, overview.RejectedBookings);
            Assert.Empty(report.Data.CancellationReasonStats);
        }
    }
}
