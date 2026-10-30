using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Booking.DTOs;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    public interface IBookingApprovalSettingService
    {
        /// <summary>Chế độ tự động duyệt đang bật hay tắt (đọc tại thời điểm tạo đơn).</summary>
        Task<bool> IsAutoApproveEnabledAsync();

        /// <summary>Tên người bật chế độ tự động duyệt, dùng cho ghi chú lịch sử.</summary>
        Task<string?> GetAutoApproveEnabledByNameAsync();

        Task<ApiResponse<AutoApprovalSettingDto>> GetAsync();

        Task<ApiResponse<AutoApprovalSettingDto>> UpdateAsync(UpdateAutoApprovalSettingDto request);
    }
}
