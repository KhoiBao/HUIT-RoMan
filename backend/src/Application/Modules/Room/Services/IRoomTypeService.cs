using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public interface IRoomTypeService
    {
        Task<ApiResponse<IEnumerable<RoomTypeDto>>> GetAllAsync();
        Task<ApiResponse<RoomTypeDto>> GetByIdAsync(int id);
        Task<ApiResponse<RoomTypeDto>> CreateAsync(CreateRoomTypeDto request);
        Task<ApiResponse<bool>> UpdateAsync(int id, CreateRoomTypeDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);
    }
}
