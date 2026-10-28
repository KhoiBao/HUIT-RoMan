using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Feedback.DTOs;

namespace HUIT_RoMan.Application.Modules.Feedback.Services
{
    public interface IFeedbackService
    {
        Task<ApiResponse<FeedbackDto>> CreateFeedbackAsync(CreateFeedbackDto dto);
        Task<ApiResponse<FeedbackListDto>> GetFeedbacksAsync(int? roomId = null, int? rating = null, int? bookingId = null, int page = 1, int pageSize = 20);
        Task<ApiResponse<FeedbackDto?>> GetFeedbackBySessionAsync(int usageSessionId);
        Task<ApiResponse<FeedbackDto?>> GetFeedbackByBookingAsync(int bookingId);
        Task<ApiResponse<RoomFeedbackSummaryDto>> GetRoomSummaryAsync(int roomId);
        Task<ApiResponse<bool>> DeleteFeedbackAsync(int id);
    }
}

