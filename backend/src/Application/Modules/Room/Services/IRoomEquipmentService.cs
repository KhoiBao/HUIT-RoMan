using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;

using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public interface IRoomEquipmentService
    {
        Task<IEnumerable<RoomEquipmentDto>> GetByRoomIdAsync(int roomId);
        Task<ApiResponse<bool>> AddOrUpdateEquipmentToRoomAsync(int roomId, AddRoomEquipmentDto request);
        Task<ApiResponse<bool>> RemoveEquipmentFromRoomAsync(int roomId, int equipmentId);
    }
}
