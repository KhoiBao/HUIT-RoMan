using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Exceptions;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
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

        public BookingService(IUnitOfWork unitOfWork, ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
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

            // Kiểm tra lệnh cấm mượn phòng (UserRestriction)
            var now = DateTime.UtcNow;
            var activeRestrictions = await _userRestrictionRepo.FindAsync(
                ur => ur.UserId == _currentUser.UserId.Value
                   && ur.Status == "Hoạt động"
                   && ur.StartAt <= now
                   && (ur.EndAt == null || ur.EndAt >= now)
            );
            if (activeRestrictions.Any())
            {
                var r = activeRestrictions.First();
                var endStr = r.EndAt.HasValue ? $" đến ngày {r.EndAt.Value.AddHours(7):dd/MM/yyyy HH:mm}" : "";
                return ApiResponse<BookingResponseDto>.ErrorResponse(
                    $"Tài khoản của bạn hiện đang bị cấm/hạn chế mượn phòng{endStr}. Lý do: {r.Reason}. Vui lòng liên hệ ban quản lý thư viện để được giải quyết biên bản vi phạm.");
            }

            if (request.Details == null || !request.Details.Any())
                return ApiResponse<BookingResponseDto>.ErrorResponse("Vui lòng chọn ít nhất một phòng.");

            // Validate rooms exist and are Available
            foreach (var detail in request.Details)
            {
                var room = await _roomRepo.GetByIdAsync(detail.RoomId, r => r.RoomType);
                if (room == null)
                    return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng ID {detail.RoomId} không tồn tại.");

                if (room.Status == "Bảo trì")
                    return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng {room.Name} đang bảo trì, không thể đặt.");

                if (room.RoomType != null && room.RoomType.IsBookingByPeriod)
                {
                    if (!detail.StartPeriodId.HasValue || !detail.EndPeriodId.HasValue)
                        return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng {room.Name} yêu cầu phải đặt theo tiết học.");

                    var startPeriod = await _periodRepo.GetByIdAsync(detail.StartPeriodId.Value);
                    var endPeriod = await _periodRepo.GetByIdAsync(detail.EndPeriodId.Value);

                    if (startPeriod == null || endPeriod == null)
                        return ApiResponse<BookingResponseDto>.ErrorResponse("Không tìm thấy thông tin tiết học.");

                    // detail.StartAt sent by client is in UTC. Convert to UTC+7 (Vietnam local) to get the correct calendar date.
                    var localDate = detail.StartAt.ToUniversalTime().AddHours(7).Date;
                    detail.StartAt = System.DateTime.SpecifyKind(localDate.Add(startPeriod.StartTime).AddHours(-7), System.DateTimeKind.Utc);
                    detail.EndAt = System.DateTime.SpecifyKind(localDate.Add(endPeriod.EndTime).AddHours(-7), System.DateTimeKind.Utc);
                }

                if (detail.EndAt <= detail.StartAt)
                    return ApiResponse<BookingResponseDto>.ErrorResponse("Thời gian kết thúc phải sau thời gian bắt đầu.");

                if (StudentBookingPolicy.IsStudent(_currentUser.Role))
                {
                    if (!StudentBookingPolicy.IsBookableRoomType(room.RoomType?.Name))
                    {
                        return ApiResponse<BookingResponseDto>.ErrorResponse(
                            "Sinh viên chỉ được đặt phòng học nhóm và phòng thuyết trình của Thư viện.");
                    }

                    var windowError = StudentBookingPolicy.ValidateWindow(
                        detail.StartAt,
                        detail.EndAt,
                        DateTime.UtcNow);

                    if (windowError != null)
                        return ApiResponse<BookingResponseDto>.ErrorResponse(windowError);
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

            // Create Booking
            var booking = new Domain.Entities.Booking
            {
                ActivityName = request.ActivityName,
                Purpose = request.Purpose,
                GuestCount = request.GuestCount,
                Note = request.Note ?? "",
                Status = "Chờ duyệt",
                RejectionReason = "",
                UserId = _currentUser.UserId.Value,
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
                    Status = "Chờ duyệt",
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
        // CANCEL BOOKING
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> CancelBookingAsync(int id)
        {
            var booking = await _bookingRepo.GetByIdAsync(id, b => b.BookingDetails);
            if (booking == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy đơn đặt phòng.");

            if (!_currentUser.IsAdmin && booking.UserId != _currentUser.UserId)
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền hủy đơn này.");

            if (booking.Status == "Đã hủy")
                return ApiResponse<bool>.ErrorResponse("Đơn đã bị hủy trước đó.");

            booking.Status = "Đã hủy";
            foreach (var detail in booking.BookingDetails)
                detail.Status = "Đã hủy";

            _bookingRepo.Update(booking);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Hủy đơn thành công.");
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
            // Đảm bảo DateTimeKind = Utc để Postgres không bị lỗi khi so sánh với timestamp with time zone
            var queryDate = DateTime.SpecifyKind(query.Date.Date, DateTimeKind.Utc);
            var startOfDay = queryDate;
            var endOfDay   = queryDate.AddDays(1);

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

                    // Chuyển giờ tiết → datetime thực
                    windowStart = queryDate.Add(startPeriod.StartTime);
                    windowEnd   = queryDate.Add(endPeriod.EndTime);
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

                    windowStart = queryDate.Add(query.StartTime.Value);
                    windowEnd   = queryDate.Add(query.EndTime.Value);
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
                QueryDate        = queryDate,
                Schedules        = scheduleItems
            };

            return ApiResponse<RoomScheduleDto>.SuccessResponse(dto,
                $"Lịch phòng {room.Name} ngày {queryDate:dd/MM/yyyy} | {filterDesc}");
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

            if (!string.IsNullOrWhiteSpace(request.Reason))
                room.Description = $"[{request.Status}] {request.Reason}";

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
        public async Task<ApiResponse<IEnumerable<PeriodDto>>> GetPeriodsAsync()
        {
            var periods = await _periodRepo.GetAllAsync();
            var dtos = periods.Select(p => new PeriodDto
            {
                Id = p.Id,
                Name = p.Name,
                StartTime = p.StartTime,
                EndTime = p.EndTime
            }).OrderBy(p => p.StartTime).ToList();

            return ApiResponse<IEnumerable<PeriodDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────
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
