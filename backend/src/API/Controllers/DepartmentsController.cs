using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Department.DTOs;
using HUIT_RoMan.Application.Modules.Department.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DepartmentsController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;

        public DepartmentsController(IDepartmentService departmentService)
        {
            _departmentService = departmentService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var response = await _departmentService.GetAllAsync();
            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _departmentService.GetByIdAsync(id);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateDepartmentDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            var response = await _departmentService.CreateAsync(request);
            if (!response.Success) return BadRequest(response);
            
            return CreatedAtAction(nameof(GetById), new { id = response.Data?.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDepartmentDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            var response = await _departmentService.UpdateAsync(id, request);
            if (!response.Success) return BadRequest(response);
            
            return Ok(response);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var response = await _departmentService.DeleteAsync(id);
            if (!response.Success) return BadRequest(response);
            
            return Ok(response);
        }
    }
}
