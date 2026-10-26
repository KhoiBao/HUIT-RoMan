using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;

using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public interface IEquipmentService
    {
        Task<IEnumerable<EquipmentDto>> GetAllAsync();
        Task<EquipmentDto> GetByIdAsync(int id);
        Task<EquipmentDto> CreateAsync(CreateEquipmentDto request);
        Task<ApiResponse<bool>> UpdateAsync(int id, CreateEquipmentDto request);
        Task<ApiResponse<bool>> UpdateStatusAsync(int id, string status);
        Task<bool> DeleteAsync(int id);
    }
}
