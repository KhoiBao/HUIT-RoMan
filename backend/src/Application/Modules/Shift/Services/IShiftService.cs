using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Shift.DTOs;

namespace HUIT_RoMan.Application.Modules.Shift.Services
{
    public interface IShiftService
    {
        Task<ApiResponse<IEnumerable<ShiftDto>>> GetShiftsAsync(ShiftFilterDto filter);
        Task<ApiResponse<ShiftDto>> GetShiftByIdAsync(int id);
        Task<ApiResponse<ShiftDto>> CreateShiftAsync(CreateShiftDto dto);
        Task<ApiResponse<ShiftDto>> UpdateShiftAsync(int id, UpdateShiftDto dto);
        Task<ApiResponse<bool>> DeleteShiftAsync(int id);
        Task<ApiResponse<ShiftDto>> UpdateShiftStatusAsync(int id, string status);
        Task<ApiResponse<ShiftDto>> AssignEmployeesAsync(int id, List<int> employeeIds);
        Task<ApiResponse<IEnumerable<ShiftLogDto>>> GetShiftLogsAsync(int? employeeId = null, DateTime? fromDate = null, DateTime? toDate = null);
        Task<ApiResponse<ShiftLogDto>> CreateShiftLogAsync(CreateShiftLogDto dto);
        Task<ApiResponse<IEnumerable<ShiftDto>>> GetMyShiftsAsync(DateTime? fromDate = null, DateTime? toDate = null);
        Task<ApiResponse<ShiftStatsDto>> GetShiftStatsAsync();
    }
}
