using System.Threading.Tasks;
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

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        // ─────────────────────────────────────────────────────────────────
        // READ
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy tất cả người dùng (Admin)</summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var response = await _userService.GetAllAsync();
            return Ok(response);
        }

        /// <summary>Lấy thông tin một người dùng theo ID</summary>
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _userService.GetByIdAsync(id);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        /// <summary>Lấy danh sách sinh viên</summary>
        [HttpGet("students")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> GetStudents()
        {
            var response = await _userService.GetStudentsAsync();
            return Ok(response);
        }

        /// <summary>Lấy danh sách giảng viên</summary>
        [HttpGet("lecturers")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> GetLecturers()
        {
            var response = await _userService.GetLecturersAsync();
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // UPDATE
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Cập nhật thông tin người dùng</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Employee")]
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
    }
}
