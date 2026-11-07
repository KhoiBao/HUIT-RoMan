using System;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Modules.Violation.DTOs;
using HUIT_RoMan.Application.Modules.Violation.Services;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HUIT_RoMan.Tests
{
    public class ViolationServiceTests
    {
        private (ViolationService service, BookingHarness harness, ViolationType vt) CreateService()
        {
            var h = new BookingHarness();

            var userStoreMock = new Mock<IUserStore<User>>();
            var userManagerMock = new Mock<UserManager<User>>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);
            userManagerMock.Setup(m => m.FindByIdAsync(It.IsAny<string>()))
                .ReturnsAsync((string id) => h.Db.Users.Find(int.Parse(id)));

            var storageMock = new Mock<IStorageService>();

            var vt = new ViolationType
            {
                Id = 1,
                Code = "VT-01",
                Name = "Gây ồn ào trong phòng tự học",
                Description = "Làm mất trật tự ảnh hưởng người khác",
                Severity = 1,
                DefaultPenalty = "Nhắc nhở"
            };
            if (!h.Db.ViolationTypes.Any(x => x.Id == 1))
            {
                h.Db.ViolationTypes.Add(vt);
                h.Db.SaveChanges();
            }

            var service = new ViolationService(
                h.UoW,
                userManagerMock.Object,
                h.CurrentUser,
                h.EmailMock.Object,
                storageMock.Object);

            return (service, h, vt);
        }

        [Fact]
        public async Task LapBienBan_MucDoNhe_TuDongSetTrangThaiDaXuLy()
        {
            var (service, h, vt) = CreateService();
            using (h)
            {
                var req = new RecordViolationDto
                {
                    UserId = BookingTestSeed.StudentAId,
                    ViolationTypeId = vt.Id,
                    Description = "Nói chuyện to trong phòng",
                    Severity = 1,
                    PenaltyApplied = "Nhắc nhở"
                };

                var res = await service.RecordViolationAsync(req);

                Assert.True(res.Success);
                Assert.NotNull(res.Data);
                Assert.Equal("Đã xử lý", res.Data.Status);
                Assert.StartsWith("VP-", res.Data.Code);

                // Kiểm tra database lưu đúng
                var saved = await h.Db.ViolationRecords.FirstOrDefaultAsync(v => v.Id == res.Data.Id);
                Assert.NotNull(saved);
                Assert.Equal("Đã xử lý", saved.Status);
                Assert.Equal(1, saved.Severity);
            }
        }

        [Fact]
        public async Task LapBienBan_MucDoNghiemTrong_TuDongSetTrangThaiDangXuLy()
        {
            var (service, h, vt) = CreateService();
            using (h)
            {
                var req = new RecordViolationDto
                {
                    UserId = BookingTestSeed.StudentAId,
                    ViolationTypeId = vt.Id,
                    Description = "Làm hư hỏng màn hình TV",
                    Severity = 3,
                    PenaltyApplied = "Bồi thường & Cấm mượn phòng 14 ngày",
                    RestrictDays = 14
                };

                var res = await service.RecordViolationAsync(req);

                Assert.True(res.Success);
                Assert.NotNull(res.Data);
                Assert.Equal("Đang xử lý", res.Data.Status);
                Assert.True(res.Data.IsRestricted);
                Assert.Equal(14, res.Data.RestrictDays);

                // Kiểm tra database
                var saved = await h.Db.ViolationRecords.FirstOrDefaultAsync(v => v.Id == res.Data.Id);
                Assert.NotNull(saved);
                Assert.Equal("Đang xử lý", saved.Status);
                Assert.Equal(3, saved.Severity);

                // Kiểm tra UserRestriction được tạo
                var restriction = await h.Db.UserRestrictions.FirstOrDefaultAsync(r => r.UserId == BookingTestSeed.StudentAId);
                Assert.NotNull(restriction);
                Assert.Equal("Hoạt động", restriction.Status);
                Assert.Equal("Cấm mượn phòng", restriction.RestrictionType);
            }
        }

        [Fact]
        public async Task LapBienBan_DinhDangMaChuan_VP_yyyyMMdd_XXX()
        {
            var (service, h, vt) = CreateService();
            using (h)
            {
                var req = new RecordViolationDto
                {
                    UserId = BookingTestSeed.StudentAId,
                    ViolationTypeId = vt.Id,
                    Description = "Vi phạm kiểm tra sinh mã",
                    Severity = 2
                };

                var res = await service.RecordViolationAsync(req);

                Assert.True(res.Success);
                var todayStr = DateTime.UtcNow.ToString("yyyyMMdd");
                Assert.StartsWith($"VP-{todayStr}-", res.Data!.Code);
            }
        }

        [Fact]
        public async Task GetViolationRecords_DepartmentFilter_ThuVienXemDuocBienBanSinhVien()
        {
            var (service, h, vt) = CreateService();
            using (h)
            {
                // Thêm phòng ban Thư viện (3) và Khoa CNTT (4)
                if (!h.Db.Departments.Any(d => d.Id == 3))
                    h.Db.Departments.Add(new Department { Id = 3, Name = "Thư viện" });
                if (!h.Db.Departments.Any(d => d.Id == 4))
                    h.Db.Departments.Add(new Department { Id = 4, Name = "Khoa CNTT" });
                await h.Db.SaveChangesAsync();

                // Giả lập sinh viên Khoa CNTT (DepartmentId = 4)
                var student = await h.Db.Users.FindAsync(BookingTestSeed.StudentAId);
                Assert.NotNull(student);
                student.DepartmentId = 4;
                await h.Db.SaveChangesAsync();

                // Lập biên bản vi phạm chung trong Thư viện (UsageSessionId = null)
                var req = new RecordViolationDto
                {
                    UserId = BookingTestSeed.StudentAId,
                    ViolationTypeId = vt.Id,
                    Description = "Sinh viên làm ồn khu tự học tầng 2 thư viện",
                    Severity = 1,
                    PenaltyApplied = "Nhắc nhở"
                };

                var createRes = await service.RecordViolationAsync(req);
                Assert.True(createRes.Success);

                // Thủ thư hoặc Admin lọc theo DepartmentId = 3 (Thư viện)
                var filter = new ViolationFilterDto
                {
                    DepartmentId = 3
                };

                var listRes = await service.GetViolationRecordsAsync(filter);
                Assert.True(listRes.Success);
                Assert.Contains(listRes.Data!, r => r.Id == createRes.Data!.Id);

                // Kiểm tra thống kê cũng tính biên bản này
                var statsRes = await service.GetStatsAsync(3);
                Assert.True(statsRes.Success);
                Assert.True(statsRes.Data!.TotalRecords >= 1);
            }
        }
    }
}
