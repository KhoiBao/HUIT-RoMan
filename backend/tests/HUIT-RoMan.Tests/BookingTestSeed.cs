using System;
using System.Linq;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;

namespace HUIT_RoMan.Tests
{
    /// <summary>Dữ liệu mẫu dùng chung cho các test nghiệp vụ nhận phòng / hủy đơn.</summary>
    internal static class BookingTestSeed
    {
        public const int AdminId = 1;
        public const int StudentAId = 10;
        public const int StudentBId = 20;
        public const int RoomId = 1;

        public static void EnsureBaseData(ApplicationDbContext db)
        {
            if (!db.Users.Any(u => u.Id == AdminId))
            {
                db.Users.Add(new User
                {
                    Id = AdminId,
                    UserName = "admin01",
                    FullName = "Quản trị viên",
                    CardCode = "QTV001",
                    Status = "Hoạt động",
                    Email = "admin@huit.edu.vn"
                });
            }

            if (!db.Employees.Any(e => e.UserId == AdminId))
            {
                db.Employees.Add(new Employee
                {
                    Id = 1,
                    UserId = AdminId,
                    Code = "NV001",
                    Position = "Quản trị viên",
                    Status = "Hoạt động"
                });
            }

            if (!db.Users.Any(u => u.Id == StudentAId))
            {
                db.Users.Add(new User
                {
                    Id = StudentAId,
                    UserName = "sinhvienA",
                    FullName = "Sinh viên A",
                    CardCode = "SV001",
                    Status = "Hoạt động",
                    Email = "svA@huit.edu.vn"
                });
            }

            if (!db.Users.Any(u => u.Id == StudentBId))
            {
                db.Users.Add(new User
                {
                    Id = StudentBId,
                    UserName = "sinhvienB",
                    FullName = "Sinh viên B",
                    CardCode = "SV002",
                    Status = "Hoạt động",
                    Email = "svB@huit.edu.vn"
                });
            }

            if (!db.RoomTypes.Any())
            {
                db.RoomTypes.Add(new RoomType
                {
                    Id = 1,
                    Name = "Phòng học nhóm",
                    Description = "Phòng học nhóm thư viện",
                    DefaultCapacity = 6,
                    Status = "Hoạt động",
                    IsBookingByPeriod = false
                });
            }

            if (!db.Rooms.Any(r => r.Id == RoomId))
            {
                db.Rooms.Add(new Room
                {
                    Id = RoomId,
                    Name = "Phòng học nhóm TV01",
                    RoomCode = "TV01",
                    Floor = "3",
                    Building = "Thư viện",
                    RoomNumber = "TV01",
                    Capacity = 6,
                    Status = "Trống",
                    Description = "",
                    RoomTypeId = 1
                });
            }

            db.SaveChanges();
        }

        /// <summary>Tạo một đơn đã duyệt (mặc định) với 1 chi tiết phòng, bắt đầu at startAtUtc.</summary>
        public static Booking MakeBooking(
            ApplicationDbContext db,
            DateTime startAtUtc,
            int userId = StudentAId,
            string status = "Đã duyệt",
            int detailCount = 1)
        {
            var booking = new Booking
            {
                ActivityName = "Học nhóm cuối kỳ",
                Purpose = "Ôn tập môn Lập trình",
                GuestCount = 4,
                Note = "",
                RejectionReason = "",
                Status = status,
                RequestedAt = startAtUtc.AddDays(-1),
                CreatedAt = startAtUtc.AddDays(-1),
                UserId = userId
            };
            db.Bookings.Add(booking);
            db.SaveChanges();

            for (var i = 0; i < detailCount; i++)
            {
                db.BookingDetails.Add(new BookingDetail
                {
                    BookingId = booking.Id,
                    RoomId = RoomId,
                    StartAt = startAtUtc,
                    EndAt = startAtUtc.AddHours(2),
                    GuestCount = 4,
                    Purpose = "Ôn tập",
                    RejectionReason = "",
                    Status = status
                });
            }

            db.SaveChanges();
            return booking;
        }
    }
}
