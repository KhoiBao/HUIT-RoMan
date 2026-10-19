using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Usage.DTOs;

namespace HUIT_RoMan.Application.Modules.Usage.Services
{
    public interface IUsageService
    {
        Task<ApiResponse<List<UsageSessionDto>>> GetAllSessionsAsync(UsageSessionQueryDto query);
        Task<ApiResponse<List<UsageSessionDto>>> GetActiveSessionsAsync();
        Task<ApiResponse<List<UsageSessionDto>>> GetMySessionsAsync();
        Task<ApiResponse<UsageSessionDto>> GetByIdAsync(int id);
        Task<ApiResponse<UsageSessionDto>> GetByConfirmationCodeAsync(string code);
        Task<ApiResponse<UsageSummaryDto>> GetSummaryTodayAsync();
        Task<ApiResponse<UsageSessionDto>> CheckInAsync(CheckInRequestDto request);
        Task<ApiResponse<UsageSessionDto>> CheckOutAsync(CheckOutRequestDto request);
        Task<ApiResponse<bool>> CancelNoShowAsync(int usageSessionId, string? reason = null);
        Task EnsureSessionForBookingDetailAsync(int bookingDetailId);
    }
}
