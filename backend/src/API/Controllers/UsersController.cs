using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Application.Modules.Identity.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ICurrentUserService _currentUser;

        public UsersController(IUserService userService, ICurrentUserService currentUser)
        {
            _userService = userService;
            _currentUser = currentUser;
        }

        // ─────────────────────────────────────────────────────────────────
        // CURRENT USER PROFILE
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy thông tin người dùng hiện tại đang đăng nhập</summary>
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            if (_currentUser.UserId == null)
                return Unauthorized(new { message = "Bạn chưa đăng nhập." });

            var response = await _userService.GetByIdAsync(_currentUser.UserId.Value);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        /// <summary>Cập nhật thông tin cá nhân của người dùng hiện tại</summary>
        [HttpPut("me")]
        public async Task<IActionResult> UpdateCurrentUser([FromBody] UpdateUserDto request)
        {
            if (_currentUser.UserId == null)
                return Unauthorized(new { message = "Bạn chưa đăng nhập." });

            var response = await _userService.UpdateAsync(_currentUser.UserId.Value, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // READ
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy tất cả người dùng (Admin, Employee)</summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetAll()
        {
            var response = await _userService.GetAllAsync();
            return Ok(response);
        }

        /// <summary>Tìm kiếm người dùng / người mượn đa tiêu chí (tên, MSSV/mã cán bộ, email, phone, role, status)</summary>
        [HttpGet("search")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> Search(
            [FromQuery] string? keyword,
            [FromQuery] string? role,
            [FromQuery] string? status,
            [FromQuery] int? departmentId)
        {
            var response = await _userService.SearchAsync(keyword, role, status, departmentId);
            return Ok(response);
        }

        /// <summary>Lấy thông tin một người dùng theo ID</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _userService.GetByIdAsync(id);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }


        /// <summary>Lấy danh sách sinh viên</summary>
        [HttpGet("students")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetStudents()
        {
            var response = await _userService.GetStudentsAsync();
            return Ok(response);
        }

        /// <summary>Lấy danh sách giảng viên</summary>
        [HttpGet("lecturers")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> GetLecturers()
        {
            var response = await _userService.GetLecturersAsync();
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Tạo tài khoản người dùng mới (Admin only)</summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _userService.CreateAsync(request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // UPDATE
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Cập nhật thông tin người dùng</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _userService.UpdateAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>Đổi Role cho người dùng (Admin only)</summary>
        [HttpPatch("{id}/role")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeUserRoleDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _userService.ChangeRoleAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>
        /// Cập nhật trạng thái người dùng: Active | Inactive | Suspended
        /// Inactive/Suspended sẽ khoá đăng nhập ngay lập tức.
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetStatus(int id, [FromQuery] string status)
        {
            var response = await _userService.SetStatusAsync(id, status);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>
        /// Người quản lý đặt lại mật khẩu cho sinh viên / giảng viên (Admin, Employee)
        /// </summary>
        [HttpPost("{id}/reset-password")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> AdminResetPassword(int id, [FromBody] AdminResetPasswordDto? request)
        {
            var response = await _userService.AdminResetPasswordAsync(id, request?.NewPassword);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }
    }
}
