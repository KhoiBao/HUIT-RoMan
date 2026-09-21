using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Application.Common.Interfaces;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public class EquipmentCategoryService : IEquipmentCategoryService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<EquipmentCategory> _categoryRepo;

        public EquipmentCategoryService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _categoryRepo = _unitOfWork.Repository<EquipmentCategory>();
        }

        public async Task<IEnumerable<EquipmentCategoryDto>> GetAllAsync()
        {
            var categories = await _categoryRepo.GetAllAsync();
            return categories.Select(ec => new EquipmentCategoryDto
            {
                Id = ec.Id,
                Name = ec.Name,
                Description = ec.Description
            }).ToList();
        }

        public async Task<EquipmentCategoryDto> GetByIdAsync(int id)
        {
            var ec = await _categoryRepo.GetByIdAsync(id);
            if (ec == null) return null;

            return new EquipmentCategoryDto
            {
                Id = ec.Id,
                Name = ec.Name,
                Description = ec.Description
            };
        }

        public async Task<EquipmentCategoryDto> CreateAsync(CreateEquipmentCategoryDto request)
        {
            var ec = new EquipmentCategory
            {
                Name = request.Name,
                Description = request.Description
            };

            await _categoryRepo.AddAsync(ec);
            await _unitOfWork.SaveChangesAsync();

            return new EquipmentCategoryDto
            {
                Id = ec.Id,
                Name = ec.Name,
                Description = ec.Description
            };
        }

        public async Task<bool> UpdateAsync(int id, CreateEquipmentCategoryDto request)
        {
            var ec = await _categoryRepo.GetByIdAsync(id);
            if (ec == null) return false;

            ec.Name = request.Name;
            ec.Description = request.Description;

            _categoryRepo.Update(ec);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var ec = await _categoryRepo.GetByIdAsync(id);
            if (ec == null) return false;

            _categoryRepo.Remove(ec);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}
