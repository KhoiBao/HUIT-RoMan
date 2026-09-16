using System.Security.Claims;
using HUIT_RoMan.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace HUIT_RoMan.API.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public int? UserId
        {
            get
            {
                var userIdString = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(userIdString, out int userId))
                {
                    return userId;
                }
                return null;
            }
        }

        public string? Role => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);

        public int? DepartmentId
        {
            get
            {
                var departmentIdString = _httpContextAccessor.HttpContext?.User?.FindFirstValue("DepartmentId");
                if (int.TryParse(departmentIdString, out int departmentId))
                {
                    return departmentId;
                }
                return null;
            }
        }

        public bool IsAdmin => Role == "Admin";
    }
}
