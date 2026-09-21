using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Application.Modules.Room.Services;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Booking.Services;
using System.Linq;
using HUIT_RoMan.Application.Common.Interfaces;
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
        private readonly IBookingService _bookingService;
        private readonly IStoredProcedureService _storedProcedureService;

        public RoomsController(
            IRoomService roomService, 
            IRoomEquipmentService roomEquipmentService, 
            IBookingService bookingService,
            IStoredProcedureService storedProcedureService)
        {
            _roomService = roomService;
            _roomEquipmentService = roomEquipmentService;
            _bookingService = bookingService;
            _storedProcedureService = storedProcedureService;
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

        // ─────────────────────────────────────────────────────────────────
        // Room Status Management
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Cập nhật trạng thái phòng: Available (Phòng trống) | InUse (Đang sử dụng) | Maintenance (Đang bảo trì)
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateRoomStatusDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _bookingService.UpdateRoomStatusAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // Room Schedule & Availability
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Tìm phòng trống theo ngày giờ. 
        /// Hỗ trợ tìm theo tiết (startPeriodId, endPeriodId) hoặc theo giờ (startTime, endTime).
        /// </summary>
        [HttpGet("available")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailableRooms(
            [FromQuery] System.DateTime date,
            [FromQuery] int? startPeriodId,
            [FromQuery] int? endPeriodId,
            [FromQuery] string? startTime,
            [FromQuery] string? endTime)
        {
            if (date == default) date = System.DateTime.Today;
            // The input date is assumed to be UTC+7 local time. Convert it to UTC for querying.
            var localDate = date.Date;
            System.DateTime windowStart = System.DateTime.SpecifyKind(localDate.AddHours(-7), System.DateTimeKind.Utc);
            System.DateTime windowEnd = System.DateTime.SpecifyKind(localDate.AddDays(1).AddHours(-7), System.DateTimeKind.Utc);

            if (startPeriodId.HasValue && endPeriodId.HasValue)
            {
                var periodsResponse = await _bookingService.GetPeriodsAsync();
                var startPeriod = periodsResponse.Data?.FirstOrDefault(p => p.Id == startPeriodId.Value);
                var endPeriod = periodsResponse.Data?.FirstOrDefault(p => p.Id == endPeriodId.Value);

                if (startPeriod == null || endPeriod == null)
                    return BadRequest("Tiết học không hợp lệ.");
                if (startPeriod.StartTime > endPeriod.EndTime)
                    return BadRequest("Tiết bắt đầu phải trước tiết kết thúc.");
                
                windowStart = System.DateTime.SpecifyKind(localDate.Add(startPeriod.StartTime).AddHours(-7), System.DateTimeKind.Utc);
                windowEnd = System.DateTime.SpecifyKind(localDate.Add(endPeriod.EndTime).AddHours(-7), System.DateTimeKind.Utc);
            }
            else if (!string.IsNullOrEmpty(startTime) && !string.IsNullOrEmpty(endTime))
            {
                if (System.TimeSpan.TryParse(startTime, out var st) && System.TimeSpan.TryParse(endTime, out var et))
                {
                    if (st >= et) return BadRequest("Giờ bắt đầu phải trước giờ kết thúc.");
                    windowStart = System.DateTime.SpecifyKind(localDate.Add(st).AddHours(-7), System.DateTimeKind.Utc);
                    windowEnd = System.DateTime.SpecifyKind(localDate.Add(et).AddHours(-7), System.DateTimeKind.Utc);
                }
            }

            var availableRooms = await _storedProcedureService.GetAvailableRoomsAsync(windowStart, windowEnd, null, 0);
            return Ok(new { Success = true, Data = availableRooms, Message = "Danh sách phòng trống" });
        }

        /// <summary>
        /// Xem lịch phòng theo ngày. Ví dụ:
        ///   GET /api/rooms/5/schedule?date=2026-09-21                              (toàn ngày)
        ///   GET /api/rooms/5/schedule?date=2026-09-21&amp;startPeriodId=1&amp;endPeriodId=3  (theo tiết)
        ///   GET /api/rooms/5/schedule?date=2026-09-21&amp;startTime=07:00:00&amp;endTime=09:45:00 (theo giờ)
        /// </summary>
        [HttpGet("{id}/schedule")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSchedule(
            int id,
            [FromQuery] System.DateTime date,
            [FromQuery] int? startPeriodId,
            [FromQuery] int? endPeriodId,
            [FromQuery] string startTime,
            [FromQuery] string endTime)
        {
            if (date == default) date = System.DateTime.Today;

            var scheduleQuery = new HUIT_RoMan.Application.Modules.Booking.DTOs.RoomScheduleQueryDto
            {
                Date = date,
                StartPeriodId = startPeriodId,
                EndPeriodId   = endPeriodId,
                StartTime = !string.IsNullOrEmpty(startTime) && System.TimeSpan.TryParse(startTime, out var st) ? st : (System.TimeSpan?)null,
                EndTime   = !string.IsNullOrEmpty(endTime)   && System.TimeSpan.TryParse(endTime,   out var et) ? et : (System.TimeSpan?)null
            };

            var response = await _bookingService.GetRoomScheduleAsync(id, scheduleQuery);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }
    }
}
