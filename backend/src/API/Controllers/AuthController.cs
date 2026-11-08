using System;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Application.Modules.Identity.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ICurrentUserService _currentUser;

        public AuthController(IAuthService authService, ICurrentUserService currentUser)
        {
            _authService = authService;
            _currentUser = currentUser;
        }

        [EnableRateLimiting("auth")]
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var response = await _authService.LoginAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [EnableRateLimiting("otp")]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var response = await _authService.ForgotPasswordAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [EnableRateLimiting("otp")]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var success = await _authService.ResetPasswordAsync(request);
                return Ok(new { success, message = "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bằng mật khẩu mới." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Người dùng tự đổi mật khẩu (cần mật khẩu hiện tại)</summary>
        [Authorize]
        [EnableRateLimiting("auth")]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (_currentUser.UserId == null)
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

            try
            {
                var success = await _authService.ChangePasswordAsync(_currentUser.UserId.Value, request);
                return Ok(new { success, message = "Đổi mật khẩu thành công. Lần đăng nhập sau hãy dùng mật khẩu mới." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}

