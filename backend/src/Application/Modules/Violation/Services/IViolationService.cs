using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Violation.DTOs;

namespace HUIT_RoMan.Application.Modules.Violation.Services
{
    public interface IViolationService
    {
        // ── Violation Types ───────────────────────────────────────────────
        Task<ApiResponse<IEnumerable<ViolationTypeDto>>> GetViolationTypesAsync();
        Task<ApiResponse<ViolationTypeDto>> GetViolationTypeByIdAsync(int id);
        Task<ApiResponse<ViolationTypeDto>> CreateViolationTypeAsync(CreateViolationTypeDto request);
        Task<ApiResponse<ViolationTypeDto>> UpdateViolationTypeAsync(int id, UpdateViolationTypeDto request);
        Task<ApiResponse<bool>> DeleteViolationTypeAsync(int id);

        // ── Violation Records ─────────────────────────────────────────────
        Task<ApiResponse<IEnumerable<ViolationRecordDto>>> GetViolationRecordsAsync(ViolationFilterDto filter);
        Task<ApiResponse<ViolationRecordDto>> GetViolationRecordByIdAsync(int id);
        Task<ApiResponse<ViolationRecordDto>> RecordViolationAsync(RecordViolationDto request);
        Task<ApiResponse<ViolationRecordDto>> UpdateViolationRecordAsync(int id, UpdateViolationRecordDto request);
        Task<ApiResponse<bool>> DeleteViolationRecordAsync(int id);

        // ── User Restrictions (Cấm / Hạn chế mượn phòng) ─────────────────
        Task<ApiResponse<IEnumerable<UserRestrictionDto>>> GetRestrictionsAsync(string? status = null, string? search = null);
        Task<ApiResponse<UserRestrictionDto>> CreateRestrictionAsync(CreateUserRestrictionDto request);
        Task<ApiResponse<bool>> LiftRestrictionAsync(int restrictionId, string? reason = null);
        Task<ApiResponse<UserEligibilityDto>> CheckUserEligibilityAsync(int userId);

        // ── Statistics & Unified Search ───────────────────────────────────
        Task<ApiResponse<ViolationStatsDto>> GetStatsAsync();
        Task<ApiResponse<GlobalSearchResultDto>> GlobalSearchAsync(string query);
    }
}
