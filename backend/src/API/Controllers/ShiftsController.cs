using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Shift.DTOs;
using HUIT_RoMan.Application.Modules.Shift.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Employee")]
    public class ShiftsController : ControllerBase
    {
        private readonly IShiftService _shiftService;

        public ShiftsController(IShiftService shiftService)
        {
            _shiftService = shiftService;
        }

        /// <summary>Lấy danh sách ca trực có hỗ trợ lọc</summary>
        [HttpGet]
        public async Task<IActionResult> GetShifts([FromQuery] ShiftFilterDto filter)
        {
            var res = await _shiftService.GetShiftsAsync(filter);
            return Ok(res);
        }

        /// <summary>Thống kê số lượng ca trực và nhân sự</summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetShiftStats()
        {
            var res = await _shiftService.GetShiftStatsAsync();
            return Ok(res);
        }

        /// <summary>Lấy lịch trực của chính nhân viên đang đăng nhập</summary>
        [HttpGet("my-shifts")]
        public async Task<IActionResult> GetMyShifts([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var res = await _shiftService.GetMyShiftsAsync(fromDate, toDate);
            return Ok(res);
        }

        /// <summary>Lấy chi tiết ca trực theo ID</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var res = await _shiftService.GetShiftByIdAsync(id);
            if (!res.Success) return NotFound(res);
            return Ok(res);
        }

        /// <summary>Tạo ca trực mới</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateShiftDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _shiftService.CreateShiftAsync(dto);
            if (!res.Success) return BadRequest(res);
            return CreatedAtAction(nameof(GetById), new { id = res.Data?.Id }, res);
        }

        /// <summary>Cập nhật thông tin ca trực</summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateShiftDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _shiftService.UpdateShiftAsync(id, dto);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Xóa ca trực</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var res = await _shiftService.DeleteShiftAsync(id);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Cập nhật trạng thái ca trực (Lên lịch / Đang trực / Hoàn thành / Hủy)</summary>
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Status))
                return BadRequest(new { message = "Trạng thái không được để trống." });

            var res = await _shiftService.UpdateShiftStatusAsync(id, request.Status);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Gán hoặc thay đổi nhân viên trực cho ca</summary>
        [HttpPost("{id}/assign")]
        public async Task<IActionResult> AssignEmployees(int id, [FromBody] AssignEmployeesRequest request)
        {
            var res = await _shiftService.AssignEmployeesAsync(id, request.EmployeeIds ?? new List<int>());
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Lấy danh sách nhật ký ca trực</summary>
        [HttpGet("logs")]
        public async Task<IActionResult> GetShiftLogs(
            [FromQuery] int? employeeId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var res = await _shiftService.GetShiftLogsAsync(employeeId, fromDate, toDate);
            return Ok(res);
        }

        /// <summary>Ghi nhật ký ca trực mới</summary>
        [HttpPost("logs")]
        public async Task<IActionResult> CreateShiftLog([FromBody] CreateShiftLogDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _shiftService.CreateShiftLogAsync(dto);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    public class AssignEmployeesRequest
    {
        public List<int> EmployeeIds { get; set; } = new List<int>();
    }
}
