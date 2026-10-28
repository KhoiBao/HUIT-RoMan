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

        /// <summary>Tìm kiếm phiếu mượn phòng đa tiêu chí</summary>
        [HttpGet("search")]
        [Authorize(Roles = "Admin,Employee")]
        public async Task<IActionResult> Search(
            [FromQuery] string? keyword,
            [FromQuery] string? status,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int? roomId)
        {
            var response = await _bookingService.SearchBookingsAsync(keyword, status, fromDate, toDate, roomId);
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

        /// <summary>
        /// Hủy đơn đặt phòng.
        /// Sinh viên: bắt buộc gửi lý do (reason hợp lệ, OTHER kèm reasonDetail) và còn hạn
        /// 3 giờ trước giờ bắt đầu. Admin/Employee: lý do là tùy chọn.
        /// </summary>
        [HttpPatch("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] CancelBookingRequest? request = null)
        {
            var response = await _bookingService.CancelBookingAsync(id, request);
            if (!response.Success) return BadRequest(response);
            return Ok(response);
        }

        /// <summary>
        /// Nhận phòng (check-in) đơn đã duyệt trong cửa sổ [T - 15 phút, T).
        /// Backend xác minh lại sở hữu đơn, trạng thái và thời điểm tại thời điểm request.
        /// </summary>
        [HttpPost("{id}/check-in")]
        public async Task<IActionResult> CheckIn(int id)
        {
            var response = await _bookingService.CheckInBookingAsync(id);
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

        /// <summary>
        /// Lịch đặt phòng của tất cả phòng trong một khoảng ngày (giờ Việt Nam).
        /// Dùng cho chế độ xem Ngày / Tuần / Tháng của trang lịch phòng.
        /// </summary>
        [HttpGet("schedules")]
        public async Task<IActionResult> GetSchedules(
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            if (from == default) from = DateTime.Today;
            if (to == default) to = from;

            var response = await _bookingService.GetSchedulesAsync(from, to);
            return Ok(response);
        }

        // ─────────────────────────────────────────────────────────────────
        // PERIODS
        // ─────────────────────────────────────────────────────────────────

        /// <summary>Lấy danh sách tiết học (lọc theo loại phòng nếu cần)</summary>
        [HttpGet("periods")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPeriods([FromQuery] int? roomTypeId = null)
        {
            var response = await _bookingService.GetPeriodsAsync(roomTypeId);
            return Ok(response);
        }
    }
}
