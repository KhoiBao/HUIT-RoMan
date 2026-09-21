using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public interface IEquipmentCategoryService
    {
        Task<IEnumerable<EquipmentCategoryDto>> GetAllAsync();
        Task<EquipmentCategoryDto> GetByIdAsync(int id);
        Task<EquipmentCategoryDto> CreateAsync(CreateEquipmentCategoryDto request);
        Task<bool> UpdateAsync(int id, CreateEquipmentCategoryDto request);
        Task<bool> DeleteAsync(int id);
    }
}
