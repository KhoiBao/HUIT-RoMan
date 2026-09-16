using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public interface IRoomService
    {
        Task<ApiResponse<IEnumerable<RoomDto>>> GetAllAsync();
        Task<ApiResponse<RoomDto>> GetByIdAsync(int id);
        Task<ApiResponse<RoomDto>> CreateAsync(CreateRoomDto request);
        Task<ApiResponse<bool>> UpdateAsync(int id, UpdateRoomDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);
    }
}
