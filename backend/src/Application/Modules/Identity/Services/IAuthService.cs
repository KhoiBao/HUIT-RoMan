using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public interface IAuthService
    {
        Task<AuthResponse> LoginAsync(LoginRequest request);
    }
}
