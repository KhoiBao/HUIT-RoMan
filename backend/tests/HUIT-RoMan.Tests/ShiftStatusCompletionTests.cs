using System;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using System.Collections.Generic;
using HUIT_RoMan.Application.Modules.Shift.DTOs;
using HUIT_RoMan.Application.Modules.Shift.Services;
using HUIT_RoMan.Domain.Entities;
using Xunit;

namespace HUIT_RoMan.Tests
{
    public class ShiftStatusCompletionTests : IDisposable
    {
        private readonly SqliteTestBed _bed;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ShiftService _service;

        public ShiftStatusCompletionTests()
        {
            _bed = new SqliteTestBed();
            _unitOfWork = _bed.CreateUnitOfWork(out _);
            _service = new ShiftService(_unitOfWork, new FakeCurrentUser
            {
                UserId = 1,
                Role = "Admin",
                IsAdmin = true
            });
        }

        public void Dispose() => _bed.Dispose();

        private static DateTime VietnamDate(int offsetDays = 0) =>
            DateTime.SpecifyKind(DateTime.UtcNow.AddHours(7).Date.AddDays(offsetDays), DateTimeKind.Utc);

        private async Task<Shift> AddShiftAsync(DateTime date, string status = "Đang trực")
        {
            var shift = new Shift
            {
                Date = date,
                Name = "Ca kiểm thử",
                StartTime = new TimeSpan(7, 0, 0),
                EndTime = new TimeSpan(11, 30, 0),
                Status = status,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Repository<Shift>().AddAsync(shift);
            await _unitOfWork.SaveChangesAsync();
            return shift;
        }

        [Fact]
        public async Task UpdateStatus_CompleteTodayShift_Succeeds()
        {
            var shift = await AddShiftAsync(VietnamDate());

            var result = await _service.UpdateShiftStatusAsync(shift.Id, "Hoàn thành");

            Assert.True(result.Success, result.Message);
            Assert.Equal("Hoàn thành", result.Data!.Status);
        }

        [Fact]
        public async Task UpdateStatus_CompleteShiftFromPreviousDay_IsRejected()
        {
            var shift = await AddShiftAsync(VietnamDate(-1));

            var result = await _service.UpdateShiftStatusAsync(shift.Id, "Hoàn thành");

            Assert.False(result.Success);
            Assert.Contains("trong ngày diễn ra ca", result.Message);

            var stored = await _unitOfWork.Repository<Shift>().GetByIdAsync(shift.Id);
            Assert.Equal("Đang trực", stored!.Status);
        }

        [Fact]
        public async Task UpdateStatus_CancelShiftFromPreviousDay_IsStillAllowed()
        {
            var shift = await AddShiftAsync(VietnamDate(-1));

            var result = await _service.UpdateShiftStatusAsync(shift.Id, "Hủy");

            Assert.True(result.Success, result.Message);
            Assert.Equal("Hủy", result.Data!.Status);
        }
        [Fact]
        public async Task CreateShift_OnTodayOrPast_IsRejected()
        {
            var todayDto = new CreateShiftDto
            {
                Date = VietnamDate(0),
                Name = "Ca hôm nay",
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(12, 0, 0)
            };
            var todayResult = await _service.CreateShiftAsync(todayDto);
            Assert.False(todayResult.Success);
            Assert.Contains("Chỉ được phân ca trực cho các ngày sau ngày hiện tại.", todayResult.Message);

            var pastDto = new CreateShiftDto
            {
                Date = VietnamDate(-2),
                Name = "Ca quá khứ",
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(12, 0, 0)
            };
            var pastResult = await _service.CreateShiftAsync(pastDto);
            Assert.False(pastResult.Success);
            Assert.Contains("Chỉ được phân ca trực cho các ngày sau ngày hiện tại.", pastResult.Message);
        }

        [Fact]
        public async Task CreateShift_OnTomorrow_Succeeds()
        {
            var tomorrowDto = new CreateShiftDto
            {
                Date = VietnamDate(1),
                Name = "Ca ngày mai",
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(12, 0, 0)
            };
            var result = await _service.CreateShiftAsync(tomorrowDto);
            Assert.True(result.Success, result.Message);
            Assert.NotNull(result.Data);
            Assert.Equal("Ca ngày mai", result.Data.Name);
        }

        [Fact]
        public async Task UpdateShift_ToTodayOrPast_IsRejected()
        {
            var futureShift = await AddShiftAsync(VietnamDate(2), "Lên lịch");

            var updateDto = new UpdateShiftDto
            {
                Date = VietnamDate(0),
                Name = "Đổi về hôm nay",
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(12, 0, 0),
                Status = "Lên lịch"
            };

            var result = await _service.UpdateShiftAsync(futureShift.Id, updateDto);
            Assert.False(result.Success);
            Assert.Contains("Chỉ được phân ca trực cho các ngày sau ngày hiện tại.", result.Message);
        }

        [Fact]
        public async Task UpdateShift_OnPastOrTodayShift_IsRejected()
        {
            var todayShift = await AddShiftAsync(VietnamDate(0), "Lên lịch");

            var updateDto = new UpdateShiftDto
            {
                Date = VietnamDate(2),
                Name = "Đổi ca hôm nay",
                StartTime = new TimeSpan(8, 0, 0),
                EndTime = new TimeSpan(12, 0, 0),
                Status = "Lên lịch"
            };

            var result = await _service.UpdateShiftAsync(todayShift.Id, updateDto);
            Assert.False(result.Success);
            Assert.Contains("Không thể chỉnh sửa ca trực của ngày hiện tại hoặc quá khứ.", result.Message);
        }

        [Fact]
        public async Task AssignEmployees_ToPastOrTodayShift_IsRejected()
        {
            var todayShift = await AddShiftAsync(VietnamDate(0), "Lên lịch");

            var result = await _service.AssignEmployeesAsync(todayShift.Id, new List<int>());
            Assert.False(result.Success);
            Assert.Contains("Chỉ được phân ca trực cho các ngày sau ngày hiện tại.", result.Message);
        }

        [Fact]
        public async Task AssignEmployees_ToTomorrowShift_Succeeds()
        {
            var tomorrowShift = await AddShiftAsync(VietnamDate(1), "Lên lịch");

            var result = await _service.AssignEmployeesAsync(tomorrowShift.Id, new List<int>());
            Assert.True(result.Success, result.Message);
        }
        [Fact]
        public async Task CreateShift_WithOverlappingTimeRange_IsRejected()
        {
            var date = VietnamDate(1);
            await AddShiftAsync(date, "Lên lịch"); // 07:00 - 11:30

            // Shift overlapping from 09:00 to 12:00
            var overlapDto = new CreateShiftDto
            {
                Date = date,
                Name = "Ca trùng giờ",
                StartTime = new TimeSpan(9, 0, 0),
                EndTime = new TimeSpan(12, 0, 0)
            };

            var result = await _service.CreateShiftAsync(overlapDto);
            Assert.False(result.Success);
            Assert.Contains("bị trùng với ca trực", result.Message);
        }

        [Fact]
        public async Task CreateShift_WithAdjacentTimeRange_Succeeds()
        {
            var date = VietnamDate(1);
            await AddShiftAsync(date, "Lên lịch"); // 07:00 - 11:30

            // Shift adjacent from 11:30 to 15:00
            var adjacentDto = new CreateShiftDto
            {
                Date = date,
                Name = "Ca kế tiếp",
                StartTime = new TimeSpan(11, 30, 0),
                EndTime = new TimeSpan(15, 0, 0)
            };

            var result = await _service.CreateShiftAsync(adjacentDto);
            Assert.True(result.Success, result.Message);
            Assert.NotNull(result.Data);
        }

        [Fact]
        public async Task UpdateShift_WithOverlappingTimeRange_IsRejected()
        {
            var date = VietnamDate(2);
            // Shift 1: 07:00 - 11:30
            await AddShiftAsync(date, "Lên lịch");

            // Shift 2: 13:00 - 17:00
            var shift2 = new Shift
            {
                Date = date,
                Name = "Ca chiều",
                StartTime = new TimeSpan(13, 0, 0),
                EndTime = new TimeSpan(17, 0, 0),
                Status = "Lên lịch",
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Repository<Shift>().AddAsync(shift2);
            await _unitOfWork.SaveChangesAsync();

            // Try to update Shift 2 to overlap with Shift 1 (10:00 - 14:00)
            var updateDto = new UpdateShiftDto
            {
                Date = date,
                Name = "Ca chiều đổi giờ",
                StartTime = new TimeSpan(10, 0, 0),
                EndTime = new TimeSpan(14, 0, 0),
                Status = "Lên lịch"
            };

            var result = await _service.UpdateShiftAsync(shift2.Id, updateDto);
            Assert.False(result.Success);
            Assert.Contains("bị trùng với ca trực", result.Message);
        }
    }
}
