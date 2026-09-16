using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Application.Common.Interfaces;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public class RoomEquipmentService : IRoomEquipmentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<RoomEquipment> _roomEquipmentRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<Equipment> _equipmentRepo;

        public RoomEquipmentService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _roomEquipmentRepo = _unitOfWork.Repository<RoomEquipment>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _equipmentRepo = _unitOfWork.Repository<Equipment>();
        }

        public async Task<IEnumerable<RoomEquipmentDto>> GetByRoomIdAsync(int roomId)
        {
            var rEquipments = await _roomEquipmentRepo.FindAsync(re => re.RoomId == roomId, re => re.Equipment, re => re.Room);
            
            return rEquipments.Select(re => new RoomEquipmentDto
            {
                RoomId = re.RoomId,
                RoomName = re.Room?.Name,
                EquipmentId = re.EquipmentId,
                EquipmentName = re.Equipment?.Name,
                Quantity = re.Quantity,
                Status = re.Status
            }).ToList();
        }

        public async Task<bool> AddOrUpdateEquipmentToRoomAsync(int roomId, AddRoomEquipmentDto request)
        {
            // Kiểm tra xem phòng có tồn tại hay không
            var room = await _roomRepo.GetByIdAsync(roomId);
            if (room == null) return false;

            // Kiểm tra xem thiết bị có tồn tại hay không
            var equipment = await _equipmentRepo.GetByIdAsync(request.EquipmentId);
            if (equipment == null) return false;

            var existing = await _roomEquipmentRepo.FirstOrDefaultAsync(re => re.RoomId == roomId && re.EquipmentId == request.EquipmentId);

            if (existing != null)
            {
                // Cập nhật số lượng và trạng thái nếu thiết bị đã có trong phòng
                existing.Quantity = request.Quantity;
                if (!string.IsNullOrEmpty(request.Status))
                {
                    existing.Status = request.Status;
                }
                _roomEquipmentRepo.Update(existing);
            }
            else
            {
                var newRe = new RoomEquipment
                {
                    RoomId = roomId,
                    EquipmentId = request.EquipmentId,
                    Quantity = request.Quantity,
                    Status = request.Status ?? "Good"
                };
                await _roomEquipmentRepo.AddAsync(newRe);
            }

            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveEquipmentFromRoomAsync(int roomId, int equipmentId)
        {
            var existing = await _roomEquipmentRepo.FirstOrDefaultAsync(re => re.RoomId == roomId && re.EquipmentId == equipmentId);
            if (existing == null) return false;

            _roomEquipmentRepo.Remove(existing);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}
