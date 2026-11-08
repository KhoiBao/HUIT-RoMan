using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Kiểm thử luồng duyệt nhiều cấp cho phòng đặc biệt (RoomType.RequiresSecondApproval):
    /// cấp 1 duyệt xong đơn chuyển sang "Chờ duyệt cấp 2", cấp 2 phải là Quản lý/Quản trị viên
    /// khác người đã duyệt cấp 1 và được phép điều chỉnh phòng/thời gian trước khi chốt.
    /// </summary>
    public class MultiLevelApprovalTests
    {
        private const int SpecialRoomTypeId = 2;
        private const int SpecialRoomId = 2;
        private const int ManagerOneId = 2;
        private const int ManagerTwoId = 3;
        private const int StaffEmployeeId = 4;

        private static readonly DateTime StartUtc = new(2026, 11, 20, 2, 0, 0, DateTimeKind.Utc); // 09:00 VN

        private static void SeedSpecialRoom(ApplicationDbContext db)
        {
            if (!db.RoomTypes.Any(rt => rt.Id == SpecialRoomTypeId))
            {
                db.RoomTypes.Add(new RoomType
                {
                    Id = SpecialRoomTypeId,
                    Name = "Phòng hội thảo",
                    Description = "Phòng đặc biệt cần duyệt hai cấp",
                    DefaultCapacity = 90,
                    Status = "Hoạt động",
                    IsBookingByPeriod = false,
                    RequiresSecondApproval = true
                });
            }

            if (!db.Rooms.Any(r => r.Id == SpecialRoomId))
            {
                db.Rooms.Add(new Room
                {
                    Id = SpecialRoomId,
                    Name = "Phòng hội thảo HT01",
                    RoomCode = "HT01",
                    Building = "Thư viện",
                    Floor = "3",
                    RoomNumber = "HT01",
                    Capacity = 90,
                    Status = "Trống",
                    Description = "",
                    RoomTypeId = SpecialRoomTypeId
                });
            }

            db.SaveChanges();
        }

        private static void SeedStaffUser(ApplicationDbContext db, int userId, int employeeId, string userName, string position)
        {
            if (!db.Users.Any(u => u.Id == userId))
            {
                db.Users.Add(new User
                {
                    Id = userId,
                    UserName = userName,
                    FullName = position + " " + userName,
                    CardCode = userName.ToUpperInvariant(),
                    Status = "Hoạt động",
                    Email = userName + "@huit.edu.vn"
                });
            }

            if (!db.Employees.Any(e => e.UserId == userId))
            {
                db.Employees.Add(new Employee
                {
                    Id = employeeId,
                    UserId = userId,
                    Code = "NV" + employeeId.ToString("D3"),
                    Position = position,
                    Status = "Hoạt động"
                });
            }

            db.SaveChanges();
        }

        private static void ActAs(BookingHarness harness, int userId, string role, bool isAdmin = false)
        {
            harness.CurrentUser.UserId = userId;
            harness.CurrentUser.Role = role;
            harness.CurrentUser.IsAdmin = isAdmin;
            harness.CurrentUser.DepartmentId = null;
        }

        private static Booking MakePendingBooking(ApplicationDbContext db, DateTime startUtc, int roomId)
        {
            var booking = new Booking
            {
                ActivityName = "Hội thảo khoa",
                Purpose = "Tổ chức hội thảo",
                GuestCount = 50,
                Note = "",
                RejectionReason = "",
                Status = "Chờ duyệt",
                RequestedAt = startUtc.AddDays(-1),
                CreatedAt = startUtc.AddDays(-1),
                UserId = BookingTestSeed.StudentAId
            };
            db.Bookings.Add(booking);
            db.SaveChanges();

            db.BookingDetails.Add(new BookingDetail
            {
                BookingId = booking.Id,
                RoomId = roomId,
                StartAt = startUtc,
                EndAt = startUtc.AddHours(2),
                GuestCount = 50,
                Purpose = "Tổ chức hội thảo",
                RejectionReason = "",
                Status = "Chờ duyệt"
            });
            db.SaveChanges();
            return booking;
        }

        private static BookingDetail SeedLevelOneApproval(BookingHarness harness, int roomId)
        {
            SeedSpecialRoom(harness.Db);
            SeedStaffUser(harness.Db, ManagerOneId, 2, "quanly1", "Quản lý");
            SeedStaffUser(harness.Db, ManagerTwoId, 3, "quanly2", "Quản lý");

            var booking = MakePendingBooking(harness.Db, StartUtc, roomId);
            var detail = harness.Db.BookingDetails.Single(d => d.BookingId == booking.Id);

            ActAs(harness, ManagerOneId, "Manager");
            var first = harness.BookingService.ApproveBookingDetailAsync(
                detail.Id, new ApproveBookingDetailDto { Decision = "Đã duyệt" }).GetAwaiter().GetResult();
            Assert.True(first.Success, first.Message);
            return detail;
        }

        [Fact]
        public async Task Special_room_level1_approval_moves_detail_to_second_level()
        {
            using var harness = new BookingHarness();
            SeedSpecialRoom(harness.Db);
            SeedStaffUser(harness.Db, ManagerOneId, 2, "quanly1", "Quản lý");

            var booking = MakePendingBooking(harness.Db, StartUtc, SpecialRoomId);
            var detail = harness.Db.BookingDetails.Single(d => d.BookingId == booking.Id);

            ActAs(harness, ManagerOneId, "Manager");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id, new ApproveBookingDetailDto { Decision = "Đã duyệt" });

            Assert.True(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Chờ duyệt cấp 2", refreshed.Status);
            Assert.Equal(ManagerOneId, refreshed.ApprovedByUserId);

            var refreshedBooking = harness.Db.Bookings.Single(b => b.Id == booking.Id);
            Assert.Equal("Chờ duyệt cấp 2", refreshedBooking.Status);

            var latest = harness.Db.ApprovalHistories
                .Where(h => h.BookingId == booking.Id)
                .OrderByDescending(h => h.Id)
                .First();
            Assert.Equal(1, latest.Level);
            Assert.Equal(ApprovalStatus.Approved, latest.Status);
            Assert.Equal(ManagerOneId, latest.ActorUserId);

            Assert.False(harness.Db.UsageSessions.Any(s => s.BookingDetailId == detail.Id));
        }

        [Fact]
        public async Task Second_level_by_different_manager_finalizes_and_creates_session()
        {
            using var harness = new BookingHarness();
            var detail = SeedLevelOneApproval(harness, SpecialRoomId);
            var bookingId = detail.BookingId;

            ActAs(harness, ManagerTwoId, "Manager");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id, new ApproveBookingDetailDto { Decision = "Đã duyệt" });

            Assert.True(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Đã duyệt", refreshed.Status);
            Assert.Equal(ManagerTwoId, refreshed.ApprovedByUserId);

            var refreshedBooking = harness.Db.Bookings.Single(b => b.Id == bookingId);
            Assert.Equal("Đã duyệt", refreshedBooking.Status);

            var session = harness.Db.UsageSessions.SingleOrDefault(s => s.BookingDetailId == detail.Id);
            Assert.NotNull(session);
            Assert.StartsWith("HUIT-", session!.ConfirmationCode);

            var latest = harness.Db.ApprovalHistories
                .Where(h => h.BookingId == bookingId)
                .OrderByDescending(h => h.Id)
                .First();
            Assert.Equal(2, latest.Level);
            Assert.Equal(ManagerTwoId, latest.ActorUserId);
        }

        [Fact]
        public async Task Same_manager_cannot_finalize_own_level1()
        {
            using var harness = new BookingHarness();
            var detail = SeedLevelOneApproval(harness, SpecialRoomId);

            ActAs(harness, ManagerOneId, "Manager");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id, new ApproveBookingDetailDto { Decision = "Đã duyệt" });

            Assert.False(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Chờ duyệt cấp 2", refreshed.Status);
        }

        [Fact]
        public async Task Employee_cannot_decide_second_level()
        {
            using var harness = new BookingHarness();
            var detail = SeedLevelOneApproval(harness, SpecialRoomId);
            SeedStaffUser(harness.Db, StaffEmployeeId, 4, "nhanvien1", "Nhân viên");

            ActAs(harness, StaffEmployeeId, "Employee");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id, new ApproveBookingDetailDto { Decision = "Đã duyệt" });

            Assert.False(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Chờ duyệt cấp 2", refreshed.Status);
        }

        [Fact]
        public async Task Second_level_can_adjust_room_and_time()
        {
            using var harness = new BookingHarness();
            var detail = SeedLevelOneApproval(harness, SpecialRoomId);

            var newStartUtc = StartUtc.AddDays(1); // 09:00 ngày hôm sau
            ActAs(harness, ManagerTwoId, "Manager");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id,
                new ApproveBookingDetailDto
                {
                    Decision = "Đã duyệt",
                    NewRoomId = BookingTestSeed.RoomId,
                    NewStartAt = newStartUtc,
                    NewEndAt = newStartUtc.AddHours(3)
                });

            Assert.True(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Đã duyệt", refreshed.Status);
            Assert.Equal(BookingTestSeed.RoomId, refreshed.RoomId);
            Assert.Equal(newStartUtc, refreshed.StartAt);
            Assert.Equal(newStartUtc.AddHours(3), refreshed.EndAt);

            var session = harness.Db.UsageSessions.SingleOrDefault(s => s.BookingDetailId == detail.Id);
            Assert.NotNull(session);
        }

        [Fact]
        public async Task Adjustment_to_conflicting_time_is_rejected()
        {
            using var harness = new BookingHarness();
            var detail = SeedLevelOneApproval(harness, SpecialRoomId);

            // Đơn khác đã chiếm phòng TV01 vào khung giờ điều chỉnh.
            BookingTestSeed.MakeBooking(harness.Db, StartUtc.AddDays(1), BookingTestSeed.StudentBId, "Đã duyệt");

            ActAs(harness, ManagerTwoId, "Manager");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id,
                new ApproveBookingDetailDto
                {
                    Decision = "Đã duyệt",
                    NewRoomId = BookingTestSeed.RoomId,
                    NewStartAt = StartUtc.AddDays(1).AddHours(1),
                    NewEndAt = StartUtc.AddDays(1).AddHours(3)
                });

            Assert.False(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Chờ duyệt cấp 2", refreshed.Status);
            Assert.Equal(SpecialRoomId, refreshed.RoomId);
        }

        [Fact]
        public async Task Normal_room_approve_stays_single_level()
        {
            using var harness = new BookingHarness();
            SeedStaffUser(harness.Db, ManagerOneId, 2, "quanly1", "Quản lý");

            var booking = MakePendingBooking(harness.Db, StartUtc, BookingTestSeed.RoomId);
            var detail = harness.Db.BookingDetails.Single(d => d.BookingId == booking.Id);

            ActAs(harness, ManagerOneId, "Manager");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id, new ApproveBookingDetailDto { Decision = "Đã duyệt" });

            Assert.True(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Đã duyệt", refreshed.Status);

            var refreshedBooking = harness.Db.Bookings.Single(b => b.Id == booking.Id);
            Assert.Equal("Đã duyệt", refreshedBooking.Status);

            Assert.True(harness.Db.UsageSessions.Any(s => s.BookingDetailId == detail.Id));
        }

        [Fact]
        public async Task Booking_level_approve_sends_special_rooms_to_second_level()
        {
            using var harness = new BookingHarness();
            SeedSpecialRoom(harness.Db);
            SeedStaffUser(harness.Db, ManagerOneId, 2, "quanly1", "Quản lý");

            var booking = MakePendingBooking(harness.Db, StartUtc, SpecialRoomId);
            var detail = harness.Db.BookingDetails.Single(d => d.BookingId == booking.Id);

            ActAs(harness, ManagerOneId, "Manager");
            var result = await harness.BookingService.ApproveBookingAsync(
                booking.Id, new ApproveBookingDto { Decision = "Đã duyệt" });

            Assert.True(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Chờ duyệt cấp 2", refreshed.Status);

            var refreshedBooking = harness.Db.Bookings.Single(b => b.Id == booking.Id);
            Assert.Equal("Chờ duyệt cấp 2", refreshedBooking.Status);

            Assert.False(harness.Db.UsageSessions.Any(s => s.BookingDetailId == detail.Id));
        }

        [Fact]
        public async Task Second_level_rejection_finalizes_rejection()
        {
            using var harness = new BookingHarness();
            var detail = SeedLevelOneApproval(harness, SpecialRoomId);
            var bookingId = detail.BookingId;

            ActAs(harness, ManagerTwoId, "Manager");
            var result = await harness.BookingService.ApproveBookingDetailAsync(
                detail.Id,
                new ApproveBookingDetailDto { Decision = "Từ chối", RejectionReason = "Không còn thiết bị âm thanh" });

            Assert.True(result.Success, result.Message);

            var refreshed = harness.Db.BookingDetails.Single(d => d.Id == detail.Id);
            Assert.Equal("Từ chối", refreshed.Status);
            Assert.Equal("Không còn thiết bị âm thanh", refreshed.RejectionReason);

            var refreshedBooking = harness.Db.Bookings.Single(b => b.Id == bookingId);
            Assert.Equal("Từ chối", refreshedBooking.Status);

            var latest = harness.Db.ApprovalHistories
                .Where(h => h.BookingId == bookingId)
                .OrderByDescending(h => h.Id)
                .First();
            Assert.Equal(2, latest.Level);
            Assert.Equal(ApprovalStatus.Rejected, latest.Status);
        }
    }
}
