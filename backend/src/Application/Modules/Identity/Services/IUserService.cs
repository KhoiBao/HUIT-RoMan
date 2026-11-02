using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Identity.DTOs;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public interface IUserService
    {
        Task<ApiResponse<IEnumerable<UserDto>>> GetAllAsync();
        Task<ApiResponse<UserDto>> GetByIdAsync(int id);
        Task<ApiResponse<IEnumerable<UserDto>>> GetStudentsAsync();
        Task<ApiResponse<IEnumerable<UserDto>>> GetLecturersAsync();
        Task<ApiResponse<CreatedUserDto>> CreateAsync(CreateUserDto request);
        Task<ApiResponse<bool>> UpdateAsync(int id, UpdateUserDto request);
        Task<ApiResponse<bool>> ChangeRoleAsync(int id, ChangeUserRoleDto request);
        Task<ApiResponse<bool>> SetStatusAsync(int id, string status);
        Task<ApiResponse<IEnumerable<UserDto>>> SearchAsync(string? keyword, string? role, string? status, int? departmentId);
        Task<ApiResponse<string>> AdminResetPasswordAsync(int id, string? newPassword);
    }
}
