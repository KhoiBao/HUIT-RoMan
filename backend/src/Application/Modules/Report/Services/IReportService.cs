using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Report.DTOs;

namespace HUIT_RoMan.Application.Modules.Report.Services
{
    public interface IReportService
    {
        Task<ApiResponse<SystemOverviewReportDto>> GetSystemOverviewAsync(ReportFilterDto filter);
        Task<ApiResponse<BookingStatsReportDto>> GetBookingStatsReportAsync(ReportFilterDto filter);
        Task<ApiResponse<RoomUsageReportDto>> GetRoomUsageReportAsync(ReportFilterDto filter);
        Task<ApiResponse<ViolationStatsReportDto>> GetViolationStatsReportAsync(ReportFilterDto filter);
        Task<(byte[] Bytes, string FileName, string ContentType)> ExportReportCsvAsync(string reportType, ReportFilterDto filter);
    }
}
