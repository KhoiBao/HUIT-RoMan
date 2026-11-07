using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Incidents.DTOs;

namespace HUIT_RoMan.Application.Modules.Incidents.Services
{
    public interface IIncidentReportService
    {
        Task<ApiResponse<IncidentReportDto>> CreateAsync(CreateIncidentReportDto request);
        Task<ApiResponse<IncidentReportDto>> GetByIdAsync(int id);
        Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetMineAsync();
        Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetAllAsync(
            string? status = null,
            string? category = null,
            string? severity = null,
            string? roomCode = null,
            string? keyword = null);
        Task<ApiResponse<IncidentStatsDto>> GetStatsAsync();
        Task<ApiResponse<IncidentReportDto>> UpdateAsync(int id, UpdateIncidentReportDto request);
        Task<ApiResponse<IncidentReportDto>> UpdateStatusAsync(int id, UpdateIncidentReportStatusDto request);
        Task<ApiResponse<IncidentReportDto>> ResolveAsync(int id, ResolveIncidentReportDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);
    }
}
