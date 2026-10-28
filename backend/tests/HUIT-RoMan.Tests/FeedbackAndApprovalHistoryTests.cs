using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Feedback.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    public class FeedbackAndApprovalHistoryTests
    {
        // ── FEEDBACK TESTS ───────────────────────────────────────────────

        [Fact]
        public async Task Feedback_GuiDanhGiaThanhCong_TaoBanGhiFeedback()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));
            // Check-in để tạo UsageSession
            var checkInRes = await h.BookingService.CheckInBookingAsync(booking.Id);
            Assert.True(checkInRes.Success);

            var feedbackService = h.CreateFeedbackService();
            var createDto = new CreateFeedbackDto
            {
                BookingId = booking.Id,
                Rating = 5,
                Comment = "Phòng rất thoáng mát, wifi mạnh!"
            };

            var res = await feedbackService.CreateFeedbackAsync(createDto);

            Assert.True(res.Success, res.Message);
            Assert.NotNull(res.Data);
            Assert.Equal(5, res.Data.Rating);
            Assert.Equal("Phòng rất thoáng mát, wifi mạnh!", res.Data.Comment);

            // Kiểm tra DB
            var dbFeedback = await h.Db.Feedbacks.FirstOrDefaultAsync(f => f.UserId == BookingTestSeed.StudentAId);
            Assert.NotNull(dbFeedback);
            Assert.Equal(5, dbFeedback.Rating);
        }

        [Fact]
        public async Task Feedback_GuiDanhGiaLai_CapNhatDanhGiaCu()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));
            await h.BookingService.CheckInBookingAsync(booking.Id);

            var feedbackService = h.CreateFeedbackService();
            await feedbackService.CreateFeedbackAsync(new CreateFeedbackDto
            {
                BookingId = booking.Id,
                Rating = 5,
                Comment = "Lần 1: Rất tốt"
            });

            // Gửi lại sửa thành 4 sao
            var updateRes = await feedbackService.CreateFeedbackAsync(new CreateFeedbackDto
            {
                BookingId = booking.Id,
                Rating = 4,
                Comment = "Lần 2: Máy chiếu hơi mờ"
            });

            Assert.True(updateRes.Success);
            Assert.Equal(4, updateRes.Data!.Rating);
            Assert.Equal("Lần 2: Máy chiếu hơi mờ", updateRes.Data.Comment);

            // Chỉ có 1 bản ghi duy nhất trong DB cho session này
            var totalCount = await h.Db.Feedbacks.CountAsync(f => f.UserId == BookingTestSeed.StudentAId && !f.IsDeleted);
            Assert.Equal(1, totalCount);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(6)]
        [InlineData(-1)]
        public async Task Feedback_SoSaoKhongHopLe_TuChoi(int invalidRating)
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10));
            await h.BookingService.CheckInBookingAsync(booking.Id);

            var feedbackService = h.CreateFeedbackService();
            var res = await feedbackService.CreateFeedbackAsync(new CreateFeedbackDto
            {
                BookingId = booking.Id,
                Rating = invalidRating,
                Comment = "Test"
            });

            Assert.False(res.Success);
            Assert.Contains("1 đến 5 sao", res.Message);
        }

        [Fact]
        public async Task Feedback_SinhVienKhacDanhGia_TuChoi()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), userId: BookingTestSeed.StudentAId);
            await h.BookingService.CheckInBookingAsync(booking.Id);

            // Đổi người dùng thành Sinh viên B
            h.CurrentUser.UserId = BookingTestSeed.StudentBId;
            h.CurrentUser.Role = "student";

            var feedbackService = h.CreateFeedbackService();
            var res = await feedbackService.CreateFeedbackAsync(new CreateFeedbackDto
            {
                BookingId = booking.Id,
                Rating = 5,
                Comment = "Đánh giá trộm của người khác"
            });

            Assert.False(res.Success);
            Assert.Contains("chỉ có thể đánh giá phiên phòng của chính mình", res.Message);
        }

        [Fact]
        public async Task Feedback_LayTongHopPhong_TinhDungDiemTrungBinh()
        {
            using var h = new BookingHarness();
            var booking1 = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), userId: BookingTestSeed.StudentAId);
            var booking2 = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddMinutes(10), userId: BookingTestSeed.StudentBId);
            await h.BookingService.CheckInBookingAsync(booking1.Id);

            // Student A đánh giá 5 sao
            var feedbackService = h.CreateFeedbackService();
            await feedbackService.CreateFeedbackAsync(new CreateFeedbackDto
            {
                BookingId = booking1.Id,
                Rating = 5,
                Comment = "Tuyệt vời"
            });

            // Student B check in và đánh giá 3 sao
            h.CurrentUser.UserId = BookingTestSeed.StudentBId;
            await h.BookingService.CheckInBookingAsync(booking2.Id);
            await feedbackService.CreateFeedbackAsync(new CreateFeedbackDto
            {
                BookingId = booking2.Id,
                Rating = 3,
                Comment = "Bình thường"
            });

            var summaryRes = await feedbackService.GetRoomSummaryAsync(BookingTestSeed.RoomId);

            Assert.True(summaryRes.Success);
            Assert.NotNull(summaryRes.Data);
            Assert.Equal(2, summaryRes.Data.TotalFeedbacks);
            // (5 + 3) / 2 = 4.0
            Assert.Equal(4.0, summaryRes.Data.AverageRating);
            Assert.Equal(1, summaryRes.Data.Star5Count);
            Assert.Equal(1, summaryRes.Data.Star3Count);
            Assert.Equal(0, summaryRes.Data.Star4Count);
        }

        // ── APPROVAL HISTORY TESTS ───────────────────────────────────────

        [Fact]
        public async Task ApprovalHistory_DuyetDon_GhiNhanLichSuDuyet()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");
            
            // Admin duyệt
            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "admin";
            h.CurrentUser.IsAdmin = true;

            var res = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto
            {
                Decision = "Đã duyệt"
            });
            Assert.True(res.Success);

            // Xem lịch sử duyệt
            var historyRes = await h.BookingService.GetApprovalHistoryAsync(booking.Id);
            Assert.True(historyRes.Success);
            Assert.NotEmpty(historyRes.Data!);
            var item = historyRes.Data!.Last();
            Assert.Equal(ApprovalStatus.Approved, item.Status);
            Assert.Equal("Đã duyệt", item.StatusName);
            Assert.Equal("NV001", item.EmployeeCode);
            Assert.Equal("Duyệt đơn đặt phòng", item.Comment);
        }

        [Fact]
        public async Task ApprovalHistory_TuChoiDon_GhiNhanLichSuDuyet()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");

            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "admin";
            h.CurrentUser.IsAdmin = true;

            var res = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto
            {
                Decision = "Từ chối",
                RejectionReason = "Phòng đang được bảo trì đột xuất"
            });
            Assert.True(res.Success);

            var historyRes = await h.BookingService.GetApprovalHistoryAsync(booking.Id);
            Assert.True(historyRes.Success);
            var item = historyRes.Data!.Last();
            Assert.Equal(ApprovalStatus.Rejected, item.Status);
            Assert.Equal("Từ chối", item.StatusName);
            Assert.Equal("Phòng đang được bảo trì đột xuất", item.Comment);
        }

        [Fact]
        public async Task ApprovalHistory_QuanLyHuyDon_GhiNhanLichSuDuyet()
        {
            using var h = new BookingHarness();
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Đã duyệt");

            // Quản lý hủy đơn
            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "admin";
            h.CurrentUser.IsAdmin = true;

            var cancelReq = new CancelBookingRequest
            {
                Reason = "ADMIN_OVERRIDE",
                ReasonDetail = "Ưu tiên phục vụ kỳ thi quốc gia"
            };
            var res = await h.BookingService.CancelBookingAsync(booking.Id, cancelReq);
            Assert.True(res.Success);

            var historyRes = await h.BookingService.GetApprovalHistoryAsync(booking.Id);
            Assert.True(historyRes.Success);
            var item = historyRes.Data!.Last();
            Assert.Equal(ApprovalStatus.CancelledByStaff, item.Status);
            Assert.Equal("Đã hủy bởi quản trị", item.StatusName);
            Assert.Contains("Ưu tiên phục vụ kỳ thi quốc gia", item.Comment);
        }
    }
}
