using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetStudentsAsync();
        Task<IEnumerable<UserDto>> GetLecturersAsync();
    }
}
