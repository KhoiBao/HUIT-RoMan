using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Department.DTOs;

namespace HUIT_RoMan.Application.Modules.Department.Services
{
    public interface IDepartmentService
    {
        Task<ApiResponse<IEnumerable<DepartmentDto>>> GetAllAsync();
        Task<ApiResponse<DepartmentDto>> GetByIdAsync(int id);
        Task<ApiResponse<DepartmentDto>> CreateAsync(CreateDepartmentDto request);
        Task<ApiResponse<DepartmentDto>> UpdateAsync(int id, UpdateDepartmentDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);
    }
}
