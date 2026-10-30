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
        private readonly IRepository<Domain.Entities.Notification> _notificationRepo;
        private readonly IRepository<ApprovalHistory> _approvalHistoryRepo;
        private readonly IRepository<Employee> _employeeRepo;
        private readonly IRepository<UsageSession> _usageRepo;
        private readonly IUsageService _usageService;
        private readonly IEmailService? _emailService;

        public BookingService(
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUser,
            IUsageService usageService,
            IEmailService? emailService = null)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
            _usageService = usageService;
            _emailService = emailService;
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _periodRepo = _unitOfWork.Repository<Period>();
            _userRepo = _unitOfWork.Repository<Domain.Entities.User>();
            _userRestrictionRepo = _unitOfWork.Repository<UserRestriction>();
            _notificationRepo = _unitOfWork.Repository<Domain.Entities.Notification>();
            _approvalHistoryRepo = _unitOfWork.Repository<ApprovalHistory>();
            _employeeRepo = _unitOfWork.Repository<Employee>();
            _usageRepo = _unitOfWork.Repository<UsageSession>();
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE BOOKING
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(CreateBookingDto request)
        {
            if (_currentUser.UserId == null)
                return ApiResponse<BookingResponseDto>.ErrorResponse("Bạn cần đăng nhập để đặt phòng.");

            var targetUserId = (_currentUser.IsAdmin || (_currentUser.Role == "Employee" || _currentUser.Role == "Manager")) && request.UserId.HasValue
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
                var room = await _roomRepo.GetByIdAsync(detail.RoomId, r => r.RoomType, r => r.RoomEquipments);
                if (room == null)
                    return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng ID {detail.RoomId} không tồn tại.");

                var hasMaintenanceEquip = room.RoomEquipments != null && room.RoomEquipments.Any(re =>
                    !re.IsDeleted && HUIT_RoMan.Application.Modules.Room.Services.RoomEquipmentService.IsEquipmentUnderMaintenance(re.Status));

                if (IsRoomUnderMaintenance(room.Status) || hasMaintenanceEquip)
                    return ApiResponse<BookingResponseDto>.ErrorResponse($"Phòng {room.Name} đang bảo trì thiết bị, không thể đặt.");

                // Ma trận quyền theo vai trò: vai trò lấy từ token ở server,
                // không tin bất kỳ thông tin role nào do client gửi lên.
                var roleError = BookingRoomPermissionPolicy.ValidateRoleRoomType(
                    _currentUser.Role, room.RoomType?.Name);
                if (roleError != null)
                    return ApiResponse<BookingResponseDto>.ErrorResponse(roleError);



                if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
                {
                    if (room.RoomType?.DepartmentId != _currentUser.DepartmentId.Value)
                    {
                        return ApiResponse<BookingResponseDto>.ErrorResponse("Bạn chỉ có quyền đặt phòng thuộc đơn vị/khoa do mình quản lý.");
                    }
                }

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
                {
                    var roomLabel = room.Name.StartsWith("Phòng", StringComparison.OrdinalIgnoreCase)
                        ? room.Name
                        : $"Phòng {room.Name}";
                    return ApiResponse<BookingResponseDto>.ErrorResponse(
                        $"{roomLabel} đã có lịch đặt trùng trong khoảng thời gian này.");
                }
            }

            var initialStatus = ((_currentUser.IsAdmin || (_currentUser.Role == "Employee" || _currentUser.Role == "Manager")) && request.AutoApprove == true)
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
            
            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
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
            if (!_currentUser.IsAdmin && (_currentUser.Role != "Employee" && _currentUser.Role != "Manager"))
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền duyệt đơn.");

            var booking = await _bookingRepo.GetByIdAsync(id, b => b.BookingDetails);
            if (booking == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy đơn đặt phòng.");

            if (booking.Status != "Chờ duyệt")
                return ApiResponse<bool>.ErrorResponse("Chỉ có thể duyệt đơn ở trạng thái Chờ duyệt.");

            var newStatus = request.Decision == "Đã duyệt" ? "Đã duyệt" : "Từ chối";

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
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
                booking.RejectionReason = request.RejectionReason ?? string.Empty;

                foreach (var detail in booking.BookingDetails)
                {
                    detail.Status = newStatus;
                    detail.RejectionReason = request.RejectionReason ?? string.Empty;
                }

                _bookingRepo.Update(booking);
            }

            await _unitOfWork.SaveChangesAsync();

            var notifTitle = booking.Status switch
            {
                "Đã duyệt" => "Đơn đặt phòng đã được duyệt",
                "Từ chối" => "Đơn đặt phòng bị từ chối",
                "Duyệt một phần" => "Đơn đặt phòng được duyệt một phần",
                _ => "Cập nhật trạng thái đơn đặt phòng"
            };
            var notifContent = booking.Status switch
            {
                "Đã duyệt" => $"Đơn #{booking.Id} cho hoạt động '{booking.ActivityName}' đã được duyệt thành công.",
                "Từ chối" => $"Đơn #{booking.Id} cho hoạt động '{booking.ActivityName}' đã bị từ chối. Lý do: {request.RejectionReason ?? "Không có lý do cụ thể"}",
                "Duyệt một phần" => $"Đơn #{booking.Id} cho hoạt động '{booking.ActivityName}' đã được duyệt một số phòng yêu cầu.",
                _ => $"Đơn #{booking.Id} đã chuyển sang trạng thái '{booking.Status}'."
            };

            var employeeId = await GetDecidingEmployeeIdAsync();
            if (employeeId.HasValue)
            {
                var historyStatus = booking.Status switch
                {
                    "Đã duyệt" => ApprovalStatus.Approved,
                    "Từ chối" => ApprovalStatus.Rejected,
                    "Duyệt một phần" => ApprovalStatus.PartiallyApproved,
                    _ => ApprovalStatus.Approved
                };
                await _approvalHistoryRepo.AddAsync(new ApprovalHistory
                {
                    BookingId = booking.Id,
                    EmployeeId = employeeId.Value,
                    Status = historyStatus,
                    Comment = string.IsNullOrWhiteSpace(request.RejectionReason)
                        ? (newStatus == "Đã duyệt" ? "Duyệt đơn đặt phòng" : "Từ chối đơn đặt phòng")
                        : request.RejectionReason,
                    DecidedAt = DateTime.UtcNow
                });
            }

            await _notificationRepo.AddAsync(new Domain.Entities.Notification
            {
                UserId = booking.UserId,
                Title = notifTitle,
                Content = notifContent,
                Type = 1,
                IsRead = false,
                SentAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });
            await _unitOfWork.SaveChangesAsync();

            // Tạo UsageSession với ConfirmationCode ngay khi duyệt để người dùng có mã nhận phòng ngay lập tức
            var generatedCodes = new List<string>();
            if (booking.Status == "Đã duyệt" || booking.Status == "Duyệt một phần")
            {
                foreach (var detail in booking.BookingDetails.Where(d => d.Status == "Đã duyệt"))
                {
                    var existingSessions = await _usageRepo.FindAsync(s => s.BookingDetailId == detail.Id);
                    var session = existingSessions.FirstOrDefault();
                    if (session == null)
                    {
                        var code = $"HUIT-{new Random().Next(10000, 99999)}";
                        session = new UsageSession
                        {
                            BookingDetailId = detail.Id,
                            UserId = booking.UserId,
                            Status = "Chờ nhận phòng",
                            ConfirmationCode = code,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _usageRepo.AddAsync(session);
                        generatedCodes.Add(code);
                    }
                    else if (!string.IsNullOrWhiteSpace(session.ConfirmationCode))
                    {
                        generatedCodes.Add(session.ConfirmationCode);
                    }
                }
                await _unitOfWork.SaveChangesAsync();
            }

            var checkInCodeSummary = generatedCodes.Count > 0 ? string.Join(", ", generatedCodes.Distinct()) : null;

            // Gửi email thông báo kết quả duyệt (chạy ngầm an toàn kèm mã nhận phòng)
            _ = SendApprovalEmailSafelyAsync(booking, newStatus, request.RejectionReason, checkInCodeSummary);

            var message = newStatus == "Đã duyệt" ? "Duyệt đơn thành công." : "Từ chối đơn thành công.";
            return ApiResponse<bool>.SuccessResponse(true, message);
        }

        // ─────────────────────────────────────────────────────────────────
        // APPROVE / REJECT BOOKING DETAIL
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> ApproveBookingDetailAsync(int detailId, ApproveBookingDetailDto request)
        {
            if (!_currentUser.IsAdmin && (_currentUser.Role != "Employee" && _currentUser.Role != "Manager"))
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền duyệt chi tiết đơn.");

            var detail = await _bookingDetailRepo.GetByIdAsync(detailId, bd => bd.Booking);
            if (detail == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy chi tiết đặt phòng.");

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
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

            if (booking != null)
            {
                var room = await _roomRepo.GetByIdAsync(detail.RoomId);
                var roomName = room?.Name ?? $"phòng #{detail.RoomId}";
                var notifTitle = newStatus == "Đã duyệt"
                    ? $"Chi tiết {roomName} đã được duyệt"
                    : $"Chi tiết {roomName} bị từ chối";
                var notifContent = newStatus == "Đã duyệt"
                    ? $"Yêu cầu sử dụng {roomName} trong đơn #{booking.Id} đã được duyệt."
                    : $"Yêu cầu sử dụng {roomName} trong đơn #{booking.Id} đã bị từ chối. Lý do: {request.RejectionReason ?? "Không có lý do cụ thể"}.";

                var detailEmpId = await GetDecidingEmployeeIdAsync();
                if (detailEmpId.HasValue)
                {
                    var detailStatus = newStatus == "Đã duyệt" ? ApprovalStatus.Approved : ApprovalStatus.Rejected;
                    await _approvalHistoryRepo.AddAsync(new ApprovalHistory
                    {
                        BookingId = detail.BookingId,
                        EmployeeId = detailEmpId.Value,
                        Status = detailStatus,
                        Comment = $"[Chi tiết #{detail.Id}] {detail.Status}. {request.RejectionReason ?? ""}".Trim(),
                        DecidedAt = DateTime.UtcNow
                    });
                }

            await _notificationRepo.AddAsync(new Domain.Entities.Notification
                {
                    UserId = booking.UserId,
                    Title = notifTitle,
                    Content = notifContent,
                    Type = 1,
                    IsRead = false,
                    SentAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                });

                string? detailCode = null;
                if (newStatus == "Đã duyệt")
                {
                    var existingSessions = await _usageRepo.FindAsync(s => s.BookingDetailId == detail.Id);
                    var session = existingSessions.FirstOrDefault();
                    if (session == null)
                    {
                        detailCode = $"HUIT-{new Random().Next(10000, 99999)}";
                        session = new UsageSession
                        {
                            BookingDetailId = detail.Id,
                            UserId = booking.UserId,
                            Status = "Chờ nhận phòng",
                            ConfirmationCode = detailCode,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _usageRepo.AddAsync(session);
                    }
                    else
                    {
                        detailCode = session.ConfirmationCode;
                    }
                }

                await _unitOfWork.SaveChangesAsync();

                // Gửi email thông báo kết quả duyệt chi tiết phòng (chạy ngầm an toàn kèm mã nhận phòng)
                _ = SendApprovalDetailEmailSafelyAsync(booking, detail, newStatus, request.RejectionReason, detailCode);
            }

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
            var isStaff = _currentUser.IsAdmin || (_currentUser.Role == "Employee" || _currentUser.Role == "Manager");

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

            if (isStaff && !isOwner)
            {
                var cancelEmpId = await GetDecidingEmployeeIdAsync();
                if (cancelEmpId.HasValue)
                {
                    await _approvalHistoryRepo.AddAsync(new ApprovalHistory
                    {
                        BookingId = booking.Id,
                        EmployeeId = cancelEmpId.Value,
                        Status = ApprovalStatus.CancelledByStaff,
                        Comment = $"Quản lý hủy đơn: {reasonDetail ?? reasonCode ?? "Không có lý do cụ thể"}",
                        DecidedAt = now
                    });
                }

            await _notificationRepo.AddAsync(new Domain.Entities.Notification
                {
                    UserId = booking.UserId,
                    Title = "Đơn đặt phòng bị hủy bởi quản lý/nhân sự",
                    Content = $"Đơn #{booking.Id} cho hoạt động '{booking.ActivityName}' đã bị hủy bởi nhân sự/quản trị viên. Lý do: {reasonDetail ?? reasonCode ?? "Không có lý do cụ thể"}.",
                    Type = 1,
                    IsRead = false,
                    SentAt = now,
                    CreatedAt = now
                });
                await _unitOfWork.SaveChangesAsync();

                // Gửi email thông báo hủy bởi quản lý (chạy ngầm an toàn)
                _ = SendCancellationEmailSafelyAsync(booking, reasonDetail ?? reasonCode ?? "Không có lý do cụ thể");
            }

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
            var isStaff = _currentUser.IsAdmin
                || (_currentUser.Role == "Employee" || _currentUser.Role == "Manager")
                || _currentUser.Role == "quan-tri"
                || _currentUser.Role == "Quản trị viên";

            if (!isStaff)
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền cập nhật trạng thái phòng.");

            if (string.IsNullOrWhiteSpace(request?.Status))
                return ApiResponse<bool>.ErrorResponse("Trạng thái phòng không được để trống.");

            var rawStatus = request.Status.Trim();
            var allowedStatuses = new[] { "Trống", "Đang sử dụng", "Bảo trì", "Available", "InUse", "Maintenance" };
            var matchedStatus = allowedStatuses.FirstOrDefault(s => string.Equals(s, rawStatus, StringComparison.OrdinalIgnoreCase));
            if (matchedStatus == null)
                return ApiResponse<bool>.ErrorResponse(
                    $"Trạng thái không hợp lệ. Chỉ chấp nhận: {string.Join(", ", allowedStatuses)}");

            var room = await _roomRepo.GetByIdAsync(roomId, r => r.RoomType);
            if (room == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy phòng.");

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                if (room.RoomType?.DepartmentId != _currentUser.DepartmentId.Value)
                {
                    return ApiResponse<bool>.ErrorResponse("Bạn chỉ có quyền cập nhật trạng thái phòng thuộc đơn vị của mình.");
                }
            }

            var standardizedStatus = matchedStatus switch
            {
                "Trống" or "Available" => "Available",
                "Đang sử dụng" or "InUse" => "InUse",
                "Bảo trì" or "Maintenance" => "Maintenance",
                _ => matchedStatus
            };

            room.Status = standardizedStatus;

            _roomRepo.Update(room);
            await _unitOfWork.SaveChangesAsync();

            var statusLabel = standardizedStatus switch
            {
                "Available" => "Sẵn sàng",
                "InUse" => "Đang sử dụng",
                "Maintenance" => "Đang bảo trì",
                _ => standardizedStatus
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

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
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

        private async Task<int?> GetDecidingEmployeeIdAsync()
        {
            if (_currentUser.UserId.HasValue)
            {
                var emp = (await _employeeRepo.FindAsync(e => e.UserId == _currentUser.UserId.Value)).FirstOrDefault();
                if (emp != null) return emp.Id;
            }
            var firstEmp = (await _employeeRepo.GetAllAsync()).FirstOrDefault();
            return firstEmp?.Id;
        }

        public async Task<ApiResponse<List<ApprovalHistoryDto>>> GetApprovalHistoryAsync(int bookingId)
        {
            var booking = await _bookingRepo.GetByIdAsync(bookingId);
            if (booking == null)
            {
                return ApiResponse<List<ApprovalHistoryDto>>.ErrorResponse("Không tìm thấy đơn đặt phòng.");
            }

            var isOwner = _currentUser.UserId.HasValue && booking.UserId == _currentUser.UserId.Value;
            var isStaff = _currentUser.IsAdmin || (_currentUser.Role == "Employee" || _currentUser.Role == "Manager") || _currentUser.Role == "quan-tri" || _currentUser.Role == "Quản trị viên";
            if (!isOwner && !isStaff)
            {
                return ApiResponse<List<ApprovalHistoryDto>>.ErrorResponse("Bạn không có quyền xem lịch sử duyệt đơn này.");
            }

            var histories = await _approvalHistoryRepo.FindAsync(
                h => h.BookingId == bookingId,
                h => h.Employee,
                h => h.Employee.User
            );

            var dtos = histories
                .OrderBy(h => h.DecidedAt)
                .Select(h => new ApprovalHistoryDto
                {
                    Id = h.Id,
                    BookingId = h.BookingId,
                    Status = h.Status,
                    StatusName = h.Status switch
                    {
                        ApprovalStatus.Approved => "Đã duyệt",
                        ApprovalStatus.Rejected => "Từ chối",
                        ApprovalStatus.PartiallyApproved => "Duyệt một phần",
                        ApprovalStatus.CancelledByStaff => "Đã hủy bởi quản trị",
                        _ => "Không xác định"
                    },
                    Comment = h.Comment ?? string.Empty,
                    DecidedAt = h.DecidedAt,
                    EmployeeId = h.EmployeeId,
                    EmployeeName = h.Employee?.User?.FullName ?? h.Employee?.User?.UserName ?? "Nhân sự",
                    EmployeeCode = h.Employee?.Code ?? string.Empty,
                    EmployeePosition = h.Employee?.Position ?? string.Empty
                })
                .ToList();

            if (!dtos.Any() && booking.Status != "Chờ duyệt")
            {
                dtos.Add(new ApprovalHistoryDto
                {
                    Id = 0,
                    BookingId = booking.Id,
                    Status = booking.Status switch
                    {
                        "Đã duyệt" => ApprovalStatus.Approved,
                        "Từ chối" => ApprovalStatus.Rejected,
                        "Duyệt một phần" => ApprovalStatus.PartiallyApproved,
                        "Đã hủy" => ApprovalStatus.CancelledByStaff,
                        _ => ApprovalStatus.Approved
                    },
                    StatusName = booking.Status,
                    Comment = string.IsNullOrWhiteSpace(booking.RejectionReason)
                        ? (booking.Status == "Đã duyệt" ? "Đơn đặt phòng đã được phê duyệt hợp lệ." : "Đã cập nhật trạng thái đơn.")
                        : booking.RejectionReason,
                    DecidedAt = booking.UpdatedAt ?? booking.CreatedAt,
                    EmployeeName = "Ban Quản lý HUIT",
                    EmployeeCode = "BQL",
                    EmployeePosition = "Cán bộ xét duyệt"
                });
            }

            return ApiResponse<List<ApprovalHistoryDto>>.SuccessResponse(dtos);
        }

        private async Task SendApprovalEmailSafelyAsync(Domain.Entities.Booking booking, string decision, string? reason, string? checkInCode = null)
        {
            if (_emailService == null) return;

            try
            {
                var user = booking.User ?? await _userRepo.GetByIdAsync(booking.UserId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

                var details = booking.BookingDetails ?? (await _bookingDetailRepo.FindAsync(d => d.BookingId == booking.Id, d => d.Room)).ToList();
                var rooms = details
                    .Select(d => d.Room?.Name ?? (d.RoomId > 0 ? $"Phòng #{d.RoomId}" : null))
                    .Where(n => !string.IsNullOrEmpty(n))
                    .Distinct()
                    .ToList();
                var roomSummary = rooms.Count > 0 ? string.Join(", ", rooms) : null;
                var startAt = details.OrderBy(d => d.StartAt).Select(d => (DateTime?)d.StartAt).FirstOrDefault();
                var endAt = details.OrderByDescending(d => d.EndAt).Select(d => (DateTime?)d.EndAt).FirstOrDefault();

                // Nếu checkInCode chưa truyền vào và đơn được duyệt, tra cứu mã nhận phòng từ UsageSession
                if (string.IsNullOrWhiteSpace(checkInCode) && (decision == "Đã duyệt" || decision == "Duyệt một phần"))
                {
                    var detailIds = details.Where(d => d.Status == "Đã duyệt").Select(d => d.Id).ToList();
                    if (detailIds.Count > 0)
                    {
                        var sessions = await _usageRepo.FindAsync(s => detailIds.Contains(s.BookingDetailId));
                        var codes = sessions.Select(s => s.ConfirmationCode).Where(c => !string.IsNullOrWhiteSpace(c)).Distinct().ToList();
                        if (codes.Count > 0)
                        {
                            checkInCode = string.Join(", ", codes);
                        }
                    }
                }

                await _emailService.SendBookingApprovalEmailAsync(
                    user.Email,
                    user.FullName ?? user.UserName ?? "Quý người dùng",
                    booking.Id,
                    booking.ActivityName,
                    decision,
                    reason,
                    roomSummary,
                    startAt,
                    endAt,
                    checkInCode);
            }
            catch
            {
                // Bỏ qua lỗi gửi email để không chặn luồng duyệt chính
            }
        }

        private async Task SendApprovalDetailEmailSafelyAsync(Domain.Entities.Booking booking, BookingDetail detail, string detailDecision, string? reason, string? checkInCode = null)
        {
            if (_emailService == null) return;

            try
            {
                var user = booking.User ?? await _userRepo.GetByIdAsync(booking.UserId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

                var room = detail.Room ?? await _roomRepo.GetByIdAsync(detail.RoomId);
                var roomName = room?.Name ?? $"Phòng #{detail.RoomId}";

                // Nếu checkInCode chưa truyền vào và chi tiết được duyệt, tra cứu mã nhận phòng
                if (string.IsNullOrWhiteSpace(checkInCode) && detailDecision == "Đã duyệt")
                {
                    var sessions = await _usageRepo.FindAsync(s => s.BookingDetailId == detail.Id);
                    checkInCode = sessions.FirstOrDefault()?.ConfirmationCode;
                }

                await _emailService.SendBookingApprovalEmailAsync(
                    user.Email,
                    user.FullName ?? user.UserName ?? "Quý người dùng",
                    booking.Id,
                    $"{booking.ActivityName} ({roomName})",
                    detailDecision,
                    reason,
                    roomName,
                    detail.StartAt,
                    detail.EndAt,
                    checkInCode);
            }
            catch
            {
                // Bỏ qua lỗi gửi email
            }
        }

        private async Task SendCancellationEmailSafelyAsync(Domain.Entities.Booking booking, string? reason)
        {
            if (_emailService == null) return;

            try
            {
                var user = booking.User ?? await _userRepo.GetByIdAsync(booking.UserId);
                if (user == null || string.IsNullOrWhiteSpace(user.Email)) return;

                var details = booking.BookingDetails ?? (await _bookingDetailRepo.FindAsync(d => d.BookingId == booking.Id, d => d.Room)).ToList();
                var rooms = details
                    .Select(d => d.Room?.Name ?? (d.RoomId > 0 ? $"Phòng #{d.RoomId}" : null))
                    .Where(n => !string.IsNullOrEmpty(n))
                    .Distinct()
                    .ToList();
                var roomSummary = rooms.Count > 0 ? string.Join(", ", rooms) : null;
                var startAt = details.OrderBy(d => d.StartAt).Select(d => (DateTime?)d.StartAt).FirstOrDefault();
                var endAt = details.OrderByDescending(d => d.EndAt).Select(d => (DateTime?)d.EndAt).FirstOrDefault();

                await _emailService.SendBookingApprovalEmailAsync(
                    user.Email,
                    user.FullName ?? user.UserName ?? "Quý người dùng",
                    booking.Id,
                    booking.ActivityName,
                    "Đã hủy bởi quản trị",
                    reason,
                    roomSummary,
                    startAt,
                    endAt);
            }
            catch
            {
                // Bỏ qua lỗi gửi email
            }
        }
    }
}
