using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Identity.DTOs;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public interface IUserService
    {
        /// <summary>Lấy tất cả user (Admin)</summary>
        Task<ApiResponse<IEnumerable<UserDto>>> GetAllAsync();

        /// <summary>Lấy user theo ID</summary>
        Task<ApiResponse<UserDto>> GetByIdAsync(int id);

        /// <summary>Lấy danh sách sinh viên</summary>
        Task<ApiResponse<IEnumerable<UserDto>>> GetStudentsAsync();

        /// <summary>Lấy danh sách giảng viên</summary>
        Task<ApiResponse<IEnumerable<UserDto>>> GetLecturersAsync();

        /// <summary>Cập nhật thông tin user</summary>
        Task<ApiResponse<bool>> UpdateAsync(int id, UpdateUserDto request);

        /// <summary>Đổi Role của user (Admin only)</summary>
        Task<ApiResponse<bool>> ChangeRoleAsync(int id, ChangeUserRoleDto request);

        /// <summary>Kích hoạt / vô hiệu hoá user (đổi Status)</summary>
        Task<ApiResponse<bool>> SetStatusAsync(int id, string status);
    }
}
