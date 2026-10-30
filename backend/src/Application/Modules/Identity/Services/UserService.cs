using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using Microsoft.EntityFrameworkCore;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public class UserService : IUserService
    {
        private readonly UserManager<User> _userManager;
        private readonly IUnitOfWork? _unitOfWork;

        public UserService(UserManager<User> userManager, IUnitOfWork? unitOfWork = null)
        {
            _userManager = userManager;
            _unitOfWork = unitOfWork;
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ALL
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<UserDto>>> GetAllAsync()
        {
            var users = await _userManager.Users
                .Include(u => u.Department)
                .Include(u => u.EmployeeProfile)
                .ToListAsync();
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
            var u = await _userManager.Users
                .Include(u => u.Department)
                .Include(u => u.EmployeeProfile)
                .FirstOrDefaultAsync(x => x.Id == id);
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
        // CREATE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<CreatedUserDto>> CreateAsync(CreateUserDto request)
        {
            if (request == null)
                return ApiResponse<CreatedUserDto>.ErrorResponse("Dữ liệu không hợp lệ.");

            var cardCode = request.CardCode?.Trim();
            var fullName = request.FullName?.Trim();
            var email = request.Email?.Trim();
            var role = request.Role?.Trim();

            if (string.IsNullOrWhiteSpace(cardCode))
                return ApiResponse<CreatedUserDto>.ErrorResponse("Mã thẻ / MSSV không được để trống.");
            if (cardCode.Length > 50)
                return ApiResponse<CreatedUserDto>.ErrorResponse("Mã thẻ / MSSV tối đa 50 ký tự.");
            if (string.IsNullOrWhiteSpace(fullName))
                return ApiResponse<CreatedUserDto>.ErrorResponse("Họ và tên không được để trống.");
            if (string.IsNullOrWhiteSpace(email) || !EmailPattern.IsMatch(email))
                return ApiResponse<CreatedUserDto>.ErrorResponse("Email không hợp lệ.");
            if (!TryNormalizePhone(request.PhoneNumber, out var normalizedPhone))
                return ApiResponse<CreatedUserDto>.ErrorResponse(
                    "Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số, ví dụ 0912345678.");

            var allowedRoles = new[] { "Student", "Lecturer", "Employee", "Manager", "Admin" };
            var matchedRole = allowedRoles.FirstOrDefault(
                r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
            if (matchedRole == null)
                return ApiResponse<CreatedUserDto>.ErrorResponse(
                    $"Vai trò không hợp lệ. Chỉ chấp nhận: {string.Join(", ", allowedRoles)}");

            if (await _userManager.FindByNameAsync(cardCode) != null ||
                _userManager.Users.Any(u => u.CardCode == cardCode))
                return ApiResponse<CreatedUserDto>.ErrorResponse(
                    $"Mã thẻ / MSSV '{cardCode}' đã tồn tại trong hệ thống.");

            if (await _userManager.FindByEmailAsync(email) != null)
                return ApiResponse<CreatedUserDto>.ErrorResponse(
                    $"Email '{email}' đã được sử dụng bởi tài khoản khác.");

            if (request.DepartmentId.HasValue && request.DepartmentId.Value > 0 && _unitOfWork != null)
            {
                var dept = await _unitOfWork.Repository<HUIT_RoMan.Domain.Entities.Department>()
                    .GetByIdAsync(request.DepartmentId.Value);
                if (dept == null)
                    return ApiResponse<CreatedUserDto>.ErrorResponse("Khoa / đơn vị không tồn tại.");
            }

            var password = string.IsNullOrWhiteSpace(request.Password)
                ? DefaultInitialPassword
                : request.Password.Trim();
            if (password.Length < 6)
                return ApiResponse<CreatedUserDto>.ErrorResponse("Mật khẩu phải có ít nhất 6 ký tự.");

            var user = new User
            {
                UserName = cardCode,
                CardCode = cardCode,
                FullName = fullName,
                Email = email,
                PhoneNumber = normalizedPhone,
                Status = "Hoạt động",
                DepartmentId = request.DepartmentId,
                CreatedAt = DateTime.UtcNow
            };

            var createResult = await _userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
                return ApiResponse<CreatedUserDto>.ErrorResponse(
                    string.Join("; ", createResult.Errors.Select(e => e.Description)));

            var roleResult = await _userManager.AddToRoleAsync(user, matchedRole);
            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                return ApiResponse<CreatedUserDto>.ErrorResponse(
                    string.Join("; ", roleResult.Errors.Select(e => e.Description)));
            }

            if (_unitOfWork != null && (matchedRole == "Employee" || matchedRole == "Manager"))
            {
                var empRepo = _unitOfWork.Repository<Employee>();
                await empRepo.AddAsync(new Employee
                {
                    UserId = user.Id,
                    Code = cardCode,
                    Position = matchedRole == "Manager" ? "Quản lý đơn vị" : "Nhân viên",
                    Status = "Hoạt động",
                    HireDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                });
                await _unitOfWork.SaveChangesAsync();
            }

            return ApiResponse<CreatedUserDto>.SuccessResponse(
                new CreatedUserDto
                {
                    User = await MapUserDtoAsync(user, matchedRole),
                    Password = password
                },
                $"Đã tạo tài khoản {fullName} ({cardCode}).");
        }

        // ─────────────────────────────────────────────────────────────────
        // UPDATE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> UpdateAsync(int id, UpdateUserDto request)
        {
            var u = await _userManager.FindByIdAsync(id.ToString());
            if (u == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy người dùng.");

            if (!TryNormalizePhone(request.PhoneNumber, out var normalizedPhone))
                return ApiResponse<bool>.ErrorResponse(
                    "Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số, ví dụ 0912345678.");

            u.FullName = request.FullName ?? u.FullName;
            u.Email = request.Email ?? u.Email;
            if (request.PhoneNumber != null)
                u.PhoneNumber = normalizedPhone;
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
            if (string.IsNullOrWhiteSpace(request?.Role))
                return ApiResponse<bool>.ErrorResponse("Role không được để trống.");

            var normalizedRole = request.Role.Trim();
            if (string.Equals(normalizedRole, "quan-ly", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(normalizedRole, "quản lý", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(normalizedRole, "quản lý đơn vị", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(normalizedRole, "departmentmanager", StringComparison.OrdinalIgnoreCase))
            {
                normalizedRole = "Manager";
            }
            else if (string.Equals(normalizedRole, "nhan-su", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(normalizedRole, "nhân viên", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(normalizedRole, "thủ thư", StringComparison.OrdinalIgnoreCase))
            {
                normalizedRole = "Employee";
            }
            else if (string.Equals(normalizedRole, "quan-tri", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(normalizedRole, "quản trị viên", StringComparison.OrdinalIgnoreCase))
            {
                normalizedRole = "Admin";
            }
            else if (string.Equals(normalizedRole, "giảng viên", StringComparison.OrdinalIgnoreCase))
            {
                normalizedRole = "Lecturer";
            }
            else if (string.Equals(normalizedRole, "sinh viên", StringComparison.OrdinalIgnoreCase))
            {
                normalizedRole = "Student";
            }

            var allowedRoles = new[] { "Student", "Lecturer", "Employee", "Manager", "Admin" };
            var matchedRole = allowedRoles.FirstOrDefault(r => string.Equals(r, normalizedRole, StringComparison.OrdinalIgnoreCase));
            if (matchedRole == null)
                return ApiResponse<bool>.ErrorResponse(
                    $"Role không hợp lệ. Chỉ chấp nhận: {string.Join(", ", allowedRoles)}");

            var u = await _userManager.FindByIdAsync(id.ToString());
            if (u == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy người dùng.");

            var currentRoles = await _userManager.GetRolesAsync(u);
            if (currentRoles.Any())
                await _userManager.RemoveFromRolesAsync(u, currentRoles);

            var result = await _userManager.AddToRoleAsync(u, matchedRole);
            if (!result.Succeeded)
                return ApiResponse<bool>.ErrorResponse(string.Join("; ", result.Errors.Select(e => e.Description)));

            // Tự động đồng bộ hồ sơ Employee nếu được gán Employee hoặc Manager
            if (_unitOfWork != null && (matchedRole == "Employee" || matchedRole == "Manager"))
            {
                var empRepo = _unitOfWork.Repository<Employee>();
                var existingEmp = await empRepo.FirstOrDefaultAsync(e => e.UserId == u.Id);
                if (existingEmp == null)
                {
                    await empRepo.AddAsync(new Employee
                    {
                        UserId = u.Id,
                        Code = u.CardCode ?? u.UserName,
                        Position = matchedRole == "Manager" ? "Quản lý đơn vị" : "Nhân viên",
                        Status = "Hoạt động",
                        HireDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _unitOfWork.SaveChangesAsync();
                }
            }
            else if (_unitOfWork != null && (matchedRole == "Student" || matchedRole == "Lecturer"))
            {
                var empRepo = _unitOfWork.Repository<Employee>();
                var existingEmp = await empRepo.FirstOrDefaultAsync(e => e.UserId == u.Id);
                if (existingEmp != null)
                {
                    empRepo.Remove(existingEmp);
                    await _unitOfWork.SaveChangesAsync();
                }
            }

            return ApiResponse<bool>.SuccessResponse(true, $"Đã đổi Role thành '{matchedRole}'.");
        }

        // ─────────────────────────────────────────────────────────────────
        // SET STATUS (Active / Inactive / Suspended)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> SetStatusAsync(int id, string status)
        {
            if (status == "Active") status = "Hoạt động";
            else if (status == "Inactive") status = "Không hoạt động";
            else if (status == "Suspended") status = "Đình chỉ";

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
                await _userManager.SetLockoutEndDateAsync(u, DateTimeOffset.MaxValue);
            else
                await _userManager.SetLockoutEndDateAsync(u, null);

            var result = await _userManager.UpdateAsync(u);
            if (!result.Succeeded)
                return ApiResponse<bool>.ErrorResponse(string.Join("; ", result.Errors.Select(e => e.Description)));

            return ApiResponse<bool>.SuccessResponse(true, $"Đã cập nhật trạng thái người dùng thành '{status}'.");
        }

        public async Task<ApiResponse<IEnumerable<UserDto>>> SearchAsync(string? keyword, string? role, string? status, int? departmentId)
        {
            var query = _userManager.Users
                .Include(u => u.Department)
                .Include(u => u.EmployeeProfile)
                .AsQueryable();

            if (departmentId.HasValue && departmentId.Value > 0)
                query = query.Where(u => u.DepartmentId == departmentId.Value);

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
                query = query.Where(u => u.Status == status);

            var users = query.ToList();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var term = keyword.Trim().ToLower();
                users = users.Where(u =>
                    (u.FullName != null && u.FullName.ToLower().Contains(term)) ||
                    (u.CardCode != null && u.CardCode.ToLower().Contains(term)) ||
                    (u.UserName != null && u.UserName.ToLower().Contains(term)) ||
                    (u.Email != null && u.Email.ToLower().Contains(term)) ||
                    (u.PhoneNumber != null && u.PhoneNumber.Contains(term))
                ).ToList();
            }

            var dtos = new List<UserDto>();
            foreach (var u in users)
            {
                var userRoles = await _userManager.GetRolesAsync(u);
                var userRole = userRoles.Count > 0 ? userRoles[0] : "Student";
                if (!string.IsNullOrWhiteSpace(role) && role != "ALL" && !string.Equals(userRole, role, StringComparison.OrdinalIgnoreCase))
                    continue;

                dtos.Add(await MapUserDtoAsync(u, userRole));
            }

            return ApiResponse<IEnumerable<UserDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // ADMIN RESET PASSWORD
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<string>> AdminResetPasswordAsync(int id, string? newPassword)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user == null)
                return ApiResponse<string>.ErrorResponse("Không tìm thấy người dùng.");

            var passwordToSet = string.IsNullOrWhiteSpace(newPassword) ? "Huit@123" : newPassword.Trim();

            if (passwordToSet.Length < 6)
                return ApiResponse<string>.ErrorResponse("Mật khẩu mới phải có ít nhất 6 ký tự.");

            var removeResult = await _userManager.RemovePasswordAsync(user);
            var addResult = await _userManager.AddPasswordAsync(user, passwordToSet);
            if (!addResult.Succeeded)
            {
                var errors = string.Join("; ", addResult.Errors.Select(e => e.Description));
                return ApiResponse<string>.ErrorResponse($"Không thể đặt lại mật khẩu: {errors}");
            }

            return ApiResponse<string>.SuccessResponse(passwordToSet, $"Đã đặt lại mật khẩu cho tài khoản {user.FullName} ({user.CardCode}) thành công!");
        }

        // ─────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────
        private static readonly Regex PhonePattern = new(@"^0\d{9,10}$", RegexOptions.Compiled);
        private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
        private const string DefaultInitialPassword = "Huit@123";

        /// <summary>
        /// Chuẩn hoá số điện thoại Việt Nam về dạng 0xxxxxxxxx.
        /// Trả về true khi bỏ trống (xoá số) hoặc số hợp lệ.
        /// </summary>
        private static bool TryNormalizePhone(string? raw, out string? normalized)
        {
            normalized = null;
            if (string.IsNullOrWhiteSpace(raw)) return true;

            var digits = raw.Trim()
                .Replace(" ", string.Empty)
                .Replace(".", string.Empty)
                .Replace("-", string.Empty)
                .Replace("(", string.Empty)
                .Replace(")", string.Empty);

            if (digits.StartsWith("+84")) digits = "0" + digits.Substring(3);
            if (!PhonePattern.IsMatch(digits)) return false;

            normalized = digits;
            return true;
        }

        private async Task<UserDto> MapUserDtoAsync(User u, string? knownRole = null)
        {
            var roles = await _userManager.GetRolesAsync(u);
            var role = knownRole ?? (roles.Count > 0 ? roles[0] : null);

            var deptName = u.Department?.Name;
            if (string.IsNullOrWhiteSpace(deptName) && u.DepartmentId.HasValue && _unitOfWork != null)
            {
                var dept = await _unitOfWork.Repository<HUIT_RoMan.Domain.Entities.Department>().GetByIdAsync(u.DepartmentId.Value);
                deptName = dept?.Name;
            }

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
                DepartmentName = deptName ?? string.Empty,
                Role = role,
                CreatedAt = u.CreatedAt,
                IsEmployee = u.EmployeeProfile != null
            };
        }
    }
}
