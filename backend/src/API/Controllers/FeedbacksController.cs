using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Feedback.DTOs;
using HUIT_RoMan.Application.Modules.Feedback.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HUIT_RoMan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FeedbacksController : ControllerBase
    {
        private readonly IFeedbackService _feedbackService;

        public FeedbacksController(IFeedbackService feedbackService)
        {
            _feedbackService = feedbackService;
        }

        /// <summary>Gửi đánh giá/phản hồi sau khi sử dụng phòng (1-5 sao kèm nhận xét)</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateFeedbackDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var response = await _feedbackService.CreateFeedbackAsync(dto);
            if (!response.Success)
            {
                return BadRequest(response);
            }

            return Ok(response);
        }

        /// <summary>Lấy danh sách đánh giá phòng (hỗ trợ lọc theo roomId, rating, bookingId và phân trang)</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? roomId,
            [FromQuery] int? rating,
            [FromQuery] int? bookingId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var response = await _feedbackService.GetFeedbacksAsync(roomId, rating, bookingId, page, pageSize);
            return Ok(response);
        }

        /// <summary>Lấy đánh giá của một phiên sử dụng cụ thể</summary>
        [HttpGet("by-session/{sessionId}")]
        public async Task<IActionResult> GetBySession(int sessionId)
        {
            var response = await _feedbackService.GetFeedbackBySessionAsync(sessionId);
            return Ok(response);
        }

        /// <summary>Lấy đánh giá theo mã đơn đặt phòng</summary>
        [HttpGet("by-booking/{bookingId}")]
        public async Task<IActionResult> GetByBooking(int bookingId)
        {
            var response = await _feedbackService.GetFeedbackByBookingAsync(bookingId);
            return Ok(response);
        }

        /// <summary>Lấy thống kê đánh giá tổng quan của một phòng (điểm trung bình, phân bố sao)</summary>
        [HttpGet("room-summary/{roomId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRoomSummary(int roomId)
        {
            var response = await _feedbackService.GetRoomSummaryAsync(roomId);
            if (!response.Success)
            {
                return NotFound(response);
            }
            return Ok(response);
        }

        /// <summary>Xóa đánh giá (chỉ người tạo hoặc quản trị viên)</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var response = await _feedbackService.DeleteFeedbackAsync(id);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return Ok(response);
        }
    }
}

