using System;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Modules.Booking.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public BookingsController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        // ─────────────────────────────────────────────────────────────────
        // BOOKING CRUD
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Tạo đơn đặt phòng mới</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookingDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _bookingService.CreateBookingAsync(request);
            if (!response.Success) return BadRequest(response);
            return CreatedAtAction(nameof(GetById), new { id = response.Data?.Id }, response);
        }

        /// <summary>Lấy tất cả đơn đặt phòng (Admin/Employee)</summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> GetAll()
        {
            var response = await _bookingService.GetAllBookingsAsync();
            return Ok(response);
        }

        /// <summary>Lấy đơn đặt phòng của user hiện tại</summary>
        [HttpGet("my")]
        public async Task<IActionResult> GetMy()
        {
            var response = await _bookingService.GetMyBookingsAsync();
            return Ok(response);
        }

        /// <summary>Lấy chi tiết đơn đặt phòng theo ID</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _bookingService.GetBookingByIdAsync(id);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        /// <summary>Hủy đơn đặt phòng</summary>
        [HttpPatch("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var response = await _bookingService.CancelBookingAsync(id);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // APPROVAL
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Duyệt hoặc từ chối toàn bộ đơn</summary>
        [HttpPatch("{id}/approve")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveBookingDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _bookingService.ApproveBookingAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>Duyệt hoặc từ chối từng chi tiết phòng trong đơn</summary>
        [HttpPatch("details/{detailId}/approve")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> ApproveDetail(int detailId, [FromBody] ApproveBookingDetailDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _bookingService.ApproveBookingDetailAsync(detailId, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // ROOM SCHEDULE
        // ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Kiểm tra lịch phòng theo ngày.
        /// - Phòng IsBookingByPeriod=true: truyền startPeriodId + endPeriodId.
        /// - Phòng IsBookingByPeriod=false: truyền startTime + endTime (VD: "07:00:00").
        /// - Chỉ truyền date → trả toàn bộ lịch trong ngày.
        /// </summary>
        [HttpGet("rooms/{roomId}/schedule")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRoomSchedule(
            int roomId,
            [FromQuery] DateTime date,
            [FromQuery] int? startPeriodId,
            [FromQuery] int? endPeriodId,
            [FromQuery] string? startTime = null,
            [FromQuery] string? endTime = null)
        {
            if (date == default) date = DateTime.Today;

            var query = new RoomScheduleQueryDto
            {
                Date = date,
                StartPeriodId = startPeriodId,
                EndPeriodId   = endPeriodId,
                StartTime = !string.IsNullOrEmpty(startTime) && TimeSpan.TryParse(startTime, out var st) ? st : (TimeSpan?)null,
                EndTime   = !string.IsNullOrEmpty(endTime)   && TimeSpan.TryParse(endTime,   out var et) ? et : (TimeSpan?)null
            };

            var response = await _bookingService.GetRoomScheduleAsync(roomId, query);
            if (!response.Success) return NotFound(response);
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // PERIODS
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy danh sách tiết học</summary>
        [HttpGet("periods")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPeriods()
        {
            var response = await _bookingService.GetPeriodsAsync();
            return Ok(response);
        }
    }
}
