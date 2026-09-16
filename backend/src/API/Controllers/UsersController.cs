using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.Services;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("students")]
        public async Task<IActionResult> GetStudents()
        {
            var students = await _userService.GetStudentsAsync();
            return Ok(students);
        }

        [HttpGet("lecturers")]
        public async Task<IActionResult> GetLecturers()
        {
            var lecturers = await _userService.GetLecturersAsync();
            return Ok(lecturers);
        }
    }
}
