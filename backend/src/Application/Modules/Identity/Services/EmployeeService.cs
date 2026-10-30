using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Domain;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Employee> _employeeRepo;
        private readonly UserManager<User> _userManager;
        private readonly ICurrentUserService _currentUser;

        public EmployeeService(IUnitOfWork unitOfWork, UserManager<User> userManager, ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _employeeRepo = _unitOfWork.Repository<Employee>();
            _userManager = userManager;
            _currentUser = currentUser;
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ALL
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<EmployeeDto>>> GetAllAsync()
        {
            var employees = await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department);

            // Tài khoản hệ thống tự động duyệt không phải nhân sự thật, không hiển thị/không sửa được.
            employees = employees
                .Where(e => e.Code != SystemAccounts.AutoApproveEmployeeCode)
                .ToList();
            
            // Nếu người gọi là Employee hoặc Manager, chỉ thấy danh sách nhân sự thuộc đơn vị của mình
            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                employees = employees.Where(e => e.User?.DepartmentId == _currentUser.DepartmentId.Value).ToList();
            }

            var dtos = new List<EmployeeDto>();
            foreach (var e in employees)
            {
                dtos.Add(await MapDtoAsync(e));
            }
            return ApiResponse<IEnumerable<EmployeeDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET BY ID
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<EmployeeDto>> GetByIdAsync(int id)
        {
            var e = await _employeeRepo.GetByIdAsync(id, e => e.User, e => e.User.Department);
            if (e == null)
                return ApiResponse<EmployeeDto>.ErrorResponse("Không tìm thấy nhân viên.");

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                if (e.User?.DepartmentId != _currentUser.DepartmentId.Value)
                    return ApiResponse<EmployeeDto>.ErrorResponse("Bạn không có quyền xem thông tin nhân sự thuộc đơn vị khác.");
            }

            return ApiResponse<EmployeeDto>.SuccessResponse(await MapDtoAsync(e));
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<EmployeeDto>> CreateAsync(CreateEmployeeDto request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId.ToString());
            if (user == null)
                return ApiResponse<EmployeeDto>.ErrorResponse("Không tìm thấy người dùng với ID đã cung cấp.");

            // Kiểm tra đã là employee chưa
            var existing = await _employeeRepo.FirstOrDefaultAsync(e => e.UserId == user.Id);
            if (existing != null)
                return ApiResponse<EmployeeDto>.ErrorResponse("Người dùng này đã có hồ sơ nhân viên.");

            // Gán role được chọn hoặc mặc định Employee
            var targetRole = !string.IsNullOrWhiteSpace(request.Role) ? request.Role : "Employee";
            if (_currentUser.Role == "Manager" && targetRole == "Admin")
            {
                return ApiResponse<EmployeeDto>.ErrorResponse("Bạn không có quyền chỉ định vai trò Quản trị viên.");
            }

            var currentRoles = await _userManager.GetRolesAsync(user);
            if (!currentRoles.Contains(targetRole))
            {
                if (currentRoles.Any())
                    await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, targetRole);
            }

            if (_currentUser.Role == "Manager" && _currentUser.DepartmentId.HasValue)
            {
                if (request.DepartmentId.HasValue && request.DepartmentId.Value != _currentUser.DepartmentId.Value)
                {
                    return ApiResponse<EmployeeDto>.ErrorResponse("Bạn chỉ có quyền quản lý nhân sự thuộc đơn vị của mình.");
                }
                request.DepartmentId = _currentUser.DepartmentId.Value;
            }

            // Gán đơn vị cho user nếu được chỉ định
            if (request.DepartmentId.HasValue)
            {
                user.DepartmentId = request.DepartmentId.Value;
                await _userManager.UpdateAsync(user);
            }

            var employee = new Employee
            {
                Code = user.CardCode,
                Position = request.Position ?? "Nhân viên",
                Status = "Hoạt động",
                UserId = user.Id,
                HireDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _employeeRepo.AddAsync(employee);
            await _unitOfWork.SaveChangesAsync();

            var result = await GetByIdAsync(employee.Id);
            return ApiResponse<EmployeeDto>.SuccessResponse(result.Data, "Tạo hồ sơ nhân viên thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // UPDATE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> UpdateAsync(int id, UpdateEmployeeDto request)
        {
            var e = await _employeeRepo.GetByIdAsync(id, e => e.User);
            if (e == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy nhân viên.");

            if (e.Code == SystemAccounts.AutoApproveEmployeeCode)
                return ApiResponse<bool>.ErrorResponse("Không thể sửa hồ sơ của tài khoản hệ thống.");

            if (_currentUser.Role == "Manager" && _currentUser.DepartmentId.HasValue)
            {
                if (e.User?.DepartmentId != _currentUser.DepartmentId.Value)
                    return ApiResponse<bool>.ErrorResponse("Bạn không có quyền cập nhật nhân sự thuộc đơn vị khác.");
            }

            if (!string.IsNullOrWhiteSpace(request.Position))
                e.Position = request.Position;

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var st = request.Status;
                if (st == "Active") st = "Hoạt động";
                else if (st == "Inactive") st = "Không hoạt động";
                e.Status = st;
            }

            if (e.User != null)
            {
                if (request.DepartmentId.HasValue)
                {
                    if (_currentUser.Role == "Manager" && _currentUser.DepartmentId.HasValue && request.DepartmentId.Value != _currentUser.DepartmentId.Value)
                    {
                        return ApiResponse<bool>.ErrorResponse("Bạn không thể chuyển nhân sự sang đơn vị khác.");
                    }
                    e.User.DepartmentId = request.DepartmentId;
                    await _userManager.UpdateAsync(e.User);
                }

                if (!string.IsNullOrWhiteSpace(request.Role))
                {
                    if (_currentUser.Role == "Manager" && request.Role == "Admin")
                    {
                        return ApiResponse<bool>.ErrorResponse("Bạn không có quyền chỉ định vai trò Quản trị viên.");
                    }

                    var userRoles = await _userManager.GetRolesAsync(e.User);
                    if (!userRoles.Contains(request.Role))
                    {
                        if (userRoles.Any())
                            await _userManager.RemoveFromRolesAsync(e.User, userRoles);
                        await _userManager.AddToRoleAsync(e.User, request.Role);
                    }
                }
            }

            _employeeRepo.Update(e);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Cập nhật nhân viên thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // DELETE (xoá hồ sơ nhân viên, giữ lại User)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            var e = await _employeeRepo.GetByIdAsync(id, e => e.User);
            if (e == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy nhân viên.");

            if (e.Code == SystemAccounts.AutoApproveEmployeeCode)
                return ApiResponse<bool>.ErrorResponse("Không thể xoá hồ sơ của tài khoản hệ thống.");

            // Thu hồi role Employee hoặc Manager, chuyển về Lecturer hoặc Student tuỳ trường hợp
            if (e.User != null)
            {
                var roles = await _userManager.GetRolesAsync(e.User);
                var staffRoles = roles.Where(r => r == "Employee" || r == "Manager").ToList();
                if (staffRoles.Any())
                {
                    await _userManager.RemoveFromRolesAsync(e.User, staffRoles);
                    // Mặc định trả về role Lecturer sau khi xoá nhân viên
                    await _userManager.AddToRoleAsync(e.User, "Lecturer");
                }
            }

            _employeeRepo.Remove(e);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Xoá hồ sơ nhân viên thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────────
        private async Task<EmployeeDto> MapDtoAsync(Employee e)
        {
            var dto = new EmployeeDto
            {
                Id = e.Id,
                Code = e.Code,
                Position = e.Position,
                HireDate = e.HireDate,
                Status = e.Status,
                UserId = e.UserId,
                UserName = e.User?.UserName,
                CardCode = e.User?.CardCode,
                FullName = e.User?.FullName,
                Email = e.User?.Email,
                DepartmentId = e.User?.DepartmentId,
                DepartmentName = e.User?.Department?.Name
            };

            if (e.User != null)
            {
                var roles = await _userManager.GetRolesAsync(e.User);
                dto.Role = roles.FirstOrDefault() ?? "Employee";
            }
            else
            {
                dto.Role = "Employee";
            }

            return dto;
        }
    }
}
