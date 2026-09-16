using System;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Application.Common.Interfaces;
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

        public async Task<IEnumerable<EmployeeDto>> GetAllAsync()
        {
            var employees = await _employeeRepo.GetAllAsync(e => e.User);
            return employees.Select(e => new EmployeeDto
            {
                Id = e.Id,
                Code = e.Code,
                Position = e.Position,
                HireDate = e.HireDate,
                Status = e.Status,
                UserId = e.UserId,
                FullName = e.User?.FullName,
                DepartmentId = e.User?.DepartmentId
            }).ToList();
        }

        public async Task<EmployeeDto> GetByIdAsync(int id)
        {
            var e = await _employeeRepo.GetByIdAsync(id, e => e.User);
            if (e == null) return null;

            return new EmployeeDto
            {
                Id = e.Id,
                Code = e.Code,
                Position = e.Position,
                HireDate = e.HireDate,
                Status = e.Status,
                UserId = e.UserId,
                FullName = e.User?.FullName,
                DepartmentId = e.User?.DepartmentId
            };
        }

        public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId.ToString());
            if (user == null)
            {
                // Không tìm thấy user
                return null;
            }

            // Kiểm tra xem user này đã là employee chưa
            var existingEmployee = await _employeeRepo.FirstOrDefaultAsync(e => e.UserId == user.Id);
            if (existingEmployee != null)
            {
                // Đã là employee
                return null;
            }

            // Đảm bảo user có role Employee
            if (!await _userManager.IsInRoleAsync(user, "Employee"))
            {
                await _userManager.AddToRoleAsync(user, "Employee");
            }

            var employee = new Employee
            {
                Code = user.CardCode, // Lấy Code từ CardCode của User
                Position = request.Position,
                Status = "Active",
                UserId = user.Id,
                HireDate = DateTime.UtcNow
            };

            await _employeeRepo.AddAsync(employee);
            await _unitOfWork.SaveChangesAsync();

            return await GetByIdAsync(employee.Id);
        }

        public async Task<bool> UpdateAsync(int id, UpdateEmployeeDto request)
        {
            var e = await _employeeRepo.GetByIdAsync(id, e => e.User);
            if (e == null) return false;

            e.Position = request.Position;
            e.Status = request.Status;
            
            if (e.User != null && request.DepartmentId.HasValue)
            {
                e.User.DepartmentId = request.DepartmentId;
                await _userManager.UpdateAsync(e.User);
            }

            _employeeRepo.Update(e);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var e = await _employeeRepo.GetByIdAsync(id);
            if (e == null) return false;

            _employeeRepo.Remove(e);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}
