using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public interface IEmployeeService
    {
        Task<IEnumerable<EmployeeDto>> GetAllAsync();
        Task<EmployeeDto> GetByIdAsync(int id);
        Task<EmployeeDto> CreateAsync(CreateEmployeeDto request);
        Task<bool> UpdateAsync(int id, UpdateEmployeeDto request);
        Task<bool> DeleteAsync(int id);
    }
}
