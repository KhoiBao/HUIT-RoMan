using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public interface IEquipmentService
    {
        Task<IEnumerable<EquipmentDto>> GetAllAsync();
        Task<EquipmentDto> GetByIdAsync(int id);
        Task<EquipmentDto> CreateAsync(CreateEquipmentDto request);
        Task<bool> UpdateAsync(int id, CreateEquipmentDto request);
        Task<bool> DeleteAsync(int id);
    }
}
