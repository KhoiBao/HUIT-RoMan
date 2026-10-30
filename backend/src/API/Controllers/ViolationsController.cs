using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Modules.Violation.DTOs;
using HUIT_RoMan.Application.Modules.Violation.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ViolationsController : ControllerBase
    {
        private readonly IViolationService _violationService;
        private readonly ICurrentUserService _currentUserService;

        public ViolationsController(IViolationService violationService, ICurrentUserService currentUserService)
        {
            _violationService = violationService;
            _currentUserService = currentUserService;
        }

        // ─────────────────────────────────────────────────────────────────
        // VIOLATION TYPES
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy danh sách các loại vi phạm</summary>
        [HttpGet("types")]
        public async Task<IActionResult> GetTypes()
        {
            var res = await _violationService.GetViolationTypesAsync();
            return Ok(res);
        }

        /// <summary>Lấy chi tiết loại vi phạm theo ID</summary>
        [HttpGet("types/{id}")]
        public async Task<IActionResult> GetTypeById(int id)
        {
            var res = await _violationService.GetViolationTypeByIdAsync(id);
            if (!res.Success) return NotFound(res);
            return Ok(res);
        }

        /// <summary>Thêm mới loại vi phạm</summary>
        [HttpPost("types")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> CreateType([FromBody] CreateViolationTypeDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _violationService.CreateViolationTypeAsync(request);
            if (!res.Success) return BadRequest(res);
            return CreatedAtAction(nameof(GetTypeById), new { id = res.Data?.Id }, res);
        }

        /// <summary>Cập nhật loại vi phạm</summary>
        [HttpPut("types/{id}")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> UpdateType(int id, [FromBody] UpdateViolationTypeDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _violationService.UpdateViolationTypeAsync(id, request);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Xóa loại vi phạm</summary>
        [HttpDelete("types/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteType(int id)
        {
            var res = await _violationService.DeleteViolationTypeAsync(id);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        // ─────────────────────────────────────────────────────────────────
        // VIOLATION RECORDS
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy danh sách biên bản vi phạm kèm bộ lọc đa tiêu chí</summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetAll([FromQuery] ViolationFilterDto filter)
        {
            var res = await _violationService.GetViolationRecordsAsync(filter);
            return Ok(res);
        }

        /// <summary>Lấy chi tiết biên bản vi phạm theo ID</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetById(int id)
        {
            var res = await _violationService.GetViolationRecordByIdAsync(id);
            if (!res.Success) return NotFound(res);
            return Ok(res);
        }

        /// <summary>Lập và ghi nhận biên bản vi phạm mới (kèm áp dụng hình phạt / cấm mượn)</summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> RecordViolation([FromBody] RecordViolationDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _violationService.RecordViolationAsync(request);
            if (!res.Success) return BadRequest(res);
            return CreatedAtAction(nameof(GetById), new { id = res.Data?.Id }, res);
        }

        /// <summary>Cập nhật biên bản vi phạm và trạng thái xử lý (Chờ xử lý / Đã xử lý / Đã nộp phạt / Hủy)</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> UpdateViolation(int id, [FromBody] UpdateViolationRecordDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _violationService.UpdateViolationRecordAsync(id, request);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Xóa biên bản vi phạm</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteViolation(int id)
        {
            var res = await _violationService.DeleteViolationRecordAsync(id);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        // ─────────────────────────────────────────────────────────────────
        // USER RESTRICTIONS (Lệnh cấm mượn phòng)
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy danh sách người dùng đang bị hạn chế/cấm mượn phòng</summary>
        [HttpGet("restrictions")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetRestrictions([FromQuery] string? status, [FromQuery] string? search)
        {
            var res = await _violationService.GetRestrictionsAsync(status, search);
            return Ok(res);
        }

        /// <summary>Tạo lệnh cấm mượn phòng thủ công</summary>
        [HttpPost("restrictions")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> CreateRestriction([FromBody] CreateUserRestrictionDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var res = await _violationService.CreateRestrictionAsync(request);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Gỡ bỏ lệnh cấm mượn phòng sớm</summary>
        [HttpPatch("restrictions/{id}/lift")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> LiftRestriction(int id, [FromBody] LiftRestrictionDto? request)
        {
            var res = await _violationService.LiftRestrictionAsync(id, request?.Reason);
            if (!res.Success) return BadRequest(res);
            return Ok(res);
        }

        /// <summary>Kiểm tra quyền mượn phòng của người dùng (có đang bị cấm hay không)</summary>
        [HttpGet("user-eligibility/{userId}")]
        public async Task<IActionResult> CheckEligibility(int userId)
        {
            var res = await _violationService.CheckUserEligibilityAsync(userId);
            return Ok(res);
        }

        /// <summary>Kiểm tra quyền mượn phòng của chính người dùng đang đăng nhập</summary>
        [HttpGet("my-eligibility")]
        public async Task<IActionResult> CheckMyEligibility()
        {
            if (_currentUserService.UserId == null)
                return Unauthorized(new { message = "Bạn chưa đăng nhập." });

            var res = await _violationService.CheckUserEligibilityAsync(_currentUserService.UserId.Value);
            return Ok(res);
        }

        // ─────────────────────────────────────────────────────────────────
        // STATISTICS & GLOBAL SEARCH
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Thống kê số lượng vi phạm và lệnh cấm</summary>
        [HttpGet("stats")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetStats()
        {
            var res = await _violationService.GetStatsAsync();
            return Ok(res);
        }

        /// <summary>
        /// Tìm kiếm tổng hợp đồng thời: Phòng, Người mượn, Phiếu mượn, Biên bản vi phạm
        /// </summary>
        [HttpGet("global-search")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GlobalSearch([FromQuery] string query)
        {
            var res = await _violationService.GlobalSearchAsync(query);
            return Ok(res);
        }
    }
}
