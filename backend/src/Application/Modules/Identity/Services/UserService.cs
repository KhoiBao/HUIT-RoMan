using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public class UserService : IUserService
    {
        private readonly UserManager<User> _userManager;

        public UserService(UserManager<User> userManager)
        {
            _userManager = userManager;
        }

        public async Task<IEnumerable<UserDto>> GetStudentsAsync()
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync("Student");
            return usersInRole.Select(u => new UserDto
            {
                Id = u.Id,
                CardCode = u.CardCode,
                FullName = u.FullName,
                Status = u.Status,
                DepartmentId = u.DepartmentId,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber
            });
        }

        public async Task<IEnumerable<UserDto>> GetLecturersAsync()
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync("Lecturer");
            return usersInRole.Select(u => new UserDto
            {
                Id = u.Id,
                CardCode = u.CardCode,
                FullName = u.FullName,
                Status = u.Status,
                DepartmentId = u.DepartmentId,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber
            });
        }
    }
}
