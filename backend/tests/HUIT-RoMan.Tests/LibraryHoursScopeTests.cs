using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Usage.Services;
using HUIT_RoMan.Application.Modules.WorkingHours.Services;
using HUIT_RoMan.Domain.Entities;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Giờ phục vụ thư viện (nghỉ Chủ Nhật, khung 07:00–20:00) chỉ áp dụng cho
    /// các phòng học nhóm/thuyết trình của Thư viện. Phòng hội thảo/hội trường
    /// không thuộc giờ phục vụ thư viện nên đặt được cả Chủ Nhật lẫn ngoài khung giờ.
    /// </summary>
    public class LibraryHoursScopeTests
    {
        [Fact]
        public async Task PhongHoiThao_DuocDatChuNhat()
        {
            using var h = new BookingHarness();
            UseStaff(h);
            var hall = AddLibraryRoom(h, "Phòng hội thảo", "HT01");
            var sunday = NextLocal(DayOfWeek.Sunday, 9);

            var res = await CreateService(h).CreateBookingAsync(
                TimeRequest(hall, sunday.Date.AddHours(9), sunday.Date.AddHours(11)));

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task PhongHoiThao_DuocDatNgoaiKhungGioThuVien()
        {
            using var h = new BookingHarness();
            UseStaff(h);
            var hall = AddLibraryRoom(h, "Phòng hội trường", "HT02");
            var saturday = NextLocal(DayOfWeek.Saturday, 20);

            var res = await CreateService(h).CreateBookingAsync(
                TimeRequest(hall, saturday.Date.AddHours(20), saturday.Date.AddHours(21)));

            Assert.True(res.Success, res.Message);
        }

        [Fact]
        public async Task PhongHocNhomThuVien_VanBiChanChuNhat()
        {
            using var h = new BookingHarness();
            UseStaff(h);
            var room = AddLibraryRoom(h, "Phòng học nhóm", "TV05");
            var sunday = NextLocal(DayOfWeek.Sunday, 9);

            var res = await CreateService(h).CreateBookingAsync(
                TimeRequest(room, sunday.Date.AddHours(9), sunday.Date.AddHours(10)));

            Assert.False(res.Success);
            Assert.Contains("Chủ Nhật", res.Message);
        }

        [Fact]
        public async Task GiaHan_PhongHoiThao_NgoaiKhungGio_ThanhCong()
        {
            using var h = new BookingHarness();
            UseStaff(h);
            var hall = AddLibraryRoom(h, "Phòng hội thảo", "HT03");

            var booking = new Booking
            {
                ActivityName = "Hội thảo khoa",
                Purpose = "Chuyên đề",
                GuestCount = 40,
                Note = "",
                RejectionReason = "",
                Status = "Đã duyệt",
                RequestedAt = DateTime.UtcNow.AddDays(-1),
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UserId = BookingTestSeed.AdminId
            };
            h.Db.Bookings.Add(booking);
            h.Db.SaveChanges();

            // Lượt mượn 19:30 → 21:30 giờ VN (không thuộc khung 07:00–20:00)
            var startLocal = NextLocal(DayOfWeek.Saturday, 19).Date.AddHours(19.5);
            var detail = new BookingDetail
            {
                BookingId = booking.Id,
                RoomId = hall.Id,
                StartAt = ToUtc(startLocal),
                EndAt = ToUtc(startLocal.AddHours(2)),
                GuestCount = 40,
                Purpose = "Chuyên đề",
                RejectionReason = "",
                Status = "Đã duyệt"
            };
            h.Db.BookingDetails.Add(detail);
            h.Db.SaveChanges();

            var session = new UsageSession
            {
                BookingDetailId = detail.Id,
                UserId = BookingTestSeed.AdminId,
                Status = "Đang sử dụng",
                ConfirmationCode = "HUIT-HALL01"
            };
            h.Db.UsageSessions.Add(session);
            h.Db.SaveChanges();

            var usageService = new UsageService(
                h.UoW, h.CurrentUser, new Moq.Mock<HUIT_RoMan.Application.Common.Interfaces.IStoredProcedureService>().Object,
                new LibraryWorkingHoursProvider(h.UoW));
            var res = await usageService.ExtendAsync(session.Id, new HUIT_RoMan.Application.Modules.Usage.DTOs.ExtendUsageSessionRequestDto
            {
                NewEndAt = ToUtc(startLocal.AddHours(3))
            });

            Assert.True(res.Success, res.Message);
        }

        // ── HELPERS ───────────────────────────────────────────────────

        private static BookingService CreateService(BookingHarness h) =>
            new(h.UoW, h.CurrentUser, h.UsageService, h.ApprovalSettings, h.EmailMock.Object,
                new LibraryWorkingHoursProvider(h.UoW));

        private static void UseStaff(BookingHarness h)
        {
            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "Admin";
            h.CurrentUser.IsAdmin = false;
        }

        private static Room AddLibraryRoom(BookingHarness h, string typeName, string code)
        {
            var department = h.Db.Departments.FirstOrDefault(d => d.Type == "Library");
            if (department == null)
            {
                department = new Department
                {
                    Name = "Thư viện HUIT",
                    Type = "Library",
                    Status = "Hoạt động"
                };
                h.Db.Departments.Add(department);
                h.Db.SaveChanges();
            }

            var type = new RoomType
            {
                Name = typeName,
                Description = typeName,
                DefaultCapacity = 80,
                Status = "Hoạt động",
                IsBookingByPeriod = false,
                DepartmentId = department.Id
            };
            h.Db.RoomTypes.Add(type);
            h.Db.SaveChanges();

            var room = new Room
            {
                Name = $"Phòng {code}",
                RoomCode = code,
                Building = "Thư viện",
                Floor = "3",
                RoomNumber = code,
                Capacity = 40,
                Status = "Trống",
                Description = "",
                RoomTypeId = type.Id
            };
            h.Db.Rooms.Add(room);
            h.Db.SaveChanges();
            return room;
        }

        private static HUIT_RoMan.Application.Modules.Booking.DTOs.CreateBookingDto TimeRequest(
            Room room, DateTime localStart, DateTime localEnd)
        {
            return new HUIT_RoMan.Application.Modules.Booking.DTOs.CreateBookingDto
            {
                ActivityName = "Sinh hoạt chuyên môn",
                Purpose = "Họp nhóm",
                GuestCount = 6,
                Details = new()
                {
                    new()
                    {
                        RoomId = room.Id,
                        StartAt = ToUtc(localStart),
                        EndAt = ToUtc(localEnd),
                        GuestCount = 6,
                        Purpose = "Họp nhóm"
                    }
                }
            };
        }

        private static DateTime ToUtc(DateTime local) =>
            DateTime.SpecifyKind(local.AddHours(-7), DateTimeKind.Utc);

        private static DateTime NextLocal(DayOfWeek dayOfWeek, int hour)
        {
            var date = DateTime.UtcNow.AddHours(7).Date.AddDays(1);
            while (date.DayOfWeek != dayOfWeek)
                date = date.AddDays(1);
            return DateTime.SpecifyKind(date.AddHours(hour), DateTimeKind.Unspecified);
        }
    }
}
