using System;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace HUIT_RoMan.Tests
{
    public class BookingApprovalEmailTests
    {
        [Fact]
        public async Task DuyetDon_TuDongGuiEmailThongBaoDuyet()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(4), status: "Chờ duyệt");

            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "admin";
            h.CurrentUser.IsAdmin = true;

            var res = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto
            {
                Decision = "Đã duyệt"
            });

            Assert.True(res.Success);

            // Kiểm tra IEmailService được gọi đúng tham số
            h.EmailMock.Verify(m => m.SendBookingApprovalEmailAsync(
                "svA@huit.edu.vn",
                It.Is<string>(name => name.Contains("Sinh viên A")),
                booking.Id,
                booking.ActivityName,
                "Đã duyệt",
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task TuChoiDon_TuDongGuiEmailThongBaoTuChoi()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(4), status: "Chờ duyệt");

            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "admin";
            h.CurrentUser.IsAdmin = true;

            var reason = "Phòng cần sửa chữa đột xuất";
            var res = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto
            {
                Decision = "Từ chối",
                RejectionReason = reason
            });

            Assert.True(res.Success);

            // Kiểm tra gửi email từ chối kèm lý do
            h.EmailMock.Verify(m => m.SendBookingApprovalEmailAsync(
                "svA@huit.edu.vn",
                It.IsAny<string>(),
                booking.Id,
                booking.ActivityName,
                "Từ chối",
                reason,
                It.IsAny<string?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task QuanLyHuyDon_TuDongGuiEmailThongBaoHuy()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(4), status: "Đã duyệt");

            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "admin";
            h.CurrentUser.IsAdmin = true;

            var cancelReq = new CancelBookingRequest
            {
                Reason = "ADMIN_OVERRIDE",
                ReasonDetail = "Ưu tiên phục vụ kỳ thi tốt nghiệp"
            };

            var res = await h.BookingService.CancelBookingAsync(booking.Id, cancelReq);
            Assert.True(res.Success);

            // Kiểm tra email hủy bởi quản lý được kích hoạt
            h.EmailMock.Verify(m => m.SendBookingApprovalEmailAsync(
                "svA@huit.edu.vn",
                It.IsAny<string>(),
                booking.Id,
                booking.ActivityName,
                "Đã hủy bởi quản trị",
                It.Is<string?>(r => r != null && r.Contains("Ưu tiên phục vụ kỳ thi tốt nghiệp")),
                It.IsAny<string?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task EmailService_KhiSmtpTat_MockModeHoatDongBinhThuong()
        {
            var options = Options.Create(new SmtpSettings
            {
                EnableEmail = false,
                Host = "smtp.gmail.com"
            });
            var emailService = new EmailService(options, NullLogger<EmailService>.Instance);

            var sent = await emailService.SendBookingApprovalEmailAsync(
                "test@huit.edu.vn",
                "Nguyễn Văn A",
                101,
                "Hội thảo khoa học",
                "Đã duyệt",
                null,
                "Phòng TV01",
                DateTime.UtcNow,
                DateTime.UtcNow.AddHours(2));

            Assert.True(sent);
        }

        [Fact]
        public async Task EmailService_DiaChiRong_TraVeFalse()
        {
            var options = Options.Create(new SmtpSettings { EnableEmail = true });
            var emailService = new EmailService(options, NullLogger<EmailService>.Instance);

            var sent = await emailService.SendEmailAsync("", "Tiêu đề test", "<p>Nội dung</p>");

            Assert.False(sent);
        }
    }
}

