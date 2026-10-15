using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public interface IAuthService
    {
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    }
}

