using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.WorkingHours.DTOs;
using HUIT_RoMan.Domain.Entities;
using DepartmentEntity = HUIT_RoMan.Domain.Entities.Department;

namespace HUIT_RoMan.Application.Modules.WorkingHours.Services
{
    public interface IWorkingHourService
    {
        Task<ApiResponse<IEnumerable<WorkingHourDto>>> GetLibraryAsync();
        Task<ApiResponse<bool>> UpdateLibraryAsync(UpdateWorkingHoursDto request);
    }

    /// <summary>
    /// Cấu hình giờ phục vụ của Thư viện HUIT. Chỉ áp dụng cho phòng thuộc
    /// khoa/đơn vị loại Library; phòng học chính quy vẫn đặt theo tiết.
    /// </summary>
    public class WorkingHourService : IWorkingHourService
    {
        private const string LibraryDepartmentType = "Library";

        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<DepartmentEntity> _departmentRepo;
        private readonly IRepository<WorkingHour> _workingHourRepo;
        private readonly ILibraryWorkingHoursProvider _provider;

        public WorkingHourService(IUnitOfWork unitOfWork, ILibraryWorkingHoursProvider provider)
        {
            _unitOfWork = unitOfWork;
            _departmentRepo = unitOfWork.Repository<DepartmentEntity>();
            _workingHourRepo = unitOfWork.Repository<WorkingHour>();
            _provider = provider;
        }

        public async Task<ApiResponse<IEnumerable<WorkingHourDto>>> GetLibraryAsync()
        {
            var week = await _provider.GetWeekAsync();
            var dtos = week
                .OrderBy(pair => pair.Key == 0 ? 7 : pair.Key)
                .Select(pair => new WorkingHourDto
                {
                    DayOfWeek = pair.Key,
                    OpenTime = pair.Value.OpenTime.ToString(@"hh\:mm"),
                    CloseTime = pair.Value.CloseTime.ToString(@"hh\:mm"),
                    IsClosed = pair.Value.IsClosed
                })
                .ToList();

            return ApiResponse<IEnumerable<WorkingHourDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<bool>> UpdateLibraryAsync(UpdateWorkingHoursDto request)
        {
            var days = request?.Days ?? new List<WorkingHourDto>();
            if (days.Count != 7 || days.Select(d => d.DayOfWeek).Distinct().Count() != 7
                || days.Any(d => d.DayOfWeek < 0 || d.DayOfWeek > 6))
            {
                return ApiResponse<bool>.ErrorResponse(
                    "Cần cấu hình đủ 7 ngày trong tuần (Chủ Nhật đến Thứ Bảy).");
            }

            var parsed = new Dictionary<int, (TimeSpan Open, TimeSpan Close, bool IsClosed)>();
            foreach (var day in days)
            {
                if (day.IsClosed)
                {
                    parsed[day.DayOfWeek] = (new TimeSpan(7, 0, 0), new TimeSpan(20, 0, 0), true);
                    continue;
                }

                if (!TryParseTime(day.OpenTime, out var open) || !TryParseTime(day.CloseTime, out var close))
                    return ApiResponse<bool>.ErrorResponse("Giờ phục vụ không hợp lệ. Định dạng đúng: HH:mm.");
                if (close <= open)
                    return ApiResponse<bool>.ErrorResponse("Giờ đóng cửa phải sau giờ mở cửa.");

                parsed[day.DayOfWeek] = (open, close, false);
            }

            var department = (await _departmentRepo.FindAsync(d => d.Type == LibraryDepartmentType))
                .FirstOrDefault();
            if (department == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy đơn vị Thư viện để cấu hình giờ phục vụ.");

            var existing = (await _workingHourRepo.FindAsync(w => w.DepartmentId == department.Id))
                .ToDictionary(w => w.DayOfWeek);

            foreach (var (dayOfWeek, config) in parsed)
            {
                if (existing.TryGetValue(dayOfWeek, out var row))
                {
                    row.OpenTime = config.Open;
                    row.CloseTime = config.Close;
                    row.IsClosed = config.IsClosed;
                    row.UpdatedAt = DateTime.UtcNow;
                    _workingHourRepo.Update(row);
                }
                else
                {
                    await _workingHourRepo.AddAsync(new WorkingHour
                    {
                        DepartmentId = department.Id,
                        DayOfWeek = dayOfWeek,
                        OpenTime = config.Open,
                        CloseTime = config.Close,
                        IsClosed = config.IsClosed,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<bool>.SuccessResponse(true, "Cập nhật giờ phục vụ Thư viện thành công.");
        }

        private static bool TryParseTime(string? value, out TimeSpan time)
        {
            time = default;
            if (string.IsNullOrWhiteSpace(value)) return false;

            return TimeSpan.TryParseExact(
                value.Trim(),
                new[] { @"h\:mm", @"hh\:mm", @"hh\:mm\:ss" },
                CultureInfo.InvariantCulture,
                out time);
        }
    }
}
