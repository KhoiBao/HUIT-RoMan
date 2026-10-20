using System;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Report.DTOs;
using HUIT_RoMan.Application.Modules.Report.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Employee")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        /// <summary>Báo cáo tổng quan toàn hệ thống (KPIs đơn đặt phòng, giờ dùng, vi phạm, ca trực)</summary>
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview([FromQuery] ReportFilterDto filter)
        {
            var res = await _reportService.GetSystemOverviewAsync(filter);
            return Ok(res);
        }

        /// <summary>Thống kê số lượng lượt mượn phòng theo thời gian, trạng thái, khoa và mục đích</summary>
        [HttpGet("bookings")]
        public async Task<IActionResult> GetBookingStats([FromQuery] ReportFilterDto filter)
        {
            var res = await _reportService.GetBookingStatsReportAsync(filter);
            return Ok(res);
        }

        /// <summary>Thống kê tình trạng sử dụng phòng: Bảng xếp hạng phòng, loại phòng, tỷ lệ lấp đầy</summary>
        [HttpGet("room-usage")]
        public async Task<IActionResult> GetRoomUsageStats([FromQuery] ReportFilterDto filter)
        {
            var res = await _reportService.GetRoomUsageReportAsync(filter);
            return Ok(res);
        }

        /// <summary>Thống kê vi phạm: Phân bố mức độ, lỗi vi phạm phổ biến, người vi phạm và danh sách cấm</summary>
        [HttpGet("violations")]
        public async Task<IActionResult> GetViolationStats([FromQuery] ReportFilterDto filter)
        {
            var res = await _reportService.GetViolationStatsReportAsync(filter);
            return Ok(res);
        }

        /// <summary>Xuất báo cáo dạng file CSV chuẩn UTF-8 có BOM</summary>
        [HttpGet("export")]
        public async Task<IActionResult> ExportCsv([FromQuery] string reportType, [FromQuery] ReportFilterDto filter)
        {
            var (bytes, fileName, contentType) = await _reportService.ExportReportCsvAsync(reportType ?? "bookings", filter);
            return File(bytes, contentType, fileName);
        }
    }
}
