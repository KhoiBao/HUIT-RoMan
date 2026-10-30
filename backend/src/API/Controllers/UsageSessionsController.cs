using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Usage.DTOs;
using HUIT_RoMan.Application.Modules.Usage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsageSessionsController : ControllerBase
    {
        private readonly IUsageService _usageService;

        public UsageSessionsController(IUsageService usageService)
        {
            _usageService = usageService;
        }

        /// <summary>
        /// Lấy danh sách tất cả các phiên sử dụng phòng (Admin, Nhân sự)
        /// Hỗ trợ lọc theo trạng thái, phòng, ngày và tìm kiếm từ khóa.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetAll([FromQuery] UsageSessionQueryDto query)
        {
            var response = await _usageService.GetAllSessionsAsync(query);
            return Ok(response);
        }

        /// <summary>
        /// Lấy danh sách các phòng/phiên đang sử dụng thời gian thực (In-Use)
        /// </summary>
        [HttpGet("active")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetActive()
        {
            var response = await _usageService.GetActiveSessionsAsync();
            return Ok(response);
        }

        /// <summary>
        /// Thống kê nhanh tình hình sử dụng phòng trong ngày hôm nay
        /// </summary>
        [HttpGet("summary")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetSummary()
        {
            var response = await _usageService.GetSummaryTodayAsync();
            return Ok(response);
        }

        /// <summary>
        /// Lấy lịch sử phiên sử dụng phòng của chính người dùng hiện tại (Sinh viên, Giảng viên)
        /// </summary>
        [HttpGet("my")]
        public async Task<IActionResult> GetMy()
        {
            var response = await _usageService.GetMySessionsAsync();
            return Ok(response);
        }

        /// <summary>
        /// Lấy chi tiết phiên sử dụng theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _usageService.GetByIdAsync(id);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        /// <summary>
        /// Tra cứu phiên sử dụng phòng theo Mã xác nhận nhận phòng (ConfirmationCode)
        /// </summary>
        [HttpGet("code/{code}")]
        public async Task<IActionResult> GetByCode(string code)
        {
            var response = await _usageService.GetByConfirmationCodeAsync(code);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        /// <summary>
        /// Check-in nhận phòng (Bắt đầu sử dụng phòng)
        /// Người dùng (Sinh viên, Giảng viên) tự check-in cho đơn của mình hoặc Nhân sự/Admin check-in tại quầy.
        /// Chuyển trạng thái phiên và trạng thái phòng sang 'Đang sử dụng'.
        /// </summary>
        [HttpPost("check-in")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _usageService.CheckInAsync(request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>
        /// Xác nhận trả phòng (Check-out) & Bàn giao thiết bị
        /// Người dùng tự trả phòng hoặc Nhân sự/Admin xác nhận bàn giao.
        /// Kết thúc phiên sử dụng, chuyển trạng thái phòng về 'Trống' hoặc 'Bảo trì'.
        /// </summary>
        [HttpPost("check-out")]
        public async Task<IActionResult> CheckOut([FromBody] CheckOutRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _usageService.CheckOutAsync(request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>
        /// Hủy phiên do quá giờ không nhận phòng (No-show quá 15 phút)
        /// Giải phóng trạng thái phòng về 'Trống'.
        /// </summary>
        [HttpPatch("{id}/no-show")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> CancelNoShow(int id, [FromQuery] string? reason = null)
        {
            var response = await _usageService.CancelNoShowAsync(id, reason);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }
    }
}
