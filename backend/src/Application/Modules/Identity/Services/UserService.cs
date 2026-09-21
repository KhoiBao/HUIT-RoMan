using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public class UserService : IUserService
    {
        private readonly UserManager<User> _userManager;

        public UserService(UserManager<User> userManager)
        {
            _userManager = userManager;
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ALL
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<UserDto>>> GetAllAsync()
        {
            var users = _userManager.Users.ToList();
            var dtos = new List<UserDto>();
            foreach (var u in users)
                dtos.Add(await MapUserDtoAsync(u));
            return ApiResponse<IEnumerable<UserDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET BY ID
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<UserDto>> GetByIdAsync(int id)
        {
            var u = await _userManager.FindByIdAsync(id.ToString());
            if (u == null)
                return ApiResponse<UserDto>.ErrorResponse("Không tìm thấy người dùng.");
            return ApiResponse<UserDto>.SuccessResponse(await MapUserDtoAsync(u));
        }

        // ─────────────────────────────────────────────────────────────────
        // GET STUDENTS / LECTURERS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<UserDto>>> GetStudentsAsync()
        {
            var users = await _userManager.GetUsersInRoleAsync("Student");
            var dtos = new List<UserDto>();
            foreach (var u in users)
                dtos.Add(await MapUserDtoAsync(u, "Student"));
            return ApiResponse<IEnumerable<UserDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<IEnumerable<UserDto>>> GetLecturersAsync()
        {
            var users = await _userManager.GetUsersInRoleAsync("Lecturer");
            var dtos = new List<UserDto>();
            foreach (var u in users)
                dtos.Add(await MapUserDtoAsync(u, "Lecturer"));
            return ApiResponse<IEnumerable<UserDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // UPDATE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> UpdateAsync(int id, UpdateUserDto request)
        {
            var u = await _userManager.FindByIdAsync(id.ToString());
            if (u == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy người dùng.");

            u.FullName = request.FullName ?? u.FullName;
            u.Email = request.Email ?? u.Email;
            u.PhoneNumber = request.PhoneNumber ?? u.PhoneNumber;
            u.Status = request.Status ?? u.Status;
            if (request.DepartmentId.HasValue)
                u.DepartmentId = request.DepartmentId;

            var result = await _userManager.UpdateAsync(u);
            if (!result.Succeeded)
                return ApiResponse<bool>.ErrorResponse(string.Join("; ", result.Errors.Select(e => e.Description)));

            return ApiResponse<bool>.SuccessResponse(true, "Cập nhật thông tin người dùng thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // CHANGE ROLE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> ChangeRoleAsync(int id, ChangeUserRoleDto request)
        {
            var allowedRoles = new[] { "Student", "Lecturer", "Employee", "Admin" };
            if (!allowedRoles.Contains(request.Role))
                return ApiResponse<bool>.ErrorResponse(
                    $"Role không hợp lệ. Chỉ chấp nhận: {string.Join(", ", allowedRoles)}");

            var u = await _userManager.FindByIdAsync(id.ToString());
            if (u == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy người dùng.");

            var currentRoles = await _userManager.GetRolesAsync(u);
            if (currentRoles.Any())
                await _userManager.RemoveFromRolesAsync(u, currentRoles);

            var result = await _userManager.AddToRoleAsync(u, request.Role);
            if (!result.Succeeded)
                return ApiResponse<bool>.ErrorResponse(string.Join("; ", result.Errors.Select(e => e.Description)));

            return ApiResponse<bool>.SuccessResponse(true, $"Đã đổi Role thành '{request.Role}'.");
        }

        // ─────────────────────────────────────────────────────────────────
        // SET STATUS (Active / Inactive / Suspended)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> SetStatusAsync(int id, string status)
        {
            var allowedStatuses = new[] { "Hoạt động", "Không hoạt động", "Đình chỉ" };
            if (!allowedStatuses.Contains(status))
                return ApiResponse<bool>.ErrorResponse(
                    $"Status không hợp lệ. Chỉ chấp nhận: {string.Join(", ", allowedStatuses)}");

            var u = await _userManager.FindByIdAsync(id.ToString());
            if (u == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy người dùng.");

            u.Status = status;

            // Khoá đăng nhập nếu Inactive / Suspended
            u.LockoutEnabled = status != "Hoạt động";
            if (status != "Hoạt động")
                await _userManager.SetLockoutEndDateAsync(u, System.DateTimeOffset.MaxValue);
            else
                await _userManager.SetLockoutEndDateAsync(u, null);

            var result = await _userManager.UpdateAsync(u);
            if (!result.Succeeded)
                return ApiResponse<bool>.ErrorResponse(string.Join("; ", result.Errors.Select(e => e.Description)));

            return ApiResponse<bool>.SuccessResponse(true, $"Đã cập nhật trạng thái người dùng thành '{status}'.");
        }

        // ─────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────
        private async Task<UserDto> MapUserDtoAsync(User u, string knownRole = null)
        {
            var roles = await _userManager.GetRolesAsync(u);
            var role = knownRole ?? (roles.Count > 0 ? roles[0] : null);
            return new UserDto
            {
                Id = u.Id,
                UserName = u.UserName,
                CardCode = u.CardCode,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Status = u.Status,
                DepartmentId = u.DepartmentId,
                Role = role,
                CreatedAt = u.CreatedAt,
                IsEmployee = u.EmployeeProfile != null
            };
        }
    }
}
