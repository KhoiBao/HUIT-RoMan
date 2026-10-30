using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Domain;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Duyệt tự động + vết kiểm toán người duyệt:
    /// - Không bao giờ lấy bừa nhân viên làm người duyệt.
    /// - Đơn được duyệt phải có ApprovedByUserId + ApprovedAt + ApprovalMode.
    /// </summary>
    public class BookingApprovalAuditTests
    {
        private const int SystemUserId = 99;
        private const int ManagerWithProfileId = 30;
        private const int ManagerWithoutProfileId = 31;

        // ── DUYỆT TỰ ĐỘNG ───────────────────────────────────────────────

        [Fact]
        public async Task AutoApprove_Bat_DonSinhVienDuocDuyetNgayVoiTaiKhoanHeThong()
        {
            using var h = new BookingHarness();
            SeedSystemApprover(h, enabled: true);

            var res = await h.BookingService.CreateBookingAsync(NewStudentRequest());

            Assert.True(res.Success, res.Message);
            Assert.Equal("Đã duyệt", res.Data!.Status);

            var booking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == res.Data.Id);
            Assert.Equal("Đã duyệt", booking.Status);
            Assert.Equal(ApprovalModes.Auto, booking.ApprovalMode);
            Assert.Equal(SystemUserId, booking.ApprovedByUserId);
            Assert.NotNull(booking.ApprovedAt);

            var detail = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.BookingId == booking.Id);
            Assert.Equal(ApprovalModes.Auto, detail.ApprovalMode);
            Assert.Equal(SystemUserId, detail.ApprovedByUserId);

            // Duyệt tự động vẫn phải chạy đủ pipeline: mã nhận phòng + lịch sử + thông báo.
            var session = await h.Db.UsageSessions.AsNoTracking().FirstOrDefaultAsync(s => s.BookingDetailId == detail.Id);
            Assert.NotNull(session);
            Assert.StartsWith("HUIT-", session!.ConfirmationCode);

            var history = await h.Db.ApprovalHistories.AsNoTracking().FirstAsync(x => x.BookingId == booking.Id);
            Assert.Equal(ApprovalModes.Auto, history.ApprovalMode);
            Assert.Equal(SystemUserId, history.ActorUserId);
            Assert.Equal(ApprovalStatus.Approved, history.Status);

            Assert.True(await h.Db.Notifications.AsNoTracking().AnyAsync(n => n.UserId == BookingTestSeed.StudentAId));
        }

        [Fact]
        public async Task AutoApprove_Tat_DonSinhVienChoDuyetKhongCoNguoiDuyet()
        {
            using var h = new BookingHarness();
            SeedSystemApprover(h, enabled: false);

            var res = await h.BookingService.CreateBookingAsync(NewStudentRequest());

            Assert.True(res.Success, res.Message);
            Assert.Equal("Chờ duyệt", res.Data!.Status);

            var booking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == res.Data.Id);
            Assert.Null(booking.ApprovalMode);
            Assert.Null(booking.ApprovedByUserId);
            Assert.Null(booking.ApprovedAt);

            Assert.False(await h.Db.ApprovalHistories.AsNoTracking().AnyAsync(x => x.BookingId == booking.Id));
        }

        [Fact]
        public async Task AutoApprove_BatNhungThieuTaiKhoanHeThong_KhongDuyetVoChu()
        {
            using var h = new BookingHarness();
            // Bật cờ nhưng KHÔNG seed tài khoản hệ thống: tuyệt đối không lấy nhân viên khác thay thế.
            h.Db.SystemSettings.Add(new SystemSetting
            {
                Key = SystemSettingKeys.BookingAutoApprove,
                Value = "true",
                UpdatedAt = DateTime.UtcNow,
                UpdatedByUserId = BookingTestSeed.AdminId
            });
            await h.Db.SaveChangesAsync();

            var res = await h.BookingService.CreateBookingAsync(NewStudentRequest());

            Assert.True(res.Success, res.Message);
            Assert.Equal("Chờ duyệt", res.Data!.Status);

            var booking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == res.Data.Id);
            Assert.Null(booking.ApprovedByUserId);
            Assert.Null(booking.ApprovalMode);
        }

        // ── DUYỆT TAY ───────────────────────────────────────────────────

        [Fact]
        public async Task DuyetTay_GhiNhanDungNguoiDuyetVaoDonVaChiTiet()
        {
            using var h = new BookingHarness();
            SeedManager(h, ManagerWithProfileId, withEmployeeProfile: true);
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");

            UseManager(h, ManagerWithProfileId);
            var res = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto { Decision = "Đã duyệt" });
            Assert.True(res.Success, res.Message);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal(ApprovalModes.Manual, dbBooking.ApprovalMode);
            Assert.Equal(ManagerWithProfileId, dbBooking.ApprovedByUserId);
            Assert.NotNull(dbBooking.ApprovedAt);

            var detail = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.BookingId == booking.Id);
            Assert.Equal(ApprovalModes.Manual, detail.ApprovalMode);
            Assert.Equal(ManagerWithProfileId, detail.ApprovedByUserId);

            var history = await h.Db.ApprovalHistories.AsNoTracking().FirstAsync(x => x.BookingId == booking.Id);
            Assert.Equal(ApprovalModes.Manual, history.ApprovalMode);
            Assert.Equal(ManagerWithProfileId, history.ActorUserId);
            Assert.NotNull(history.EmployeeId);

            var historyRes = await h.BookingService.GetApprovalHistoryAsync(booking.Id);
            var item = historyRes.Data!.Last();
            Assert.Equal("Quản lý có hồ sơ", item.ActorName);
            Assert.Equal("NV-MGR", item.EmployeeCode);
        }

        [Fact]
        public async Task DuyetTay_KhongCoHoSoNhanSu_DungTenTaiKhoanKhongBiaNhanVien()
        {
            using var h = new BookingHarness();
            SeedManager(h, ManagerWithoutProfileId, withEmployeeProfile: false);
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");

            UseManager(h, ManagerWithoutProfileId);
            var res = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto { Decision = "Đã duyệt" });
            Assert.True(res.Success, res.Message);

            var history = await h.Db.ApprovalHistories.AsNoTracking().FirstAsync(x => x.BookingId == booking.Id);
            Assert.Equal(ManagerWithoutProfileId, history.ActorUserId);
            Assert.Null(history.EmployeeId); // không có hồ sơ thì để trống, không gán nhân viên khác

            var historyRes = await h.BookingService.GetApprovalHistoryAsync(booking.Id);
            var item = historyRes.Data!.Last();
            Assert.Equal("Quản lý chưa có hồ sơ", item.ActorName);
            Assert.NotEqual("Ban Quản lý HUIT", item.ActorName);
            Assert.Equal(string.Empty, item.EmployeeCode);
        }

        [Fact]
        public async Task TuChoiDon_KhongGhiNguoiDuyetChoChiTietPhong()
        {
            using var h = new BookingHarness();
            SeedManager(h, ManagerWithProfileId, withEmployeeProfile: true);
            var booking = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");

            UseManager(h, ManagerWithProfileId);
            var res = await h.BookingService.ApproveBookingAsync(booking.Id, new ApproveBookingDto
            {
                Decision = "Từ chối",
                RejectionReason = "Phòng bảo trì"
            });
            Assert.True(res.Success, res.Message);

            var dbBooking = await h.Db.Bookings.AsNoTracking().FirstAsync(b => b.Id == booking.Id);
            Assert.Equal("Từ chối", dbBooking.Status);
            // Cột ApprovedBy chỉ dành cho đơn đã duyệt; người từ chối nằm ở ApprovalHistories.
            Assert.Null(dbBooking.ApprovedByUserId);
            Assert.Null(dbBooking.ApprovalMode);

            var detail = await h.Db.BookingDetails.AsNoTracking().FirstAsync(d => d.BookingId == booking.Id);
            Assert.Null(detail.ApprovedByUserId);
            Assert.Null(detail.ApprovalMode);

            var history = await h.Db.ApprovalHistories.AsNoTracking().FirstAsync(x => x.BookingId == booking.Id);
            Assert.Equal(ApprovalStatus.Rejected, history.Status);
            Assert.Equal(ManagerWithProfileId, history.ActorUserId);
        }

        // ── DUYỆT HÀNG LOẠT ─────────────────────────────────────────────

        [Fact]
        public async Task DuyetHangLoat_DuyetTatCaDonDangCho()
        {
            using var h = new BookingHarness();
            SeedManager(h, ManagerWithProfileId, withEmployeeProfile: true);
            var first = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");
            var second = BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(8), status: "Chờ duyệt");

            UseManager(h, ManagerWithProfileId);
            var res = await h.BookingService.ApprovePendingBookingsAsync();

            Assert.True(res.Success, res.Message);
            Assert.Equal(2, res.Data!.ApprovedCount);
            Assert.Equal(0, res.Data.FailedCount);

            var statuses = await h.Db.Bookings.AsNoTracking()
                .Where(b => b.Id == first.Id || b.Id == second.Id)
                .Select(b => new { b.Status, b.ApprovalMode, b.ApprovedByUserId })
                .ToListAsync();

            Assert.All(statuses, s =>
            {
                Assert.Equal("Đã duyệt", s.Status);
                Assert.Equal(ApprovalModes.Manual, s.ApprovalMode);
                Assert.Equal(ManagerWithProfileId, s.ApprovedByUserId);
            });
        }

        [Fact]
        public async Task DuyetHangLoat_SinhVienGoi_TuChoi()
        {
            using var h = new BookingHarness();
            BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");

            var res = await h.BookingService.ApprovePendingBookingsAsync();

            Assert.False(res.Success);
            Assert.Contains("quản lý hoặc quản trị viên", res.Message);
        }

        // ── DTO TRẢ VỀ ─────────────────────────────────────────────────

        [Fact]
        public async Task DtoChiTiet_TraVeNguoiDuyetVaCheDoDuyet()
        {
            using var h = new BookingHarness();
            SeedSystemApprover(h, enabled: true);

            var created = await h.BookingService.CreateBookingAsync(NewStudentRequest());
            Assert.True(created.Success, created.Message);

            var detail = await h.BookingService.GetBookingByIdAsync(created.Data!.Id);

            Assert.True(detail.Success, detail.Message);
            Assert.Equal(ApprovalModes.Auto, detail.Data!.ApprovalMode);
            Assert.Equal(SystemUserId, detail.Data.ApprovedByUserId);
            Assert.Equal(SystemAccounts.AutoApproveDisplayName, detail.Data.ApprovedByName);
            Assert.NotNull(detail.Data.ApprovedAt);

            var d = detail.Data.Details.Single();
            Assert.Equal(ApprovalModes.Auto, d.ApprovalMode);
            Assert.Equal(SystemUserId, d.ApprovedByUserId);
            Assert.Equal(SystemAccounts.AutoApproveDisplayName, d.ApprovedByName);
        }

        // ── CẤU HÌNH CHẾ ĐỘ DUYỆT ──────────────────────────────────────

        [Fact]
        public async Task CapNhatCheDoDuyet_QuanLyBatDuoc_GhiNhanNguoiBat()
        {
            using var h = new BookingHarness();
            SeedManager(h, ManagerWithProfileId, withEmployeeProfile: true);
            UseManager(h, ManagerWithProfileId);

            var res = await h.ApprovalSettings.UpdateAsync(new UpdateAutoApprovalSettingDto { Enabled = true });

            Assert.True(res.Success, res.Message);
            Assert.True(res.Data!.Enabled);
            Assert.Equal("Quản lý có hồ sơ", res.Data.UpdatedByName);

            var setting = await h.Db.SystemSettings.AsNoTracking()
                .FirstAsync(s => s.Key == SystemSettingKeys.BookingAutoApprove);
            Assert.Equal("true", setting.Value);
            Assert.Equal(ManagerWithProfileId, setting.UpdatedByUserId);
        }

        [Fact]
        public async Task CapNhatCheDoDuyet_NhanVienThuong_TuChoi()
        {
            using var h = new BookingHarness();
            h.CurrentUser.UserId = BookingTestSeed.StudentAId;
            h.CurrentUser.Role = "Employee";

            var res = await h.ApprovalSettings.UpdateAsync(new UpdateAutoApprovalSettingDto { Enabled = true });

            Assert.False(res.Success);
            Assert.Contains("quản lý hoặc quản trị viên", res.Message);
            Assert.False(await h.Db.SystemSettings.AsNoTracking()
                .AnyAsync(s => s.Key == SystemSettingKeys.BookingAutoApprove && s.Value == "true"));
        }

        [Fact]
        public async Task LayCheDoDuyet_TraVeSoDonDangCho()
        {
            using var h = new BookingHarness();
            SeedManager(h, ManagerWithProfileId, withEmployeeProfile: true);
            BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(5), status: "Chờ duyệt");
            BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(8), status: "Chờ duyệt");
            BookingTestSeed.MakeBooking(h.Db, DateTime.UtcNow.AddHours(11), status: "Đã duyệt");

            UseManager(h, ManagerWithProfileId);
            var res = await h.ApprovalSettings.GetAsync();

            Assert.True(res.Success, res.Message);
            Assert.False(res.Data!.Enabled);
            Assert.Equal(2, res.Data.PendingCount);
        }

        // ── TÀI KHOẢN HỆ THỐNG ─────────────────────────────────────────

        [Fact]
        public async Task TaiKhoanHeThong_KhongXuatHienTrongDanhSachNhanSu()
        {
            using var h = new BookingHarness();
            SeedSystemApprover(h, enabled: true);

            var userStoreMock = new Mock<IUserStore<User>>();
            userStoreMock.As<IUserRoleStore<User>>()
                .Setup(s => s.GetRolesAsync(It.IsAny<User>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync((IList<string>)new List<string>());
            var userManager = new UserManager<User>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);
            var service = new HUIT_RoMan.Application.Modules.Identity.Services.EmployeeService(
                h.UoW, userManager, h.CurrentUser);

            var res = await service.GetAllAsync();

            Assert.True(res.Success, res.Message);
            Assert.DoesNotContain(res.Data!, e => e.Code == SystemAccounts.AutoApproveEmployeeCode);
            Assert.Contains(res.Data!, e => e.Code == "NV001");
        }

        // ── HELPERS ────────────────────────────────────────────────────

        private static void SeedSystemApprover(BookingHarness h, bool enabled)
        {
            h.Db.Users.Add(new User
            {
                Id = SystemUserId,
                UserName = SystemAccounts.AutoApproveUserName,
                FullName = SystemAccounts.AutoApproveDisplayName,
                Status = "Hoạt động",
                Email = "system.auto-approve@invalid.local",
                CardCode = "SYS-AUTO",
                PasswordHash = null,
                EmailConfirmed = false
            });
            h.Db.Employees.Add(new Employee
            {
                Id = SystemUserId,
                UserId = SystemUserId,
                Code = SystemAccounts.AutoApproveEmployeeCode,
                Position = "Tự động duyệt",
                Status = "Hoạt động"
            });
            h.Db.SystemSettings.Add(new SystemSetting
            {
                Key = SystemSettingKeys.BookingAutoApprove,
                Value = enabled ? "true" : "false",
                UpdatedAt = DateTime.UtcNow,
                UpdatedByUserId = BookingTestSeed.AdminId
            });
            h.Db.SaveChanges();
        }

        private static void SeedManager(BookingHarness h, int userId, bool withEmployeeProfile)
        {
            h.Db.Users.Add(new User
            {
                Id = userId,
                UserName = $"quanly{userId}",
                FullName = withEmployeeProfile ? "Quản lý có hồ sơ" : "Quản lý chưa có hồ sơ",
                Status = "Hoạt động",
                Email = $"quanly{userId}@huit.edu.vn",
                CardCode = $"QL{userId:D3}"
            });

            if (withEmployeeProfile)
            {
                h.Db.Employees.Add(new Employee
                {
                    Id = userId,
                    UserId = userId,
                    Code = "NV-MGR",
                    Position = "Quản lý",
                    Status = "Hoạt động"
                });
            }

            h.Db.SaveChanges();
        }

        private static void UseManager(BookingHarness h, int userId)
        {
            h.CurrentUser.UserId = userId;
            h.CurrentUser.Role = "Manager";
            h.CurrentUser.IsAdmin = false;
            h.CurrentUser.DepartmentId = null;
        }

        private static CreateBookingDto NewStudentRequest()
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
