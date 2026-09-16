using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public interface IRoomEquipmentService
    {
        Task<IEnumerable<RoomEquipmentDto>> GetByRoomIdAsync(int roomId);
        Task<bool> AddOrUpdateEquipmentToRoomAsync(int roomId, AddRoomEquipmentDto request);
        Task<bool> RemoveEquipmentFromRoomAsync(int roomId, int equipmentId);
    }
}
