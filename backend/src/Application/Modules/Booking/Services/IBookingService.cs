using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    public interface IBookingService
    {
        /// <summary>Tạo đơn đăng ký mượn phòng mới</summary>
        Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(CreateBookingDto request);

        /// <summary>Lấy tất cả đơn (Admin/Employee)</summary>
        Task<ApiResponse<IEnumerable<BookingResponseDto>>> GetAllBookingsAsync();

        /// <summary>Lấy đơn của user hiện tại</summary>
        Task<ApiResponse<IEnumerable<BookingResponseDto>>> GetMyBookingsAsync();

        /// <summary>Lấy chi tiết một đơn</summary>
        Task<ApiResponse<BookingResponseDto>> GetBookingByIdAsync(int id);

        /// <summary>Duyệt / từ chối toàn bộ đơn</summary>
        Task<ApiResponse<bool>> ApproveBookingAsync(int id, ApproveBookingDto request);

        /// <summary>Duyệt / từ chối từng BookingDetail</summary>
        Task<ApiResponse<bool>> ApproveBookingDetailAsync(int detailId, ApproveBookingDetailDto request);

        /// <summary>Hủy đơn (chỉ người tạo hoặc Admin)</summary>
        Task<ApiResponse<bool>> CancelBookingAsync(int id);

        /// <summary>
        /// Kiểm tra lịch phòng.
        /// - IsBookingByPeriod=true  → lọc theo ngày + tiết bắt đầu/kết thúc (StartPeriodId, EndPeriodId).
        /// - IsBookingByPeriod=false → lọc theo ngày + giờ bắt đầu/kết thúc (StartTime, EndTime).
        /// - Nếu không truyền filter → trả toàn bộ lịch trong ngày.
        /// </summary>
        Task<ApiResponse<RoomScheduleDto>> GetRoomScheduleAsync(int roomId, RoomScheduleQueryDto query);

        /// <summary>Cập nhật trạng thái phòng (Available / InUse / Maintenance)</summary>
        Task<ApiResponse<bool>> UpdateRoomStatusAsync(int roomId, UpdateRoomStatusDto request);

        /// <summary>Lấy tất cả tiết học</summary>
        Task<ApiResponse<IEnumerable<PeriodDto>>> GetPeriodsAsync();
    }
}
