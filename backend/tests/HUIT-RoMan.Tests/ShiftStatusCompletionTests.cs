using System;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
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
    }
}
