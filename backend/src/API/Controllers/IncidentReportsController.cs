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
        private readonly IIncidentReportService _service;

        public IncidentReportsController(IIncidentReportService service)
        {
            _service = service;
        }

        /// <summary>Người dùng báo sự cố / hư hỏng thiết bị (gắn phòng, tùy chọn lần sử dụng).</summary>
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

        /// <summary>Danh sách toàn bộ báo cáo (nhân sự), tùy chọn lọc theo trạng thái.</summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var response = await _service.GetAllAsync(status);
            return Ok(response);
        }

        /// <summary>Nhân sự cập nhật trạng thái / ghi chú xử lý phiếu.</summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateIncidentReportStatusDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _service.UpdateStatusAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }
    }
}

