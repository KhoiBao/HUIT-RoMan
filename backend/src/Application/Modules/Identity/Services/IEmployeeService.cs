using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Identity.DTOs;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public interface IEmployeeService
    {
        Task<ApiResponse<IEnumerable<EmployeeDto>>> GetAllAsync();
        Task<ApiResponse<EmployeeDto>> GetByIdAsync(int id);
        Task<ApiResponse<EmployeeDto>> CreateAsync(CreateEmployeeDto request);
        Task<ApiResponse<bool>> UpdateAsync(int id, UpdateEmployeeDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);
    }
}
