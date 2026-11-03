using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Incidents.DTOs;

namespace HUIT_RoMan.Application.Modules.Incidents.Services
{
    public interface IIncidentReportService
    {
        /// <summary>Người dùng báo sự cố/hư hỏng thiết bị của phòng.</summary>
        Task<ApiResponse<IncidentReportDto>> CreateAsync(CreateIncidentReportDto request);

        /// <summary>Danh sách phiếu của người dùng hiện tại.</summary>
        Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetMineAsync();

        /// <summary>Danh sách toàn bộ phiếu (nâng cấp nhân sự), lọc theo trạng thái.</summary>
        Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetAllAsync(string? status = null);

        /// <summary>Nhân sự cập nhật trạng thái / ghi chú xử lý.</summary>
        Task<ApiResponse<IncidentReportDto>> UpdateStatusAsync(int id, UpdateIncidentReportStatusDto request);
    }
}

