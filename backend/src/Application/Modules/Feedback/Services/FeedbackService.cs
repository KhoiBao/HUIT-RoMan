using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Feedback.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.Application.Modules.Feedback.Services
{
    public class FeedbackService : IFeedbackService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUser;
        private readonly ILogger<FeedbackService> _logger;
        private readonly IRepository<Domain.Entities.Feedback> _feedbackRepo;
        private readonly IRepository<UsageSession> _usageSessionRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;

        public FeedbackService(
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUser,
            ILogger<FeedbackService> logger)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
            _logger = logger;
            _feedbackRepo = _unitOfWork.Repository<Domain.Entities.Feedback>();
            _usageSessionRepo = _unitOfWork.Repository<UsageSession>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
        }

        public async Task<ApiResponse<FeedbackDto>> CreateFeedbackAsync(CreateFeedbackDto dto)
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<FeedbackDto>.ErrorResponse("Bạn cần đăng nhập để gửi đánh giá.");
            }

            if (dto.Rating < 1 || dto.Rating > 5)
            {
                return ApiResponse<FeedbackDto>.ErrorResponse("Đánh giá phải từ 1 đến 5 sao.");
            }

            var userId = _currentUser.UserId.Value;
            UsageSession? session = null;

            if (dto.UsageSessionId.HasValue && dto.UsageSessionId.Value > 0)
            {
                session = await _usageSessionRepo.GetByIdAsync(
                    dto.UsageSessionId.Value,
                    s => s.BookingDetail,
                    s => s.BookingDetail.Room,
                    s => s.BookingDetail.Booking,
                    s => s.User
                );
            }
            else if (dto.BookingId.HasValue && dto.BookingId.Value > 0)
            {
                var sessions = await _usageSessionRepo.FindAsync(
                    s => s.BookingDetail != null && s.BookingDetail.BookingId == dto.BookingId.Value,
                    s => s.BookingDetail,
                    s => s.BookingDetail.Room,
                    s => s.BookingDetail.Booking,
                    s => s.User
                );
                session = sessions.FirstOrDefault();

                if (session == null)
                {
                    // Nếu chưa có UsageSession nhưng đơn đã tồn tại và đã được duyệt / đang dùng / hoàn thành
                    var booking = await _bookingRepo.GetByIdAsync(dto.BookingId.Value, b => b.BookingDetails);
                    if (booking == null)
                    {
                        return ApiResponse<FeedbackDto>.ErrorResponse("Không tìm thấy đơn đặt phòng.");
                    }

                    var detail = booking.BookingDetails.FirstOrDefault();
                    if (detail == null)
                    {
                        return ApiResponse<FeedbackDto>.ErrorResponse("Đơn đặt phòng không có chi tiết phòng.");
                    }

                    session = new UsageSession
                    {
                        BookingDetailId = detail.Id,
                        UserId = booking.UserId,
                        Status = "Hoàn thành",
                        ActualCheckIn = detail.StartAt,
                        ActualCheckOut = detail.EndAt,
                        ConfirmationCode = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper()
                    };
                    await _usageSessionRepo.AddAsync(session);
                    await _unitOfWork.SaveChangesAsync();

                    session = await _usageSessionRepo.GetByIdAsync(
                        session.Id,
                        s => s.BookingDetail,
                        s => s.BookingDetail.Room,
                        s => s.BookingDetail.Booking,
                        s => s.User
                    );
                }
            }

            if (session == null)
            {
                return ApiResponse<FeedbackDto>.ErrorResponse("Không tìm thấy phiên sử dụng hoặc đơn đặt phòng hợp lệ.");
            }

            // Kiểm tra quyền: Người đánh giá phải là người đặt phòng hoặc người chịu trách nhiệm phiên
            var isOwner = session.UserId == userId || (session.BookingDetail?.Booking?.UserId == userId);
            var isStaff = _currentUser.IsAdmin || _currentUser.Role == "Employee";
            if (!isOwner && !isStaff)
            {
                return ApiResponse<FeedbackDto>.ErrorResponse("Bạn chỉ có thể đánh giá phiên phòng của chính mình.");
            }

            var now = DateTime.UtcNow;

            // Kiểm tra xem đã có feedback của user này cho session chưa
            var existingFeedbacks = await _feedbackRepo.FindAsync(
                f => f.UsageSessionId == session.Id && f.UserId == userId && !f.IsDeleted
            );
            var feedback = existingFeedbacks.FirstOrDefault();

            if (feedback != null)
            {
                // Cập nhật đánh giá cũ
                feedback.Rating = dto.Rating;
                feedback.Comment = dto.Comment?.Trim() ?? string.Empty;
                feedback.UpdatedAt = now;
                _feedbackRepo.Update(feedback);
            }
            else
            {
                // Tạo mới
                feedback = new Domain.Entities.Feedback
                {
                    UserId = userId,
                    UsageSessionId = session.Id,
                    Rating = dto.Rating,
                    Comment = dto.Comment?.Trim() ?? string.Empty,
                    CreatedAt = now
                };
                await _feedbackRepo.AddAsync(feedback);
            }

            await _unitOfWork.SaveChangesAsync();

            var resultDto = MapToDto(feedback, session);
            return ApiResponse<FeedbackDto>.SuccessResponse(resultDto, "Gửi đánh giá thành công. Cảm ơn bạn đã đóng góp ý kiến!");
        }

        public async Task<ApiResponse<FeedbackListDto>> GetFeedbacksAsync(
            int? roomId = null,
            int? rating = null,
            int? bookingId = null,
            int page = 1,
            int pageSize = 20)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 20 : (pageSize > 100 ? 100 : pageSize);

            var feedbacks = await _feedbackRepo.FindAsync(
                f => !f.IsDeleted,
                f => f.User,
                f => f.UsageSession,
                f => f.UsageSession.BookingDetail,
                f => f.UsageSession.BookingDetail.Room,
                f => f.UsageSession.BookingDetail.Booking
            );

            var query = feedbacks.AsEnumerable();

            if (roomId.HasValue && roomId.Value > 0)
            {
                query = query.Where(f => f.UsageSession?.BookingDetail?.RoomId == roomId.Value);
            }

            if (rating.HasValue && rating.Value > 0)
            {
                query = query.Where(f => f.Rating == rating.Value);
            }

            if (bookingId.HasValue && bookingId.Value > 0)
            {
                query = query.Where(f => f.UsageSession?.BookingDetail?.BookingId == bookingId.Value);
            }

            var totalCount = query.Count();
            var averageRating = totalCount > 0 ? Math.Round(query.Average(f => f.Rating), 1) : 5.0;

            var items = query
                .OrderByDescending(f => f.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(f => MapToDto(f, f.UsageSession))
                .ToList();

            var result = new FeedbackListDto
            {
                TotalCount = totalCount,
                AverageRating = averageRating,
                Page = page,
                PageSize = pageSize,
                Items = items
            };

            return ApiResponse<FeedbackListDto>.SuccessResponse(result);
        }

        public async Task<ApiResponse<FeedbackDto?>> GetFeedbackBySessionAsync(int usageSessionId)
        {
            var feedbacks = await _feedbackRepo.FindAsync(
                f => f.UsageSessionId == usageSessionId && !f.IsDeleted,
                f => f.User,
                f => f.UsageSession,
                f => f.UsageSession.BookingDetail,
                f => f.UsageSession.BookingDetail.Room,
                f => f.UsageSession.BookingDetail.Booking
            );

            var fb = feedbacks.OrderByDescending(f => f.CreatedAt).FirstOrDefault();
            if (fb == null)
            {
                return ApiResponse<FeedbackDto?>.SuccessResponse(null, "Chưa có đánh giá cho phiên này.");
            }

            return ApiResponse<FeedbackDto?>.SuccessResponse(MapToDto(fb, fb.UsageSession));
        }

        public async Task<ApiResponse<FeedbackDto?>> GetFeedbackByBookingAsync(int bookingId)
        {
            var feedbacks = await _feedbackRepo.FindAsync(
                f => !f.IsDeleted && f.UsageSession != null && f.UsageSession.BookingDetail != null && f.UsageSession.BookingDetail.BookingId == bookingId,
                f => f.User,
                f => f.UsageSession,
                f => f.UsageSession.BookingDetail,
                f => f.UsageSession.BookingDetail.Room,
                f => f.UsageSession.BookingDetail.Booking
            );

            var fb = feedbacks.OrderByDescending(f => f.CreatedAt).FirstOrDefault();
            if (fb == null)
            {
                return ApiResponse<FeedbackDto?>.SuccessResponse(null, "Chưa có đánh giá cho đơn đặt phòng này.");
            }

            return ApiResponse<FeedbackDto?>.SuccessResponse(MapToDto(fb, fb.UsageSession));
        }

        public async Task<ApiResponse<RoomFeedbackSummaryDto>> GetRoomSummaryAsync(int roomId)
        {
            var room = await _roomRepo.GetByIdAsync(roomId);
            if (room == null)
            {
                return ApiResponse<RoomFeedbackSummaryDto>.ErrorResponse("Phòng không tồn tại.");
            }

            var feedbacks = (await _feedbackRepo.FindAsync(
                f => !f.IsDeleted && f.UsageSession != null && f.UsageSession.BookingDetail != null && f.UsageSession.BookingDetail.RoomId == roomId
            )).ToList();

            var total = feedbacks.Count;
            var avg = total > 0 ? Math.Round(feedbacks.Average(f => f.Rating), 1) : 5.0;

            var summary = new RoomFeedbackSummaryDto
            {
                RoomId = roomId,
                RoomName = room.Name,
                AverageRating = avg,
                TotalFeedbacks = total,
                Star1Count = feedbacks.Count(f => f.Rating == 1),
                Star2Count = feedbacks.Count(f => f.Rating == 2),
                Star3Count = feedbacks.Count(f => f.Rating == 3),
                Star4Count = feedbacks.Count(f => f.Rating == 4),
                Star5Count = feedbacks.Count(f => f.Rating == 5)
            };

            return ApiResponse<RoomFeedbackSummaryDto>.SuccessResponse(summary);
        }

        public async Task<ApiResponse<bool>> DeleteFeedbackAsync(int id)
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<bool>.ErrorResponse("Bạn cần đăng nhập.");
            }

            var feedback = await _feedbackRepo.GetByIdAsync(id);
            if (feedback == null || feedback.IsDeleted)
            {
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy đánh giá.");
            }

            var isOwner = feedback.UserId == _currentUser.UserId.Value;
            var isStaff = _currentUser.IsAdmin || _currentUser.Role == "Employee";
            if (!isOwner && !isStaff)
            {
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền xóa đánh giá này.");
            }

            feedback.IsDeleted = true;
            feedback.UpdatedAt = DateTime.UtcNow;
            _feedbackRepo.Update(feedback);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Đã xóa đánh giá.");
        }

        private static FeedbackDto MapToDto(Domain.Entities.Feedback f, UsageSession? session)
        {
            var detail = session?.BookingDetail;
            var user = f.User ?? session?.User;

            return new FeedbackDto
            {
                Id = f.Id,
                Rating = f.Rating,
                Comment = f.Comment ?? string.Empty,
                UserId = f.UserId,
                UserName = user?.FullName ?? user?.UserName ?? $"Người dùng #{f.UserId}",
                UserCardCode = user?.CardCode ?? string.Empty,
                UsageSessionId = f.UsageSessionId,
                BookingId = detail?.BookingId,
                RoomId = detail?.RoomId,
                RoomName = detail?.Room?.Name ?? (detail?.RoomId != null ? $"Phòng #{detail.RoomId}" : string.Empty),
                StartAt = detail?.StartAt,
                EndAt = detail?.EndAt,
                CreatedAt = f.CreatedAt
            };
        }
    }
}
