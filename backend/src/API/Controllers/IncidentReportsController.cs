using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Incidents.DTOs;
using HUIT_RoMan.Application.Modules.Incidents.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class IncidentReportsController : ControllerBase
    {
        private const string StaffRoles = "Admin,Manager,Employee,quan-tri,Quản trị viên,quan-ly,Quản lý,nhan-su,Nhân viên";
        private readonly IIncidentReportService _service;

        public IncidentReportsController(IIncidentReportService service)
        {
            _service = service;
        }

        /// <summary>Tạo mới phiếu báo cáo sự cố & ghi nhận bảo trì.</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateIncidentReportDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _service.CreateAsync(request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>Báo cáo sự cố của người dùng hiện tại.</summary>
        [HttpGet("my")]
        public async Task<IActionResult> GetMy()
        {
            var response = await _service.GetMineAsync();
            return Ok(response);
        }

        /// <summary>Thống kê số lượng sự cố theo trạng thái phục vụ KPI Dashboard.</summary>
        [HttpGet("stats")]
        [Authorize(Roles = StaffRoles)]
        public async Task<IActionResult> GetStats()
        {
            var response = await _service.GetStatsAsync();
            return Ok(response);
        }

        /// <summary>Chi tiết một phiếu báo cáo sự cố theo ID.</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = StaffRoles)]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _service.GetByIdAsync(id);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        /// <summary>Danh sách toàn bộ sự cố & lịch sử bảo trì (kèm bộ lọc đa tiêu chí).</summary>
        [HttpGet]
        [Authorize(Roles = StaffRoles)]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? category,
            [FromQuery] string? severity,
            [FromQuery] string? roomCode,
            [FromQuery] string? keyword)
        {
            var response = await _service.GetAllAsync(status, category, severity, roomCode, keyword);
            return Ok(response);
        }

        /// <summary>Cập nhật thông tin phiếu sự cố, phân công kỹ thuật, chi phí sửa chữa.</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = StaffRoles)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateIncidentReportDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _service.UpdateAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>Cập nhật trạng thái / ghi chú xử lý phiếu.</summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = StaffRoles)]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateIncidentReportStatusDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _service.UpdateStatusAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>Hoàn tất giải quyết sự cố và tùy chọn mở lại phòng sẵn sàng phục vụ.</summary>
        [HttpPost("{id}/resolve")]
        [Authorize(Roles = StaffRoles)]
        public async Task<IActionResult> Resolve(int id, [FromBody] ResolveIncidentReportDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _service.ResolveAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>Xóa phiếu sự cố khỏi danh sách quản lý.</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = StaffRoles)]
        public async Task<IActionResult> Delete(int id)
        {
            var response = await _service.DeleteAsync(id);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }
    }
}
