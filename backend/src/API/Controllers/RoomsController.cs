using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Application.Modules.Room.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoomsController : ControllerBase
    {
        private readonly IRoomService _roomService;
        private readonly IRoomEquipmentService _roomEquipmentService;

        public RoomsController(IRoomService roomService, IRoomEquipmentService roomEquipmentService)
        {
            _roomService = roomService;
            _roomEquipmentService = roomEquipmentService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var response = await _roomService.GetAllAsync();
            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _roomService.GetByIdAsync(id);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> Create([FromBody] CreateRoomDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _roomService.CreateAsync(request);
            if (!response.Success) return BadRequest(response);
            
            return CreatedAtAction(nameof(GetById), new { id = response.Data?.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateRoomDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _roomService.UpdateAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> Delete(int id)
        {
            var response = await _roomService.DeleteAsync(id);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        // Room Equipment Endpoints

        [HttpGet("{roomId}/equipments")]
        public async Task<IActionResult> GetEquipments(int roomId)
        {
            var result = await _roomEquipmentService.GetByRoomIdAsync(roomId);
            return Ok(result);
        }

        [HttpPost("{roomId}/equipments")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> AddOrUpdateEquipment(int roomId, [FromBody] AddRoomEquipmentDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var success = await _roomEquipmentService.AddOrUpdateEquipmentToRoomAsync(roomId, request);
            if (!success) return BadRequest("Thêm thiết bị thất bại. Vui lòng kiểm tra lại Mã phòng và Mã thiết bị.");
            return Ok();
        }

        [HttpDelete("{roomId}/equipments/{equipmentId}")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> RemoveEquipment(int roomId, int equipmentId)
        {
            var success = await _roomEquipmentService.RemoveEquipmentFromRoomAsync(roomId, equipmentId);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
