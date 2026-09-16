using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Application.Common.Interfaces;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public class EquipmentService : IEquipmentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Equipment> _equipmentRepo;

        public EquipmentService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _equipmentRepo = _unitOfWork.Repository<Equipment>();
        }

        public async Task<IEnumerable<EquipmentDto>> GetAllAsync()
        {
            var equipments = await _equipmentRepo.GetAllAsync();
            return equipments.Select(e => new EquipmentDto
            {
                Id = e.Id,
                Name = e.Name,
                Description = e.Description,
                Status = e.Status,
                EquipmentCategoryId = e.EquipmentCategoryId
            }).ToList();
        }

        public async Task<EquipmentDto> GetByIdAsync(int id)
        {
            var e = await _equipmentRepo.GetByIdAsync(id);
            if (e == null) return null;

            return new EquipmentDto
            {
                Id = e.Id,
                Name = e.Name,
                Description = e.Description,
                Status = e.Status,
                EquipmentCategoryId = e.EquipmentCategoryId
            };
        }

        public async Task<EquipmentDto> CreateAsync(CreateEquipmentDto request)
        {
            var equipment = new Equipment
            {
                Name = request.Name,
                Description = request.Description,
                Status = "Active",
                EquipmentCategoryId = request.EquipmentCategoryId
            };

            await _equipmentRepo.AddAsync(equipment);
            await _unitOfWork.SaveChangesAsync();

            return new EquipmentDto
            {
                Id = equipment.Id,
                Name = equipment.Name,
                Description = equipment.Description,
                Status = equipment.Status,
                EquipmentCategoryId = equipment.EquipmentCategoryId
            };
        }

        public async Task<bool> UpdateAsync(int id, CreateEquipmentDto request)
        {
            var e = await _equipmentRepo.GetByIdAsync(id);
            if (e == null) return false;

            e.Name = request.Name;
            e.Description = request.Description;
            e.EquipmentCategoryId = request.EquipmentCategoryId;

            _equipmentRepo.Update(e);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var e = await _equipmentRepo.GetByIdAsync(id);
            if (e == null) return false;

            _equipmentRepo.Remove(e);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}
