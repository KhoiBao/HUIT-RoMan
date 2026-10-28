using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Exceptions;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Usage.DTOs;
using HUIT_RoMan.Application.Modules.Usage.Services;
using HUIT_RoMan.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    public class BookingService : IBookingService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUser;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<Period> _periodRepo;
        private readonly IRepository<Domain.Entities.User> _userRepo;
        private readonly IRepository<UserRestriction> _userRestrictionRepo;
        private readonly IUsageService _usageService;

        public BookingService(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IUsageService usageService)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
            _usageService = usageService;
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _periodRepo = _unitOfWork.Repository<Period>();
            _userRepo = _unitOfWork.Repository<Domain.Entities.User>();
            _userRestrictionRepo = _unitOfWork.Repository<UserRestriction>();
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE BOOKING
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(CreateBookingDto request)
        {
            if (_currentUser.UserId == null)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Bạn cần đăng nhập để đặt phòng.");

            var targetUserId = (_currentUser.IsAdmin || _currentUser.Role == "Employee") && request.UserId.HasValue
                ? request.UserId.Value
                : _currentUser.UserId.Value;

            // Kiểm tra lệnh cấm mượn phòng (UserRestriction)
            var now = DateTime.UtcNow;
            var activeRestrictions = await _userRestrictionRepo.FindAsync(
                ur => ur.UserId == targetUserId
                   && ur.Status == "Hoạt động"
                   && ur.StartAt <= now
                   && (ur.EndAt == null || ur.EndAt >= now)
            );
            if (activeRestrictions.Any())
            {
                var r = activeRestrictions.First();
                var endStr = r.EndAt.HasValue ? $" đến ngày {r.EndAt.Value.AddHours(7):dd/MM/yyyy HH:mm}" : "";
                return ApiResponse<BookingResponseDto>.ErrorResponse(
                    $"Tài khoản hiện đang bị cấm/hạn chế mượn phòng{endStr}. Lý do: {r.Reason}. Vui lòng liên hệ ban quản lý thư viện để được giải quyết biên bản vi phạm.");
            }

            if (request.Details == null || !request.Details.Any())
                return ApiResponse<BookingResponseDto>.ErrorResponse("Vui lòng chọn ít nhất một phòng.");

            // Validate rooms exist and are Available
            foreach (var detail in request.Details)
            {
                var room = await _roomRepo.GetByIdAsync(detail.RoomId, r => r.RoomType);
                if (room == null)
                    return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng ID {detail.RoomId} không tồn tại.");

                if (IsRoomUnderMaintenance(room.Status))
                    return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng {room.Name} đang bảo trì, không thể đặt.");

                // Ma trận quyền theo vai trò: vai trò lấy từ token ở server,
                // không tin bất kỳ thông tin role nào do client gửi lên.
                var roleError = BookingRoomPermissionPolicy.ValidateRoleRoomType(
                    _currentUser.Role, room.RoomType?.Name);
                if (roleError != null)
                    return ApiResponse<BookingResponseDto>.ErrorResponse(roleError);

                var isBookingByPeriod = room.RoomType?.IsBookingByPeriod ?? false;
                if (isBookingByPeriod)
                {
                    if (!detail.StartPeriodId.HasValue || !detail.EndPeriodId.HasValue)
                        return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng {room.Name} yêu cầu phải đặt theo tiết học.");

                    var startPeriod = await _periodRepo.GetByIdAsync(detail.StartPeriodId.Value);
                    var endPeriod = await _periodRepo.GetByIdAsync(detail.EndPeriodId.Value);

                    if (startPeriod == null || endPeriod == null)
                        return ApiResponse<BookingResponseDto>.ErrorResponse("Không tìm thấy thông tin tiết học.");

                    // Mỗi loại phòng có bộ 16 tiết riêng; không cho trộn tiết của
                    // phòng lý thuyết với phòng thực hành.
                    if (startPeriod.RoomTypeId.HasValue && startPeriod.RoomTypeId != room.RoomTypeId)
                        return ApiResponse<BookingResponseDto>.ErrorResponse(
                            $"{startPeriod.Name} không thuộc lịch tiết của {room.RoomType?.Name}.");
                    if (endPeriod.RoomTypeId.HasValue && endPeriod.RoomTypeId != room.RoomTypeId)
                        return ApiResponse<BookingResponseDto>.ErrorResponse(
                            $"{endPeriod.Name} không thuộc lịch tiết của {room.RoomType?.Name}.");

                    // detail.StartAt sent by client is in UTC. Convert to UTC+7 (Vietnam local) to get the correct calendar date.
                    var localDate = detail.StartAt.ToUniversalTime().AddHours(7).Date;
                    detail.StartAt = System.DateTime.SpecifyKind(localDate.Add(startPeriod.StartTime).AddHours(-7), System.DateTimeKind.Utc);
                    detail.EndAt = System.DateTime.SpecifyKind(localDate.Add(endPeriod.EndTime).AddHours(-7), System.DateTimeKind.Utc);
                }
                else if (detail.StartPeriodId.HasValue || detail.EndPeriodId.HasValue)
                {
                    return ApiResponse<BookingResponseDto>.ErrorResponse(
                        $"Phòng {room.Name} đặt theo khung giờ, không theo tiết học.");
                }

                if (detail.EndAt <= detail.StartAt)
                    return ApiResponse<BookingResponseDto>.ErrorResponse("Thời gian kết thúc phải sau thời gian bắt đầu.");

                if (StudentBookingPolicy.IsStudent(_currentUser.Role))
                {
                    var windowError = StudentBookingPolicy.ValidateWindow(
                        detail.StartAt,
                        detail.EndAt,
                        DateTime.UtcNow);

                    if (windowError != null)
                        return ApiResponse<BookingResponseDto>.ErrorResponse(windowError);
                }
                else if (BookingRoomPermissionPolicy.IsLecturer(_currentUser.Role)
                         && detail.StartAt.ToUniversalTime() <= now)
                {
                    return ApiResponse<BookingResponseDto>.ErrorResponse(
                        "Không thể đặt thời gian đã qua trong ngày.");
                }

                // Check for conflicting approved/pending bookings
                var conflicts = await _bookingDetailRepo.FindAsync(
                    bd => bd.RoomId == detail.RoomId
                       && bd.Status != "Từ chối"
                       && bd.Status != "Đã hủy"
                       && bd.StartAt < detail.EndAt
                       && bd.EndAt > detail.StartAt
                );

                if (conflicts.Any())
                    return ApiResponse<BookingResponseDto>.ErrorResponse(
                        $"Phòng {room.Name} đã có lịch đặt trùng trong khoảng thời gian này.");
            }

            var initialStatus = ((_currentUser.IsAdmin || _currentUser.Role == "Employee") && request.AutoApprove == true)
                ? "Đã duyệt"
                : "Chờ duyệt";

            // Create Booking
            var booking = new Domain.Entities.Booking
            {
                ActivityName = request.ActivityName,
                Purpose = request.Purpose,
                GuestCount = request.GuestCount,
                Note = request.Note ?? "",
                Status = initialStatus,
                RejectionReason = "",
                UserId = targetUserId,
                RequestedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _bookingRepo.AddAsync(booking);

            // Create BookingDetails
            foreach (var detail in request.Details)
            {
                var bd = new BookingDetail
                {
                    Booking = booking,
                    RoomId = detail.RoomId,
                    StartAt = detail.StartAt,
                    EndAt = detail.EndAt,
                    StartPeriodId = detail.StartPeriodId,
                    EndPeriodId = detail.EndPeriodId,
                    GuestCount = detail.GuestCount > 0 ? detail.GuestCount : request.GuestCount,
                    Purpose = detail.Purpose ?? request.Purpose,
                    Status = initialStatus,
                    RejectionReason = "",
                    CreatedAt = DateTime.UtcNow
                };
                await _bookingDetailRepo.AddAsync(bd);
            }

            try
            {
                // Một SaveChanges duy nhất: Booking + toàn bộ Details nằm trong cùng transaction.
                // Nếu request khác vừa đặt trùng, ràng buộc EX_BookingDetails_Room_NoOverlap ở DB
                // sẽ chặn và rollback toàn bộ, tránh tạo Booking rác.
                await _unitOfWork.SaveChangesAsync();
            }
            catch (ScheduleConflictException)
            {
                return ApiResponse<BookingResponseDto>.ErrorResponse(
                    "Một hoặc nhiều phòng vừa được người khác đặt trong cùng khung giờ. Vui lòng chọn khung giờ khác.");
            }

            return await GetBookingByIdAsync(booking.Id);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ALL BOOKINGS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<BookingResponseDto>>> GetAllBookingsAsync()
        {
            var bookings = await _bookingRepo.GetAllAsync(b => b.User, b => b.BookingDetails);
            
            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue)
            {
                var rooms = await _roomRepo.GetAllAsync(r => r.RoomType);
                var deptRoomIds = rooms
                    .Where(r => r.RoomType?.DepartmentId == _currentUser.DepartmentId.Value)
                    .Select(r => r.Id)
                    .ToHashSet();

                bookings = bookings
                    .Where(b => b.BookingDetails != null && b.BookingDetails.Any(bd => deptRoomIds.Contains(bd.RoomId)))
                    .ToList();
            }

            var dtos = await MapBookingListAsync(bookings);
            return ApiResponse<IEnumerable<BookingResponseDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET MY BOOKINGS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<BookingResponseDto>>> GetMyBookingsAsync()
        {
            if (_currentUser.UserId == null)
                return ApiResponse<IEnumerable<BookingResponseDto>>.ErrorResponse("Bạn cần đăng nhập.");

            var bookings = await _bookingRepo.FindAsync(
                b => b.UserId == _currentUser.UserId.Value,
                b => b.User,
                b => b.BookingDetails
            );

            var dtos = await MapBookingListAsync(bookings);
            return ApiResponse<IEnumerable<BookingResponseDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET BOOKING BY ID
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<BookingResponseDto>> GetBookingByIdAsync(int id)
        {
            var booking = await _bookingRepo.GetByIdAsync(id, b => b.User, b => b.BookingDetails);
            if (booking == null)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Không tìm thấy đơn đặt phòng.");

            var dto = await MapBookingAsync(booking);
            return ApiResponse<BookingResponseDto>.SuccessResponse(dto);
        }

        // ─────────────────────────────────────────────────────────────────
        // APPROVE / REJECT BOOKING
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> ApproveBookingAsync(int id, ApproveBookingDto request)
        {
            if (!_currentUser.IsAdmin && _currentUser.Role != "Employee")
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền duyệt đơn.");

            var booking = await _bookingRepo.GetByIdAsync(id, b => b.BookingDetails);
            if (booking == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy đơn đặt phòng.");

            if (booking.Status != "Chờ duyệt")
                return ApiResponse<bool>.ErrorResponse("Chỉ có thể duyệt đơn ở trạng thái Chờ duyệt.");

            var newStatus = request.Decision == "Đã duyệt" ? "Đã duyệt" : "Từ chối";

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue)
            {
                var rooms = await _roomRepo.GetAllAsync(r => r.RoomType);
                var deptRoomIds = rooms
                    .Where(r => r.RoomType?.DepartmentId == _currentUser.DepartmentId.Value)
                    .Select(r => r.Id)
                    .ToHashSet();

                var targetDetails = booking.BookingDetails.Where(bd => deptRoomIds.Contains(bd.RoomId)).ToList();
                if (!targetDetails.Any())
                {
                    return ApiResponse<bool>.ErrorResponse("Đơn này không có phòng nào thuộc đơn vị bạn quản lý.");
                }

                foreach (var detail in targetDetails)
                {
                    detail.Status = newStatus;
                    detail.RejectionReason = request.RejectionReason;
                    _bookingDetailRepo.Update(detail);
                }

                var allDetails = booking.BookingDetails.ToList();
                if (allDetails.All(d => d.Status == "Đã duyệt"))
                    booking.Status = "Đã duyệt";
                else if (allDetails.All(d => d.Status == "Từ chối"))
                    booking.Status = "Từ chối";
                else if (allDetails.Any(d => d.Status != "Chờ duyệt"))
                    booking.Status = "Duyệt một phần";

                _bookingRepo.Update(booking);
            }
            else
            {
                booking.Status = newStatus;
                booking.RejectionReason = request.RejectionReason;

                foreach (var detail in booking.BookingDetails)
                {
                    detail.Status = newStatus;
                    detail.RejectionReason = request.RejectionReason;
                }

                _bookingRepo.Update(booking);
            }

            await _unitOfWork.SaveChangesAsync();

            var message = newStatus == "Đã duyệt" ? "Duyệt đơn thành công." : "Từ chối đơn thành công.";
            return ApiResponse<bool>.SuccessResponse(true, message);
        }

        // ─────────────────────────────────────────────────────────────────
        // APPROVE / REJECT BOOKING DETAIL
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> ApproveBookingDetailAsync(int detailId, ApproveBookingDetailDto request)
        {
            if (!_currentUser.IsAdmin && _currentUser.Role != "Employee")
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền duyệt chi tiết đơn.");

            var detail = await _bookingDetailRepo.GetByIdAsync(detailId, bd => bd.Booking);
            if (detail == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy chi tiết đặt phòng.");

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue)
            {
                var room = await _roomRepo.GetByIdAsync(detail.RoomId, r => r.RoomType);
                if (room?.RoomType?.DepartmentId != _currentUser.DepartmentId.Value)
                {
                    return ApiResponse<bool>.ErrorResponse("Bạn chỉ có quyền duyệt phòng thuộc đơn vị của mình.");
                }
            }

            if (detail.Status != "Chờ duyệt")
                return ApiResponse<bool>.ErrorResponse("Chi tiết này đã được xử lý.");

            var newStatus = request.Decision == "Đã duyệt" ? "Đã duyệt" : "Từ chối";
            detail.Status = newStatus;
            detail.RejectionReason = request.RejectionReason;
            _bookingDetailRepo.Update(detail);

            // Update parent booking status based on children
            var booking = await _bookingRepo.GetByIdAsync(detail.BookingId, b => b.BookingDetails);
            if (booking != null)
            {
                var allDetails = booking.BookingDetails.ToList();
                if (allDetails.All(d => d.Status == "Đã duyệt"))
                    booking.Status = "Đã duyệt";
                else if (allDetails.All(d => d.Status == "Từ chối"))
                    booking.Status = "Từ chối";
                else if (allDetails.Any(d => d.Status != "Chờ duyệt"))
                    booking.Status = "Duyệt một phần";

                _bookingRepo.Update(booking);
            }

            await _unitOfWork.SaveChangesAsync();

            var message = newStatus == "Đã duyệt" ? "Duyệt chi tiết thành công." : "Từ chối chi tiết thành công.";
            return ApiResponse<bool>.SuccessResponse(true, message);
        }

        // ─────────────────────────────────────────────────────────────────
        // CANCEL BOOKING (hủy đơn — sinh viên hủy có lý do, quản trị hủy tùy ý)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> CancelBookingAsync(int id, CancelBookingRequest? request = null, DateTime? nowUtc = null)
        {
            var now = nowUtc ?? DateTime.UtcNow;
            var booking = await _bookingRepo.GetByIdAsync(id, b => b.BookingDetails);
            if (booking == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy đơn đặt phòng.");

            var isOwner = booking.UserId == _currentUser.UserId;
            var isStaff = _currentUser.IsAdmin || _currentUser.Role == "Employee";

            if (!isStaff && !isOwner)
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền hủy đơn này.");

            if (booking.Status == "Đã hủy")
                return ApiResponse<bool>.ErrorResponse("Đơn đã bị hủy trước đó.");

            string? reasonCode = null;
            string? reasonDetail = null;
            string cancelSource;

            if (isStaff && !isOwner)
            {
                // Quản trị viên / nhân sự hủy đơn: lý do là tùy chọn (giữ nguyên hành vi cũ).
                cancelSource = BookingCancelPolicy.SourceStaff;
                reasonCode = string.IsNullOrWhiteSpace(request?.Reason) ? null : request!.Reason!.Trim().ToUpperInvariant();
                reasonDetail = string.IsNullOrWhiteSpace(request?.ReasonDetail) ? null : request!.ReasonDetail!.Trim();
            }
            else
            {
                // Sinh viên hủy trực tuyến: bắt buộc có lý do hợp lệ và còn hạn 3 giờ trước giờ bắt đầu.
                var reasonError = BookingCancelPolicy.ValidateReason(request?.Reason, request?.ReasonDetail);
                if (reasonError != null)
                    return ApiResponse<bool>.ErrorResponse(reasonError);

                if (booking.CheckedInAt != null)
                    return ApiResponse<bool>.ErrorResponse("Đơn đã được nhận phòng, không thể hủy trực tuyến.");

                var isApproved = booking.Status == "Đã duyệt" || booking.Status == "Duyệt một phần";
                if (!isApproved)
                    return ApiResponse<bool>.ErrorResponse("Chỉ đơn đã được duyệt mới có thể hủy trực tuyến. Vui lòng liên hệ quản lý thư viện nếu cần hỗ trợ.");

                var startAt = GetBookingStartAt(booking);
                if (!BookingCancelPolicy.IsWithinDeadline(startAt, now))
                {
                    var deadlineLocal = startAt.AddHours(-BookingCancelPolicy.MinLeadTime.TotalHours).AddHours(7);
                    return ApiResponse<bool>.ErrorResponse(
                        $"Đã quá hạn hủy trực tuyến (hạn cuối: {deadlineLocal:dd/MM/yyyy HH:mm}). Vui lòng liên hệ quản lý thư viện.");
                }

                cancelSource = BookingCancelPolicy.SourceStudent;
                reasonCode = request!.Reason!.Trim().ToUpperInvariant();
                reasonDetail = string.IsNullOrWhiteSpace(request!.ReasonDetail) ? null : request!.ReasonDetail!.Trim();
            }

            // Atomic claim: chỉ một request thành công khi đơn chưa bị hủy (và sinh viên thì chưa check-in).
            var claimPredicate = (isStaff && !isOwner)
                ? (System.Linq.Expressions.Expression<Func<Domain.Entities.Booking, bool>>)(b => b.Id == id && b.Status != "Đã hủy")
                : b => b.Id == id && b.Status != "Đã hủy" && b.CheckedInAt == null;

            var claimed = await _bookingRepo.UpdateIfAsync(claimPredicate, set => set
                .SetProperty(b => b.Status, "Đã hủy")
                .SetProperty(b => b.CancelReason, reasonCode)
                .SetProperty(b => b.CancelReasonDetail, reasonDetail)
                .SetProperty(b => b.CancelSource, cancelSource)
                .SetProperty(b => b.UpdatedAt, now));

            if (claimed == 0)
                return ApiResponse<bool>.ErrorResponse("Không thể hủy đơn: đơn đã được xử lý bởi thao tác khác (đã hủy hoặc đã nhận phòng).");

            // Đồng bộ entity đang theo dõi với kết quả claim rồi hủy các chi tiết (giải phóng khung giờ).
            booking.Status = "Đã hủy";
            booking.CancelReason = reasonCode;
            booking.CancelReasonDetail = reasonDetail;
            booking.CancelSource = cancelSource;

            foreach (var detail in booking.BookingDetails)
                detail.Status = "Đã hủy";

            _bookingRepo.Update(booking);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Hủy đơn thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // CHECK-IN (NHẬN PHÒNG)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<BookingResponseDto>> CheckInBookingAsync(int id, DateTime? nowUtc = null)
        {
            var now = nowUtc ?? DateTime.UtcNow;

            if (_currentUser.UserId == null)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Bạn cần đăng nhập để nhận phòng.");

            var booking = await _bookingRepo.GetByIdAsync(id, b => b.BookingDetails);
            if (booking == null)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Không tìm thấy đơn đặt phòng.");

            if (booking.UserId != _currentUser.UserId)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Bạn chỉ có thể nhận phòng cho đơn đặt của chính mình.");

            if (booking.CheckedInAt != null)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Đơn đã được nhận phòng trước đó.");

            if (booking.Status == "Đã hủy")
                return ApiResponse<BookingResponseDto>.ErrorResponse("Đơn đã bị hủy, không thể nhận phòng.");

            var isApproved = booking.Status == "Đã duyệt" || booking.Status == "Duyệt một phần";
            if (!isApproved)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Đơn chưa được duyệt, chưa thể nhận phòng.");

            var activeDetails = (booking.BookingDetails ?? new List<BookingDetail>())
                .Where(d => d.Status == "Đã duyệt" || d.Status == "Đang sử dụng")
                .ToList();
            if (activeDetails.Count == 0)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Đơn không còn chi tiết phòng nào ở trạng thái có thể nhận.");

            var startAt = GetBookingStartAt(booking);
            var windowError = BookingCheckInPolicy.ValidateWindow(startAt, now);
            if (windowError != null)
                return ApiResponse<BookingResponseDto>.ErrorResponse(windowError);

            // Atomic claim: chỉ một request check-in thành công (chống double check-in khi chạy đồng thời),
            // đồng thời tranh đua với tác vụ tự động hủy (no-show) đang chạy nền.
            var claimed = await _bookingRepo.UpdateIfAsync(
                b => b.Id == id
                   && b.CheckedInAt == null
                   && (b.Status == "Đã duyệt" || b.Status == "Duyệt một phần"),
                set => set
                    .SetProperty(b => b.CheckedInAt, now)
                    .SetProperty(b => b.UpdatedAt, now));

            if (claimed == 0)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Không thể nhận phòng: đơn đã được xử lý bởi thao tác khác.");

            booking.CheckedInAt = now;

            // Khởi tạo phiên sử dụng cho từng chi tiết đã duyệt (tái sử dụng toàn bộ logic check-in hiện có:
            // cập nhật trạng thái chi tiết/đơn/phòng và tạo UsageSession kèm mã xác nhận).
            foreach (var detail in activeDetails.Where(d => d.Status == "Đã duyệt"))
            {
                await _usageService.CheckInAsync(new CheckInRequestDto
                {
                    BookingDetailId = detail.Id,
                    ActualCheckIn = now,
                    ActualGuestCount = detail.GuestCount,
                    StaffNote = "Sinh viên nhận phòng qua nút Nhận phòng",
                    InternalBookingCheckIn = true
                });
            }

            var fresh = await _bookingRepo.GetByIdAsync(id, b => b.BookingDetails);
            var dto = fresh != null ? await MapBookingAsync(fresh) : await MapBookingAsync(booking);

            return ApiResponse<BookingResponseDto>.SuccessResponse(dto, "Nhận phòng thành công!");
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ROOM SCHEDULE
        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// Tìm kiếm lịch phòng theo 2 chế độ dựa vào IsBookingByPeriod của loại phòng:
        ///   IsBookingByPeriod = true  → lọc theo ngày + StartPeriodId + EndPeriodId (tra bảng Periods lấy giờ).
        ///   IsBookingByPeriod = false → lọc theo ngày + StartTime + EndTime (TimeSpan).
        ///   Nếu không cung cấp filter → trả toàn bộ lịch trong ngày.
        /// </summary>
        public async Task<ApiResponse<RoomScheduleDto>> GetRoomScheduleAsync(int roomId, RoomScheduleQueryDto query)
        {
            // Load room kèm RoomType để đọc IsBookingByPeriod
            var room = await _roomRepo.GetByIdAsync(roomId, r => r.RoomType);
            if (room == null)
                return ApiResponse<RoomScheduleDto>.ErrorResponse("Không tìm thấy phòng.");

            var isBookingByPeriod = room.RoomType?.IsBookingByPeriod ?? false;
            // Ngày người dùng chọn là giờ Việt Nam (UTC+7); DB lưu UTC nên cửa sổ ngày
            // phải dịch về UTC để không lệch 7 giờ so với các API khác.
            var localDate = query.Date.Date;
            var startOfDay = DateTime.SpecifyKind(localDate.AddHours(-7), DateTimeKind.Utc);
            var endOfDay   = DateTime.SpecifyKind(localDate.AddDays(1).AddHours(-7), DateTimeKind.Utc);

            // Khung thời gian mặc định = cả ngày
            DateTime windowStart = startOfDay;
            DateTime windowEnd   = endOfDay;
            string   filterDesc  = "Toàn ngày";

            if (isBookingByPeriod)
            {
                // ── Chế độ theo Tiết ──────────────────────────────────────
                if (query.StartPeriodId.HasValue && query.EndPeriodId.HasValue)
                {
                    var startPeriod = await _periodRepo.GetByIdAsync(query.StartPeriodId.Value);
                    var endPeriod   = await _periodRepo.GetByIdAsync(query.EndPeriodId.Value);

                    if (startPeriod == null)
                        return ApiResponse<RoomScheduleDto>.ErrorResponse(
                            $"Không tìm thấy tiết học ID {query.StartPeriodId}.");
                    if (endPeriod == null)
                        return ApiResponse<RoomScheduleDto>.ErrorResponse(
                            $"Không tìm thấy tiết học ID {query.EndPeriodId}.");
                    if (startPeriod.StartTime > endPeriod.EndTime)
                        return ApiResponse<RoomScheduleDto>.ErrorResponse(
                            "Tiết bắt đầu phải trước tiết kết thúc.");

                    if (startPeriod.RoomTypeId.HasValue && startPeriod.RoomTypeId != room.RoomTypeId)
                        return ApiResponse<RoomScheduleDto>.ErrorResponse(
                            $"{startPeriod.Name} không thuộc lịch tiết của phòng này.");
                    if (endPeriod.RoomTypeId.HasValue && endPeriod.RoomTypeId != room.RoomTypeId)
                        return ApiResponse<RoomScheduleDto>.ErrorResponse(
                            $"{endPeriod.Name} không thuộc lịch tiết của phòng này.");

                    // Chuyển giờ tiết → datetime thực (UTC)
                    windowStart = DateTime.SpecifyKind(localDate.Add(startPeriod.StartTime).AddHours(-7), DateTimeKind.Utc);
                    windowEnd   = DateTime.SpecifyKind(localDate.Add(endPeriod.EndTime).AddHours(-7), DateTimeKind.Utc);
                    filterDesc  = $"{startPeriod.Name} → {endPeriod.Name}";
                }
                // Nếu không truyền period → giữ nguyên toàn ngày
            }
            else
            {
                // ── Chế độ theo Giờ ───────────────────────────────────────
                if (query.StartTime.HasValue && query.EndTime.HasValue)
                {
                    if (query.StartTime >= query.EndTime)
                        return ApiResponse<RoomScheduleDto>.ErrorResponse(
                            "Giờ bắt đầu phải trước giờ kết thúc.");

                    windowStart = DateTime.SpecifyKind(localDate.Add(query.StartTime.Value).AddHours(-7), DateTimeKind.Utc);
                    windowEnd   = DateTime.SpecifyKind(localDate.Add(query.EndTime.Value).AddHours(-7), DateTimeKind.Utc);
                    filterDesc  = $"{query.StartTime:hh\\:mm} → {query.EndTime:hh\\:mm}";
                }
                // Nếu không truyền time → giữ nguyên toàn ngày
            }

            // Truy vấn BookingDetails có lịch trùng với [windowStart, windowEnd)
            var details = await _bookingDetailRepo.FindAsync(
                bd => bd.RoomId == roomId
                   && bd.Status != "Từ chối"
                   && bd.Status != "Đã hủy"
                   && bd.StartAt < windowEnd
                   && bd.EndAt   > windowStart,
                bd => bd.Booking,
                bd => bd.Booking.User,
                bd => bd.StartPeriod,
                bd => bd.EndPeriod
            );

            var scheduleItems = details.Select(bd => new RoomScheduleItemDto
            {
                BookingDetailId = bd.Id,
                BookingId       = bd.BookingId,
                RoomId          = room.Id,
                RoomName        = room.Name,
                RoomCode        = room.RoomCode,
                ActivityName    = bd.Booking?.ActivityName,
                Purpose         = bd.Purpose ?? bd.Booking?.Purpose,
                StartAt         = bd.StartAt,
                EndAt           = bd.EndAt,
                StartPeriodId   = bd.StartPeriodId,
                StartPeriodName = bd.StartPeriod?.Name,
                EndPeriodId     = bd.EndPeriodId,
                EndPeriodName   = bd.EndPeriod?.Name,
                GuestCount      = bd.GuestCount,
                Status          = bd.Status,
                BookedByName    = bd.Booking?.User?.UserName
            }).OrderBy(s => s.StartAt).ToList();

            var dto = new RoomScheduleDto
            {
                RoomId           = room.Id,
                RoomName         = room.Name,
                RoomCode         = room.RoomCode,
                RoomStatus       = room.Status,
                IsBookingByPeriod = isBookingByPeriod,
                QueryDate        = localDate,
                Schedules        = scheduleItems
            };

            return ApiResponse<RoomScheduleDto>.SuccessResponse(dto,
                $"Lịch phòng {room.Name} ngày {localDate:dd/MM/yyyy} | {filterDesc}");
        }


        // ─────────────────────────────────────────────────────────────────
        // GET SCHEDULES FOR A DATE RANGE (day / week / month view)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<RoomScheduleItemDto>>> GetSchedulesAsync(
            DateTime fromDate, DateTime toDate)
        {
            var from = fromDate.Date;
            var to = toDate.Date;
            if (to < from) (from, to) = (to, from);
            // Giới hạn khoảng truy vấn để tránh tải quá nhiều dữ liệu trong một request.
            if ((to - from).TotalDays > 62) to = from.AddDays(62);

            var windowStart = DateTime.SpecifyKind(from.AddHours(-7), DateTimeKind.Utc);
            var windowEnd   = DateTime.SpecifyKind(to.AddDays(1).AddHours(-7), DateTimeKind.Utc);

            var details = await _bookingDetailRepo.FindAsync(
                bd => bd.Status != "Từ chối"
                   && bd.Status != "Đã hủy"
                   && bd.StartAt < windowEnd
                   && bd.EndAt   > windowStart,
                bd => bd.Room,
                bd => bd.Booking,
                bd => bd.Booking.User,
                bd => bd.StartPeriod,
                bd => bd.EndPeriod
            );

            var items = details
                .Where(bd => bd.Room != null)
                .Select(bd => new RoomScheduleItemDto
                {
                    BookingDetailId = bd.Id,
                    BookingId       = bd.BookingId,
                    RoomId          = bd.RoomId,
                    RoomName        = bd.Room.Name,
                    RoomCode        = bd.Room.RoomCode,
                    ActivityName    = bd.Booking?.ActivityName,
                    Purpose         = bd.Purpose ?? bd.Booking?.Purpose,
                    StartAt         = bd.StartAt,
                    EndAt           = bd.EndAt,
                    StartPeriodId   = bd.StartPeriodId,
                    StartPeriodName = bd.StartPeriod?.Name,
                    EndPeriodId     = bd.EndPeriodId,
                    EndPeriodName   = bd.EndPeriod?.Name,
                    GuestCount      = bd.GuestCount,
                    Status          = bd.Status,
                    BookedByName    = bd.Booking?.User?.UserName
                })
                .OrderBy(s => s.StartAt)
                .ThenBy(s => s.RoomCode)
                .ToList();

            return ApiResponse<IEnumerable<RoomScheduleItemDto>>.SuccessResponse(
                items,
                $"Lịch đặt phòng từ {from:dd/MM/yyyy} đến {to:dd/MM/yyyy}");
        }

        // ─────────────────────────────────────────────────────────────────
        // UPDATE ROOM STATUS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> UpdateRoomStatusAsync(int roomId, UpdateRoomStatusDto request)
        {
            if (!_currentUser.IsAdmin && _currentUser.Role != "Employee")
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền cập nhật trạng thái phòng.");

            var allowedStatuses = new[] { "Trống", "Đang sử dụng", "Bảo trì", "Available", "InUse", "Maintenance" };
            if (!allowedStatuses.Contains(request.Status))
                return ApiResponse<bool>.ErrorResponse(
                    $"Trạng thái không hợp lệ. Chỉ chấp nhận: {string.Join(", ", allowedStatuses)}");

            var room = await _roomRepo.GetByIdAsync(roomId);
            if (room == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy phòng.");

            room.Status = request.Status;

            // Không ghi đè Description: trường này đang chứa danh sách tiện ích của phòng
            // và được trang lịch phòng hiển thị.

            _roomRepo.Update(room);
            await _unitOfWork.SaveChangesAsync();

            var statusLabel = request.Status switch
            {
                "Trống" or "Available" => "Phòng trống",
                "Đang sử dụng" or "InUse" => "Đang sử dụng",
                "Bảo trì" or "Maintenance" => "Đang bảo trì",
                _ => request.Status
            };

            return ApiResponse<bool>.SuccessResponse(true, $"Cập nhật trạng thái phòng thành '{statusLabel}' thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // GET PERIODS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<PeriodDto>>> GetPeriodsAsync(int? roomTypeId = null)
        {
            var periods = await _periodRepo.GetAllAsync(p => p.RoomType);
            var dtos = periods
                .Where(p => !roomTypeId.HasValue || p.RoomTypeId == roomTypeId)
                .Select(p => new PeriodDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    StartTime = p.StartTime,
                    EndTime = p.EndTime,
                    RoomTypeId = p.RoomTypeId,
                    RoomTypeName = p.RoomType?.Name
                })
                .OrderBy(p => p.RoomTypeId)
                .ThenBy(p => p.StartTime)
                .ToList();

            return ApiResponse<IEnumerable<PeriodDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────
        /// <summary>
        /// DB có thể lưu trạng thái phòng bằng tiếng Việt hoặc tiếng Anh
        /// (dữ liệu seed và API cập nhật trạng thái dùng cả hai).
        /// </summary>
        private static bool IsRoomUnderMaintenance(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var normalized = status.Trim();
            return normalized.Equals("Bảo trì", StringComparison.OrdinalIgnoreCase)
                || normalized.Equals("Maintenance", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Thời điểm bắt đầu đặt phòng T = StartAt sớm nhất trong các chi tiết còn hiệu lực
        /// (không tính chi tiết đã từ chối / đã hủy).
        /// </summary>
        private static DateTime GetBookingStartAt(Domain.Entities.Booking booking)
        {
            var activeStarts = (booking.BookingDetails ?? new List<BookingDetail>())
                .Where(d => d.Status != "Từ chối" && d.Status != "Đã hủy")
                .Select(d => d.StartAt)
                .ToList();

            if (activeStarts.Count == 0)
            {
                activeStarts = (booking.BookingDetails ?? new List<BookingDetail>())
                    .Select(d => d.StartAt)
                    .ToList();
            }

            var start = activeStarts.Count > 0 ? activeStarts.Min() : booking.RequestedAt;
            return DateTime.SpecifyKind(start, DateTimeKind.Utc);
        }

        private async Task<BookingResponseDto> MapBookingAsync(Domain.Entities.Booking booking)
        {
            var detailDtos = new List<BookingDetailResponseDto>();

            foreach (var bd in booking.BookingDetails ?? new List<BookingDetail>())
            {
                var room = await _roomRepo.GetByIdAsync(bd.RoomId);
                var startPeriod = bd.StartPeriodId.HasValue ? await _periodRepo.GetByIdAsync(bd.StartPeriodId.Value) : null;
                var endPeriod = bd.EndPeriodId.HasValue ? await _periodRepo.GetByIdAsync(bd.EndPeriodId.Value) : null;

                detailDtos.Add(new BookingDetailResponseDto
                {
                    Id = bd.Id,
                    RoomId = bd.RoomId,
                    RoomName = room?.Name,
                    RoomCode = room?.RoomCode,
                    StartAt = bd.StartAt,
                    EndAt = bd.EndAt,
                    StartPeriodId = bd.StartPeriodId,
                    StartPeriodName = startPeriod?.Name,
                    EndPeriodId = bd.EndPeriodId,
                    EndPeriodName = endPeriod?.Name,
                    GuestCount = bd.GuestCount,
                    Purpose = bd.Purpose,
                    Status = bd.Status,
                    RejectionReason = bd.RejectionReason,
                    CreatedAt = bd.CreatedAt
                });
            }

            var startAt = GetBookingStartAt(booking);
            var isCheckedIn = booking.CheckedInAt != null;
            var isApproved = booking.Status == "Đã duyệt" || booking.Status == "Duyệt một phần";

            CheckInWindowDto? checkInWindow = null;
            if (isApproved && !isCheckedIn && booking.Status != "Đã hủy")
            {
                checkInWindow = new CheckInWindowDto
                {
                    StartAt = startAt,
                    OpensAt = startAt - BookingCheckInPolicy.OpenBeforeStart,
                    DeadlineAt = startAt,
                    State = BookingCheckInPolicy.Evaluate(startAt, DateTime.UtcNow).ToString(),
                    ServerTime = DateTime.UtcNow
                };
            }

            return new BookingResponseDto
            {
                Id = booking.Id,
                ActivityName = booking.ActivityName,
                Purpose = booking.Purpose,
                GuestCount = booking.GuestCount,
                Status = booking.Status,
                RejectionReason = booking.RejectionReason,
                Note = booking.Note,
                RequestedAt = booking.RequestedAt,
                CreatedAt = booking.CreatedAt,
                UserId = booking.UserId,
                UserName = booking.User?.UserName,
                UserFullName = booking.User?.FullName ?? booking.User?.UserName,
                CheckedInAt = booking.CheckedInAt,
                CancelReason = booking.CancelReason,
                CancelReasonDetail = booking.CancelReasonDetail,
                CancelSource = booking.CancelSource,
                CheckInWindow = checkInWindow,
                Details = detailDtos
            };
        }

        private async Task<List<BookingResponseDto>> MapBookingListAsync(IEnumerable<Domain.Entities.Booking> bookings)
        {
            var result = new List<BookingResponseDto>();
            foreach (var b in bookings.OrderByDescending(b => b.CreatedAt))
                result.Add(await MapBookingAsync(b));
            return result;
        }

        public async Task<ApiResponse<IEnumerable<BookingResponseDto>>> SearchBookingsAsync(
            string? keyword,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            int? roomId)
        {
            var bookings = await _bookingRepo.GetAllAsync(
                b => b.User,
                b => b.BookingDetails);

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue)
            {
                var deptId = _currentUser.DepartmentId.Value;
                var deptRooms = (await _roomRepo.FindAsync(r => r.RoomType != null && r.RoomType.DepartmentId == deptId))
                    .Select(r => r.Id).ToHashSet();

                bookings = bookings.Where(b =>
                    b.BookingDetails != null && b.BookingDetails.Any(d => deptRooms.Contains(d.RoomId))).ToList();
            }

            var query = bookings.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(b => string.Equals(b.Status, status, StringComparison.OrdinalIgnoreCase));
            }

            if (fromDate.HasValue)
            {
                var f = fromDate.Value.ToUniversalTime();
                query = query.Where(b => b.RequestedAt >= f);
            }

            if (toDate.HasValue)
            {
                var t = toDate.Value.ToUniversalTime();
                query = query.Where(b => b.RequestedAt <= t);
            }

            if (roomId.HasValue && roomId.Value > 0)
            {
                query = query.Where(b => b.BookingDetails != null && b.BookingDetails.Any(d => d.RoomId == roomId.Value));
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var term = keyword.Trim().ToLower();
                query = query.Where(b =>
                    b.Id.ToString() == term ||
                    $"#{b.Id}".Contains(term) ||
                    (b.ActivityName != null && b.ActivityName.ToLower().Contains(term)) ||
                    (b.Purpose != null && b.Purpose.ToLower().Contains(term)) ||
                    (b.User != null && (
                        (b.User.FullName != null && b.User.FullName.ToLower().Contains(term)) ||
                        (b.User.CardCode != null && b.User.CardCode.ToLower().Contains(term)) ||
                        (b.User.UserName != null && b.User.UserName.ToLower().Contains(term)) ||
                        (b.User.Email != null && b.User.Email.ToLower().Contains(term))
                    ))
                );
            }

            var dtos = await MapBookingListAsync(query);
            return ApiResponse<IEnumerable<BookingResponseDto>>.SuccessResponse(dtos);
        }
    }
}
