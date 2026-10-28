using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Kiểm thử ma trận quyền đặt phòng theo vai trò và hai bộ 16 tiết
    /// (lý thuyết / thực hành), gồm cả kiểm tra trùng lịch và giải phóng chỗ.
    /// </summary>
    public class BookingRoleAndPeriodTests
    {
        // ── DANH MỤC PHÒNG / TIẾT TẬP TRUNG ───────────────────────────

        [Fact]
        public void Catalog_Co11PhongThucHanhVa88PhongLyThuyet_MaDuyNhat()
        {
            Assert.Equal(11, RoomCatalogSeed.PracticeRooms.Count);
            Assert.Equal(88, RoomCatalogSeed.TheoryRooms.Count);

            var codes = RoomCatalogSeed.PracticeRooms
                .Concat(RoomCatalogSeed.TheoryRooms)
                .Select(room => room.Code)
                .ToList();

            Assert.Equal(99, codes.Count);
            Assert.Equal(codes.Count, codes.Distinct().Count());
            Assert.Contains("A101", codes);
            Assert.Contains("A111", codes);
            Assert.Contains("A201", codes);
            Assert.Contains("A511", codes);
            Assert.Contains("B201", codes);
            Assert.Contains("B511", codes);
        }

        [Fact]
        public void Catalog_MoiToaMoiTangCo11PhongLyThuyet()
        {
            foreach (var building in new[] { "A", "B" })
            {
                for (var floor = 2; floor <= 5; floor++)
                {
                    var count = RoomCatalogSeed.TheoryRooms.Count(
                        room => room.Building == building && room.Floor == floor.ToString());
                    Assert.Equal(11, count);
                }
            }
        }

        [Fact]
        public void Catalog_LichTietLyThuyet_Co16TietDungGio()
        {
            var periods = RoomCatalogSeed.TheoryPeriods;
            Assert.Equal(16, periods.Count);
            Assert.Equal(new TimeSpan(6, 30, 0), periods[0].Start);
            Assert.Equal(new TimeSpan(7, 20, 0), periods[0].End);
            Assert.Equal(new TimeSpan(9, 30, 0), periods[3].Start);
            Assert.Equal(new TimeSpan(21, 30, 0), periods[15].End);
        }

        [Fact]
        public void Catalog_LichTietThucHanh_Co16TietDungGio()
        {
            var periods = RoomCatalogSeed.PracticePeriods;
            Assert.Equal(16, periods.Count);
            Assert.Equal(new TimeSpan(7, 0, 0), periods[0].Start);
            Assert.Equal(new TimeSpan(7, 50, 0), periods[0].End);
            Assert.Equal(new TimeSpan(15, 0, 0), periods[9].Start);
            Assert.Equal(new TimeSpan(21, 20, 0), periods[15].End);
        }

        // ── SINH VIÊN BỊ CHẶN Ở BACKEND ────────────────────────────────

        [Fact]
        public async Task Student_KhongDuocDatPhongLyThuyet()
        {
            using var h = new BookingHarness();
            var (_, room, periods) = AddPeriodRoom(h, "Phòng Lý thuyết", "LT01", isPractice: false);
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[0], periods[1], date));

            Assert.False(response.Success);
            Assert.Contains("Sinh viên chỉ được đặt phòng học nhóm", response.Message);
        }

        [Fact]
        public async Task Student_KhongDuocDatPhongThucHanh()
        {
            using var h = new BookingHarness();
            var (_, room, periods) = AddPeriodRoom(h, "Phòng Thực hành", "TH01", isPractice: true);
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[0], periods[1], date));

            Assert.False(response.Success);
            Assert.Contains("Sinh viên chỉ được đặt phòng học nhóm", response.Message);
        }

        [Fact]
        public async Task Student_KhongDuocDatHoiTruong()
        {
            using var h = new BookingHarness();
            var hall = AddTimeRoom(h, "Phòng hội thảo", "HT02");
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                TimeRequest(hall, date.Date.AddHours(10), date.Date.AddHours(11)));

            Assert.False(response.Success);
            Assert.Contains("Sinh viên chỉ được đặt phòng học nhóm", response.Message);
        }

        [Fact]
        public async Task Student_DuocDatPhongThuyetTrinh()
        {
            using var h = new BookingHarness();
            var room = AddTimeRoom(h, "Phòng thuyết trình", "TT02");
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                TimeRequest(room, date.Date.AddHours(10), date.Date.AddHours(11)));

            Assert.True(response.Success, response.Message);
        }

        // ── GIẢNG VIÊN ĐƯỢC ĐẶT THEO LOẠI PHÒNG ──────────────────────

        [Fact]
        public async Task Lecturer_DuocDatPhongLyThuyetTheoTiet()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var (_, room, periods) = AddPeriodRoom(h, "Phòng Lý thuyết", "LT01", isPractice: false);
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[4], periods[5], date));

            Assert.True(response.Success, response.Message);
            var detail = Assert.Single(response.Data!.Details);
            Assert.Equal("Tiết 5", detail.StartPeriodName);
            Assert.Equal("Tiết 6", detail.EndPeriodName);
            Assert.Equal(new TimeSpan(10, 20, 0), detail.StartAt.AddHours(7).TimeOfDay);
            Assert.Equal(new TimeSpan(12, 0, 0), detail.EndAt.AddHours(7).TimeOfDay);
        }

        [Fact]
        public async Task Lecturer_DuocDatPhongThucHanhTheoTiet()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var (_, room, periods) = AddPeriodRoom(h, "Phòng Thực hành", "TH01", isPractice: true);
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[0], periods[1], date));

            Assert.True(response.Success, response.Message);
            var detail = Assert.Single(response.Data!.Details);
            Assert.Equal(new TimeSpan(7, 0, 0), detail.StartAt.AddHours(7).TimeOfDay);
            Assert.Equal(new TimeSpan(8, 40, 0), detail.EndAt.AddHours(7).TimeOfDay);
        }

        [Fact]
        public async Task Lecturer_DuocDatHoiTruong()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var hall = AddTimeRoom(h, "Phòng hội thảo", "HT02");
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                TimeRequest(hall, date.Date.AddHours(10), date.Date.AddHours(11)));

            Assert.True(response.Success, response.Message);
        }

        [Fact]
        public async Task Lecturer_DuocDatChuNhat()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var (_, room, periods) = AddPeriodRoom(h, "Phòng Lý thuyết", "LT01", isPractice: false);
            var sunday = NextLocal(DayOfWeek.Sunday, 10);

            var response = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[4], periods[5], sunday));

            Assert.True(response.Success, response.Message);
            Assert.Equal(
                DayOfWeek.Sunday,
                response.Data!.Details.Single().StartAt.AddHours(7).DayOfWeek);
        }

        [Fact]
        public async Task Lecturer_KhongDuocTronHaiBoTiet()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var (_, theoryRoom, _) = AddPeriodRoom(h, "Phòng Lý thuyết", "LT01", isPractice: false);
            var (_, _, practicePeriods) = AddPeriodRoom(h, "Phòng Thực hành", "TH01", isPractice: true);
            var date = NextWeekdayLocal(10);

            var response = await h.BookingService.CreateBookingAsync(
                PeriodRequest(theoryRoom, practicePeriods[0], practicePeriods[1], date));

            Assert.False(response.Success);
            Assert.Contains("không thuộc lịch tiết", response.Message);
        }

        // ── TRÙNG LỊCH / NHIỀU PHÒNG / GIẢI PHÓNG CHỖ ────────────────

        [Fact]
        public async Task Lecturer_TrungLichCungPhong_BiChan()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var (_, room, periods) = AddPeriodRoom(h, "Phòng Lý thuyết", "LT01", isPractice: false);
            var date = NextWeekdayLocal(10);

            var first = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[0], periods[1], date));
            Assert.True(first.Success, first.Message);

            var second = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[1], periods[2], date));

            Assert.False(second.Success);
            Assert.Contains("đã có lịch đặt trùng", second.Message);
        }

        [Fact]
        public async Task HaiPhongKhacNhau_CungThoiGian_DuocPhep()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var (theoryType, room1, periods) = AddPeriodRoom(h, "Phòng Lý thuyết", "LT01", isPractice: false);
            var room2 = AddRoom(h.Db, theoryType.Id, "LT02");
            var date = NextWeekdayLocal(10);

            var first = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room1, periods[0], periods[1], date));
            var second = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room2, periods[0], periods[1], date));

            Assert.True(first.Success, first.Message);
            Assert.True(second.Success, second.Message);
        }

        [Fact]
        public async Task HuyDon_GiaiPhongKhungGio()
        {
            using var h = new BookingHarness();
            var date = NextWeekdayLocal(10);

            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "Admin";
            h.CurrentUser.IsAdmin = true;

            var first = await h.BookingService.CreateBookingAsync(
                TimeRequest(BookingTestSeed.RoomId, date.Date.AddHours(10), date.Date.AddHours(11),
                    userId: BookingTestSeed.StudentAId, autoApprove: true));
            Assert.True(first.Success, first.Message);

            var cancel = await h.BookingService.CancelBookingAsync(first.Data!.Id);
            Assert.True(cancel.Success, cancel.Message);

            UseStudent(h);
            var again = await h.BookingService.CreateBookingAsync(
                TimeRequest(BookingTestSeed.RoomId, date.Date.AddHours(10), date.Date.AddHours(11)));

            Assert.True(again.Success, again.Message);
        }

        [Fact]
        public async Task TuChoiChiTiet_GiaiPhongKhungGio()
        {
            using var h = new BookingHarness();
            var date = NextWeekdayLocal(10);

            h.CurrentUser.UserId = BookingTestSeed.AdminId;
            h.CurrentUser.Role = "Admin";
            h.CurrentUser.IsAdmin = true;

            var first = await h.BookingService.CreateBookingAsync(
                TimeRequest(BookingTestSeed.RoomId, date.Date.AddHours(10), date.Date.AddHours(11),
                    userId: BookingTestSeed.StudentAId));
            Assert.True(first.Success, first.Message);

            var detailId = first.Data!.Details.Single().Id;
            var reject = await h.BookingService.ApproveBookingDetailAsync(detailId, new ApproveBookingDetailDto
            {
                Decision = "Từ chối",
                RejectionReason = "Phòng cần bảo trì"
            });
            Assert.True(reject.Success, reject.Message);

            UseStudent(h);
            var again = await h.BookingService.CreateBookingAsync(
                TimeRequest(BookingTestSeed.RoomId, date.Date.AddHours(10), date.Date.AddHours(11)));

            Assert.True(again.Success, again.Message);
        }

        [Fact]
        public async Task Lecturer_XemDuocLichPhongTheoTiet()
        {
            using var h = new BookingHarness();
            UseRole(h, "Lecturer");
            var (_, room, periods) = AddPeriodRoom(h, "Phòng Lý thuyết", "LT01", isPractice: false);
            var date = NextWeekdayLocal(10);

            var created = await h.BookingService.CreateBookingAsync(
                PeriodRequest(room, periods[0], periods[1], date));
            Assert.True(created.Success, created.Message);

            var schedule = await h.BookingService.GetSchedulesAsync(date, date);

            Assert.True(schedule.Success);
            var item = Assert.Single(schedule.Data!, entry => entry.RoomId == room.Id);
            Assert.Equal("Tiết 1", item.StartPeriodName);
            Assert.Equal("Tiết 2", item.EndPeriodName);
            Assert.Equal("LT01", item.RoomCode);
        }

        // ── HELPERS ────────────────────────────────────────────────────

        private static void UseRole(BookingHarness h, string role)
        {
            h.CurrentUser.UserId = BookingTestSeed.StudentAId;
            h.CurrentUser.Role = role;
            h.CurrentUser.IsAdmin = false;
        }

        private static void UseStudent(BookingHarness h)
        {
            h.CurrentUser.UserId = BookingTestSeed.StudentAId;
            h.CurrentUser.Role = "student";
            h.CurrentUser.IsAdmin = false;
        }

        private static (RoomType Type, Room Room, List<Period> Periods) AddPeriodRoom(
            BookingHarness h, string typeName, string code, bool isPractice)
        {
            var type = new RoomType
            {
                Name = typeName,
                Description = typeName,
                DefaultCapacity = 40,
                Status = "Hoạt động",
                IsBookingByPeriod = true
            };
            h.Db.RoomTypes.Add(type);
            h.Db.SaveChanges();

            var seeds = isPractice
                ? RoomCatalogSeed.PracticePeriods
                : RoomCatalogSeed.TheoryPeriods;
            foreach (var seed in seeds)
            {
                h.Db.Periods.Add(new Period
                {
                    Name = seed.Name,
                    StartTime = seed.Start,
                    EndTime = seed.End,
                    RoomTypeId = type.Id
                });
            }
            h.Db.SaveChanges();

            var room = AddRoom(h.Db, type.Id, code);
            var periods = h.Db.Periods
                .Where(period => period.RoomTypeId == type.Id)
                .AsEnumerable()
                .OrderBy(period => period.StartTime)
                .ToList();

            return (type, room, periods);
        }

        private static Room AddTimeRoom(BookingHarness h, string typeName, string code)
        {
            var type = new RoomType
            {
                Name = typeName,
                Description = typeName,
                DefaultCapacity = 80,
                Status = "Hoạt động",
                IsBookingByPeriod = false
            };
            h.Db.RoomTypes.Add(type);
            h.Db.SaveChanges();
            return AddRoom(h.Db, type.Id, code);
        }

        private static Room AddRoom(ApplicationDbContext db, int roomTypeId, string code)
        {
            var room = new Room
            {
                Name = $"Phòng {code}",
                RoomCode = code,
                Building = "A",
                Floor = "2",
                RoomNumber = code,
                Capacity = 40,
                Status = "Trống",
                Description = "",
                RoomTypeId = roomTypeId
            };
            db.Rooms.Add(room);
            db.SaveChanges();
            return room;
        }

        private static CreateBookingDto PeriodRequest(
            Room room, Period startPeriod, Period endPeriod, DateTime localDate)
        {
            return new CreateBookingDto
            {
                ActivityName = "Giảng dạy học phần",
                Purpose = "Lên lớp theo thời khóa biểu",
                GuestCount = 40,
                Details = new List<BookingDetailItemDto>
                {
                    new()
                    {
                        RoomId = room.Id,
                        StartAt = ToUtc(localDate.Date),
                        EndAt = ToUtc(localDate.Date.Add(endPeriod.EndTime)),
                        StartPeriodId = startPeriod.Id,
                        EndPeriodId = endPeriod.Id,
                        GuestCount = 40,
                        Purpose = "Lên lớp"
                    }
                }
            };
        }

        private static CreateBookingDto TimeRequest(
            Room room, DateTime localStart, DateTime localEnd,
            int? userId = null, bool autoApprove = false)
        {
            return TimeRequest(room.Id, localStart, localEnd, userId, autoApprove);
        }

        private static CreateBookingDto TimeRequest(
            int roomId, DateTime localStart, DateTime localEnd,
            int? userId = null, bool autoApprove = false)
        {
            return new CreateBookingDto
            {
                ActivityName = "Sinh hoạt chuyên môn",
                Purpose = "Họp nhóm",
                GuestCount = 10,
                UserId = userId,
                AutoApprove = autoApprove,
                Details = new List<BookingDetailItemDto>
                {
                    new()
                    {
                        RoomId = roomId,
                        StartAt = ToUtc(localStart),
                        EndAt = ToUtc(localEnd),
                        GuestCount = 10,
                        Purpose = "Họp nhóm"
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

        private static DateTime NextLocal(DayOfWeek dayOfWeek, int hour)
        {
            var date = DateTime.UtcNow.AddHours(7).Date.AddDays(1);
            while (date.DayOfWeek != dayOfWeek)
                date = date.AddDays(1);
            return DateTime.SpecifyKind(date.AddHours(hour), DateTimeKind.Unspecified);
        }
    }
}
