using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.WorkingHours.DTOs;
using HUIT_RoMan.Application.Modules.WorkingHours.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkingHoursController : ControllerBase
    {
        private readonly IWorkingHourService _workingHourService;

        public WorkingHoursController(IWorkingHourService workingHourService)
        {
            _workingHourService = workingHourService;
        }

        /// <summary>Giờ phục vụ của Thư viện (công khai để hiển thị/kiểm tra phía client).</summary>
        [HttpGet("library")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLibrary()
        {
            var response = await _workingHourService.GetLibraryAsync();
            return Ok(response);
        }

        /// <summary>Cập nhật giờ phục vụ của Thư viện (quản trị viên).</summary>
        [HttpPut("library")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateLibrary([FromBody] UpdateWorkingHoursDto request)
        {
            var response = await _workingHourService.UpdateLibraryAsync(request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }
    }
}
