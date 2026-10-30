using System;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Application.Modules.Room.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquipmentsController : ControllerBase
    {
        private readonly IEquipmentService _equipmentService;

        public EquipmentsController(IEquipmentService equipmentService)
        {
            _equipmentService = equipmentService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _equipmentService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _equipmentService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> Create([FromBody] CreateEquipmentDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _equipmentService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateEquipmentDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _equipmentService.UpdateAsync(id, request);
            if (!response.Success)
            {
                if (response.Message == "Không tìm thấy thiết bị.") return NotFound(response);
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateEquipmentStatusDto request)
        {
            if (string.IsNullOrWhiteSpace(request?.Status))
            {
                return BadRequest("Trạng thái không được để trống.");
            }
            var response = await _equipmentService.UpdateStatusAsync(id, request.Status);
            if (!response.Success)
            {
                if (response.Message == "Không tìm thấy thiết bị.") return NotFound(response);
                return BadRequest(response);
            }
            return Ok(response);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Manager,Employee")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _equipmentService.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
