using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.Services;
using HUIT_RoMan.Domain.Entities;
using Xunit;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Sinh viên chỉ thấy phòng học nhóm và phòng thuyết trình của Thư viện
    /// ở mọi API danh mục phòng/loại phòng; giảng viên vẫn thấy toàn bộ.
    /// </summary>
    public class StudentRoomVisibilityTests
    {
        private static RoomType AddRoomType(BookingHarness h, string name, string code)
        {
            var type = new RoomType
            {
                Name = name,
                Description = name,
                DefaultCapacity = 60,
                Status = "Hoạt động",
                IsBookingByPeriod = false
            };
            h.Db.RoomTypes.Add(type);
            h.Db.SaveChanges();

            h.Db.Rooms.Add(new Room
            {
                Name = $"Phòng {code}",
                RoomCode = code,
                Building = "A",
                Floor = "2",
                RoomNumber = code,
                Capacity = 60,
                Status = "Trống",
                Description = "",
                RoomTypeId = type.Id
            });
            h.Db.SaveChanges();
            return type;
        }

        [Fact]
        public async Task Student_ChiThayPhongHocNhomVaThuyetTrinh()
        {
            using var h = new BookingHarness();
            AddRoomType(h, "Phòng Lý thuyết", "LT01");
            AddRoomType(h, "Phòng Thuyết trình", "TT01");

            var service = new RoomService(h.UoW, h.CurrentUser);
            var response = await service.GetAllAsync();
            var codes = response.Data!.Select(room => room.RoomCode).ToList();

            Assert.Contains("TV01", codes);
            Assert.Contains("TT01", codes);
            Assert.DoesNotContain("LT01", codes);
            Assert.Equal(2, codes.Count);
        }

        [Fact]
        public async Task Student_SearchKhongLoPhongNgoaiQuyen()
        {
            using var h = new BookingHarness();
            AddRoomType(h, "Phòng Lý thuyết", "LT01");

            var service = new RoomService(h.UoW, h.CurrentUser);
            var response = await service.SearchAsync("LT", null, null, null, null, null);

            Assert.Empty(response.Data!);
        }

        [Fact]
        public async Task Student_ChiThayHaiLoaiPhongDuocDat()
        {
            using var h = new BookingHarness();
            AddRoomType(h, "Phòng Lý thuyết", "LT01");
            AddRoomType(h, "Phòng Thuyết trình", "TT01");

            var service = new RoomTypeService(h.UoW, h.CurrentUser);
            var response = await service.GetAllAsync();
            var names = response.Data!.Select(type => type.Name).ToList();

            Assert.Equal(2, names.Count);
            Assert.Contains("Phòng học nhóm", names);
            Assert.Contains("Phòng Thuyết trình", names);
            Assert.DoesNotContain("Phòng Lý thuyết", names);
        }

        [Fact]
        public async Task GiangVien_VanThayToanBoPhong()
        {
            using var h = new BookingHarness();
            h.CurrentUser.Role = "lecturer";
            AddRoomType(h, "Phòng Lý thuyết", "LT01");

            var service = new RoomService(h.UoW, h.CurrentUser);
            var rooms = await service.GetAllAsync();
            var roomTypes = await new RoomTypeService(h.UoW, h.CurrentUser).GetAllAsync();

            Assert.Equal(2, rooms.Data!.Count());
            Assert.Equal(2, roomTypes.Data!.Count());
        }
    }
}
