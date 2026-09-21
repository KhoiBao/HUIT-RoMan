using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Employee> _employeeRepo;
        private readonly UserManager<User> _userManager;

        public EmployeeService(IUnitOfWork unitOfWork, UserManager<User> userManager)
        {
            _unitOfWork = unitOfWork;
            _employeeRepo = _unitOfWork.Repository<Employee>();
            _userManager = userManager;
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ALL
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<EmployeeDto>>> GetAllAsync()
        {
            var employees = await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department);
            var dtos = employees.Select(MapDto).ToList();
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
            return ApiResponse<EmployeeDto>.SuccessResponse(MapDto(e));
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

            // Gán role Employee nếu chưa có
            if (!await _userManager.IsInRoleAsync(user, "Employee"))
            {
                var currentRoles = await _userManager.GetRolesAsync(user);
                if (currentRoles.Any())
                    await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, "Employee");
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

            if (!string.IsNullOrWhiteSpace(request.Position))
                e.Position = request.Position;

            if (!string.IsNullOrWhiteSpace(request.Status))
                e.Status = request.Status;

            if (e.User != null && request.DepartmentId.HasValue)
            {
                e.User.DepartmentId = request.DepartmentId;
                await _userManager.UpdateAsync(e.User);
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

            // Thu hồi role Employee, chuyển về Lecturer hoặc Student tuỳ trường hợp
            if (e.User != null)
            {
                var roles = await _userManager.GetRolesAsync(e.User);
                if (roles.Contains("Employee"))
                {
                    await _userManager.RemoveFromRoleAsync(e.User, "Employee");
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
        private static EmployeeDto MapDto(Employee e) => new EmployeeDto
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
    }
}
