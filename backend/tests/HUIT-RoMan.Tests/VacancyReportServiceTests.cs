using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Report.DTOs;
using HUIT_RoMan.Domain.Entities;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Kiểm tra báo cáo tỷ lệ phòng trống theo từng khung giờ (07:00-21:00),
    /// trung bình trên khoảng ngày lọc, tính theo giờ Việt Nam (UTC+7).
    /// </summary>
    public class VacancyReportServiceTests : IDisposable
    {
        private readonly BookingHarness _h = new();

        private static DateTime VnToUtc(DateTime vnWallClock) =>
            DateTime.SpecifyKind(vnWallClock.AddHours(-7), DateTimeKind.Utc);

        private void SeedSecondRoom()
        {
            _h.Db.Rooms.Add(new Room
            {
                Id = 2,
                Name = "Phòng học nhóm TV02",
                RoomCode = "TV02",
                Floor = "3",
                Building = "Thư viện",
                RoomNumber = "TV02",
                Capacity = 6,
                Status = "Trống",
                Description = "",
                RoomTypeId = 1
            });
            _h.Db.SaveChanges();
        }

        private void SeedBooking(DateTime vnStart, int roomId, string status, int userId = BookingTestSeed.StudentAId)
        {
            var booking = new Booking
            {
                ActivityName = "Học nhóm",
                Purpose = "Ôn tập",
                GuestCount = 2,
                Note = "",
                RejectionReason = "",
                Status = status,
                RequestedAt = VnToUtc(vnStart).AddDays(-1),
                CreatedAt = VnToUtc(vnStart).AddDays(-1),
                UserId = userId
            };
            _h.Db.Bookings.Add(booking);
            _h.Db.SaveChanges();

            _h.Db.BookingDetails.Add(new BookingDetail
            {
                BookingId = booking.Id,
                RoomId = roomId,
                StartAt = VnToUtc(vnStart),
                EndAt = VnToUtc(vnStart.AddHours(2)),
                GuestCount = 2,
                Purpose = "Ôn tập",
                RejectionReason = "",
                Status = status
            });
            _h.Db.SaveChanges();
        }

        [Fact]
        public async Task Occupied_slots_reflect_vietnam_hours_and_average_over_days()
        {
            SeedSecondRoom();

            // Thứ Năm 05/11/2026: 2 phòng đều bận 09:00-11:00 (giờ VN)
            SeedBooking(new DateTime(2026, 11, 5, 9, 0, 0), BookingTestSeed.RoomId, "Đã duyệt");
            SeedBooking(new DateTime(2026, 11, 5, 9, 0, 0), 2, "Đã duyệt");

            var filter = new ReportFilterDto
            {
                FromDate = new DateTime(2026, 11, 5),
                ToDate = new DateTime(2026, 11, 6)
            };

            var res = await _h.CreateReportService().GetVacancyReportAsync(filter);

            Assert.True(res.Success);
            var report = res.Data!;
            Assert.Equal(2, report.TotalRooms);
            Assert.Equal(2, report.DaysCounted);
            Assert.Equal(14, report.HourSlots.Count); // 07..20

            var slot9 = report.HourSlots.Single(s => s.Hour == 9);
            Assert.Equal(50.0, slot9.VacancyRate, 1); // ngày 1: 0%, ngày 2: 100%
            Assert.Equal(1.0, slot9.AvgBookedRooms, 1);

            var slot10 = report.HourSlots.Single(s => s.Hour == 10);
            Assert.Equal(50.0, slot10.VacancyRate, 1);

            var slot7 = report.HourSlots.Single(s => s.Hour == 7);
            Assert.Equal(100.0, slot7.VacancyRate, 1); // không ai đặt buổi sáng

            var slot12 = report.HourSlots.Single(s => s.Hour == 12);
            Assert.Equal(100.0, slot12.VacancyRate, 1);

            Assert.Contains("07:00", slot7.Label);
            Assert.Contains("08:00", slot7.Label);
        }

        [Fact]
        public async Task Cancelled_and_pending_bookings_do_not_occupy_slots()
        {
            SeedSecondRoom();

            SeedBooking(new DateTime(2026, 11, 5, 9, 0, 0), BookingTestSeed.RoomId, "Đã hủy");
            SeedBooking(new DateTime(2026, 11, 5, 9, 0, 0), 2, "Chờ duyệt");

            var filter = new ReportFilterDto
            {
                FromDate = new DateTime(2026, 11, 5),
                ToDate = new DateTime(2026, 11, 5)
            };

            var res = await _h.CreateReportService().GetVacancyReportAsync(filter);

            var slot9 = res.Data!.HourSlots.Single(s => s.Hour == 9);
            Assert.Equal(100.0, slot9.VacancyRate, 1);
            Assert.Equal(0.0, slot9.AvgBookedRooms, 1);
        }

        [Fact]
        public async Task Room_filter_limits_capacity_and_occupancy_scope()
        {
            SeedSecondRoom();

            SeedBooking(new DateTime(2026, 11, 5, 9, 0, 0), BookingTestSeed.RoomId, "Đã duyệt");

            var filter = new ReportFilterDto
            {
                FromDate = new DateTime(2026, 11, 5),
                ToDate = new DateTime(2026, 11, 5),
                RoomId = 2 // chỉ xem TV02
            };

            var res = await _h.CreateReportService().GetVacancyReportAsync(filter);

            var report = res.Data!;
            Assert.Equal(1, report.TotalRooms);

            var slot9 = report.HourSlots.Single(s => s.Hour == 9);
            Assert.Equal(100.0, slot9.VacancyRate, 1); // TV02 rảnh cả ngày
        }

        [Fact]
        public async Task In_use_and_completed_bookings_occupy_slots()
        {
            SeedSecondRoom();

            SeedBooking(new DateTime(2026, 11, 5, 9, 0, 0), BookingTestSeed.RoomId, "Đang sử dụng");
            SeedBooking(new DateTime(2026, 11, 5, 13, 0, 0), 2, "Hoàn thành");

            var filter = new ReportFilterDto
            {
                FromDate = new DateTime(2026, 11, 5),
                ToDate = new DateTime(2026, 11, 5)
            };

            var res = await _h.CreateReportService().GetVacancyReportAsync(filter);

            var slot9 = res.Data!.HourSlots.Single(s => s.Hour == 9);
            Assert.Equal(50.0, slot9.VacancyRate, 1);

            var slot13 = res.Data.HourSlots.Single(s => s.Hour == 13);
            Assert.Equal(50.0, slot13.VacancyRate, 1);
        }

        public void Dispose() => _h.Dispose();
    }
}
