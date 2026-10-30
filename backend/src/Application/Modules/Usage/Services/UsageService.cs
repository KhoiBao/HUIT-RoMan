using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Usage.DTOs;
using HUIT_RoMan.Application.Modules.WorkingHours.Services;
using HUIT_RoMan.Domain.Entities;

namespace HUIT_RoMan.Application.Modules.Usage.Services
{
    public class UsageService : IUsageService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUser;
        private readonly IStoredProcedureService _storedProcedureService;
        private readonly IRepository<UsageSession> _usageRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<Domain.Entities.User> _userRepo;
        private readonly IRepository<Period> _periodRepo;
        private readonly IRepository<BookingExtension> _bookingExtensionRepo;
        private readonly ILibraryWorkingHoursProvider? _workingHours;

        public UsageService(
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUser,
            IStoredProcedureService storedProcedureService,
            ILibraryWorkingHoursProvider? workingHours = null)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
            _storedProcedureService = storedProcedureService;
            _workingHours = workingHours;
            _usageRepo = _unitOfWork.Repository<UsageSession>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _userRepo = _unitOfWork.Repository<Domain.Entities.User>();
            _periodRepo = _unitOfWork.Repository<Period>();
            _bookingExtensionRepo = _unitOfWork.Repository<BookingExtension>();
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ALL SESSIONS WITH FILTERING
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<List<UsageSessionDto>>> GetAllSessionsAsync(UsageSessionQueryDto query)
        {
            // Tự động đồng bộ tạo UsageSession cho các BookingDetail đã duyệt mà chưa có phiên
            await SyncApprovedBookingDetailsAsync();

            var sessions = await _usageRepo.GetAllAsync(
                s => s.User,
                s => s.BookingDetail,
                s => s.BookingDetail.Booking,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.Room.RoomType,
                s => s.BookingDetail.StartPeriod,
                s => s.BookingDetail.EndPeriod
            );

            var queryable = sessions;

            // Phân quyền: Nhân sự chỉ xem phòng thuộc đơn vị của mình (nếu có DepartmentId)
            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                queryable = queryable.Where(s =>
                    s.BookingDetail?.Room?.RoomType?.DepartmentId == _currentUser.DepartmentId.Value);
            }

            // Lọc theo trạng thái
            if (!string.IsNullOrWhiteSpace(query.Status) && query.Status != "ALL")
            {
                var targetStatus = query.Status.Trim();
                queryable = queryable.Where(s => s.Status.Equals(targetStatus, StringComparison.OrdinalIgnoreCase));
            }

            // Lọc theo phòng
            if (query.RoomId.HasValue)
            {
                queryable = queryable.Where(s => s.BookingDetail != null && s.BookingDetail.RoomId == query.RoomId.Value);
            }

            // Lọc theo ngày
            if (query.Date.HasValue)
            {
                var targetDate = query.Date.Value.Date;
                queryable = queryable.Where(s =>
                    s.BookingDetail != null && s.BookingDetail.StartAt.Date == targetDate);
            }

            // Lọc theo từ khóa tìm kiếm (mã xác nhận, tên phòng, mã phòng, người mượn, MSSV)
            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var keyword = query.Search.Trim().ToLower();
                queryable = queryable.Where(s =>
                    (s.ConfirmationCode != null && s.ConfirmationCode.ToLower().Contains(keyword)) ||
                    (s.BookingDetail?.Room?.Name != null && s.BookingDetail.Room.Name.ToLower().Contains(keyword)) ||
                    (s.BookingDetail?.Room?.RoomCode != null && s.BookingDetail.Room.RoomCode.ToLower().Contains(keyword)) ||
                    (s.User?.FullName != null && s.User.FullName.ToLower().Contains(keyword)) ||
                    (s.User?.CardCode != null && s.User.CardCode.ToLower().Contains(keyword)) ||
                    (s.User?.UserName != null && s.User.UserName.ToLower().Contains(keyword)) ||
                    (s.BookingDetail?.Booking?.ActivityName != null && s.BookingDetail.Booking.ActivityName.ToLower().Contains(keyword))
                );
            }

            var result = queryable
                .OrderByDescending(s => s.BookingDetail != null ? s.BookingDetail.StartAt : s.CreatedAt)
                .Select(MapToDto)
                .ToList();

            return ApiResponse<List<UsageSessionDto>>.SuccessResponse(result);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET ACTIVE SESSIONS (Đang sử dụng)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<List<UsageSessionDto>>> GetActiveSessionsAsync()
        {
            var sessions = await _usageRepo.FindAsync(
                s => s.Status == "Đang sử dụng",
                s => s.User,
                s => s.BookingDetail,
                s => s.BookingDetail.Booking,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.Room.RoomType,
                s => s.BookingDetail.StartPeriod,
                s => s.BookingDetail.EndPeriod
            );

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                sessions = sessions.Where(s =>
                    s.BookingDetail?.Room?.RoomType?.DepartmentId == _currentUser.DepartmentId.Value);
            }

            var dtos = sessions
                .OrderByDescending(s => s.ActualCheckIn ?? s.CreatedAt)
                .Select(MapToDto)
                .ToList();

            return ApiResponse<List<UsageSessionDto>>.SuccessResponse(dtos);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET MY SESSIONS (Dành cho Sinh viên / Giảng viên)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<List<UsageSessionDto>>> GetMySessionsAsync()
        {
            if (_currentUser.UserId == null)
                return ApiResponse<List<UsageSessionDto>>.ErrorResponse("Bạn chưa đăng nhập.");

            await SyncApprovedBookingDetailsAsync();

            var currentUserId = _currentUser.UserId.Value;
            var sessions = await _usageRepo.GetAllAsync(
                s => s.User,
                s => s.BookingDetail,
                s => s.BookingDetail.Booking,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.StartPeriod,
                s => s.BookingDetail.EndPeriod
            );

            var mySessions = sessions
                .Where(s => s.UserId == currentUserId || (s.BookingDetail?.Booking != null && s.BookingDetail.Booking.UserId == currentUserId))
                .OrderByDescending(s => s.BookingDetail != null ? s.BookingDetail.StartAt : s.CreatedAt)
                .Select(MapToDto)
                .ToList();

            return ApiResponse<List<UsageSessionDto>>.SuccessResponse(mySessions);
        }

        // ─────────────────────────────────────────────────────────────────
        // GET BY ID
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<UsageSessionDto>> GetByIdAsync(int id)
        {
            var session = await _usageRepo.GetByIdAsync(
                id,
                s => s.User,
                s => s.BookingDetail,
                s => s.BookingDetail.Booking,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.Room.RoomType,
                s => s.BookingDetail.StartPeriod,
                s => s.BookingDetail.EndPeriod
            );

            if (session == null)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Không tìm thấy phiên sử dụng phòng.");

            return ApiResponse<UsageSessionDto>.SuccessResponse(MapToDto(session));
        }

        // ─────────────────────────────────────────────────────────────────
        // GET BY CONFIRMATION CODE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<UsageSessionDto>> GetByConfirmationCodeAsync(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
                return ApiResponse<UsageSessionDto>.ErrorResponse("Vui lòng cung cấp mã xác nhận.");

            var cleanCode = code.Trim().ToUpper();
            var session = await _usageRepo.FirstOrDefaultAsync(
                s => s.ConfirmationCode == cleanCode,
                s => s.User,
                s => s.BookingDetail,
                s => s.BookingDetail.Booking,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.Room.RoomType,
                s => s.BookingDetail.StartPeriod,
                s => s.BookingDetail.EndPeriod
            );

            if (session == null)
                return ApiResponse<UsageSessionDto>.ErrorResponse($"Không tìm thấy phiên sử dụng có mã '{code}'.");

            return ApiResponse<UsageSessionDto>.SuccessResponse(MapToDto(session));
        }

        // ─────────────────────────────────────────────────────────────────
        // GET SUMMARY TODAY
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<UsageSummaryDto>> GetSummaryTodayAsync()
        {
            await SyncApprovedBookingDetailsAsync();

            var today = DateTime.UtcNow.Date;
            var sessions = await _usageRepo.GetAllAsync(
                s => s.BookingDetail,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.Room.RoomType
            );

            var queryable = sessions;

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                queryable = queryable.Where(s =>
                    s.BookingDetail?.Room?.RoomType?.DepartmentId == _currentUser.DepartmentId.Value);
            }

            var todaySessions = queryable
                .Where(s => s.BookingDetail != null && s.BookingDetail.StartAt.Date == today)
                .ToList();

            var summary = new UsageSummaryDto
            {
                TotalToday = todaySessions.Count,
                InUseCount = todaySessions.Count(s => s.Status == "Đang sử dụng"),
                PendingCheckInCount = todaySessions.Count(s => s.Status == "Chờ nhận phòng"),
                CompletedCount = todaySessions.Count(s => s.Status == "Hoàn thành"),
                CancelledCount = todaySessions.Count(s => s.Status == "Đã hủy")
            };

            return ApiResponse<UsageSummaryDto>.SuccessResponse(summary);
        }

        // ─────────────────────────────────────────────────────────────────
        // CHECK-IN (Bắt đầu sử dụng phòng)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<UsageSessionDto>> CheckInAsync(CheckInRequestDto request)
        {
            UsageSession? session = null;

            if (request.UsageSessionId.HasValue)
            {
                session = await _usageRepo.GetByIdAsync(
                    request.UsageSessionId.Value,
                    s => s.User,
                    s => s.BookingDetail,
                    s => s.BookingDetail.Booking,
                    s => s.BookingDetail.Room,
                    s => s.BookingDetail.Room.RoomType
                );
            }
            else if (!string.IsNullOrWhiteSpace(request.ConfirmationCode))
            {
                var code = request.ConfirmationCode.Trim().ToUpper();
                session = await _usageRepo.FirstOrDefaultAsync(
                    s => s.ConfirmationCode == code,
                    s => s.User,
                    s => s.BookingDetail,
                    s => s.BookingDetail.Booking,
                    s => s.BookingDetail.Room,
                    s => s.BookingDetail.Room.RoomType
                );
            }
            else if (request.BookingDetailId.HasValue)
            {
                session = await _usageRepo.FirstOrDefaultAsync(
                    s => s.BookingDetailId == request.BookingDetailId.Value,
                    s => s.User,
                    s => s.BookingDetail,
                    s => s.BookingDetail.Booking,
                    s => s.BookingDetail.Room,
                    s => s.BookingDetail.Room.RoomType
                );

                // Nếu chưa có UsageSession cho BookingDetail này, kiểm tra và tạo mới
                if (session == null)
                {
                    var detail = await _bookingDetailRepo.GetByIdAsync(
                        request.BookingDetailId.Value,
                        bd => bd.Booking,
                        bd => bd.Room,
                        bd => bd.Room.RoomType
                    );

                    if (detail == null)
                        return ApiResponse<UsageSessionDto>.ErrorResponse("Chi tiết đặt phòng không tồn tại.");

                    if (detail.Status != "Đã duyệt")
                        return ApiResponse<UsageSessionDto>.ErrorResponse("Chỉ có thể Check-in cho phòng đã được duyệt phê duyệt.");

                    session = new UsageSession
                    {
                        BookingDetailId = detail.Id,
                        UserId = detail.Booking?.UserId ?? (_currentUser.UserId ?? 1),
                        Status = "Chờ nhận phòng",
                        ConfirmationCode = GenerateConfirmationCode(detail.Room?.RoomCode),
                        CreatedAt = DateTime.UtcNow
                    };
                    await _usageRepo.AddAsync(session);
                    await _unitOfWork.SaveChangesAsync();

                    // Reload with includes
                    session = await _usageRepo.GetByIdAsync(
                        session.Id,
                        s => s.User,
                        s => s.BookingDetail,
                        s => s.BookingDetail.Booking,
                        s => s.BookingDetail.Room,
                        s => s.BookingDetail.Room.RoomType
                    );
                }
            }

            if (session == null)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Không tìm thấy phiên sử dụng phòng để Check-in.");

            // Kiểm tra phân quyền:
            // 1. Admin: toàn quyền check-in.
            // 2. Nhân sự (Employee): kiểm tra theo đơn vị (nếu có DepartmentId).
            // 3. Người dùng thông thường (Sinh viên, Giảng viên): chỉ được check-in cho đơn mượn của chính mình!
            if (!_currentUser.IsAdmin && (_currentUser.Role != "Employee" && _currentUser.Role != "Manager"))
            {
                var sessionOwnerId = session.UserId != 0 ? session.UserId : (session.BookingDetail?.Booking?.UserId ?? 0);
                if (sessionOwnerId != _currentUser.UserId)
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Bạn chỉ có quyền nhận phòng cho đơn mượn của chính mình.");
            }
            else if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                var deptId = session.BookingDetail?.Room?.RoomType?.DepartmentId;
                if (deptId != _currentUser.DepartmentId.Value)
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Bạn chỉ có quyền quản lý nhận phòng thuộc đơn vị của mình.");
            }

            if (session.Status == "Đang sử dụng")
                return ApiResponse<UsageSessionDto>.ErrorResponse("Phòng này hiện đã được Check-in đang sử dụng.");

            if (session.Status == "Hoàn thành")
                return ApiResponse<UsageSessionDto>.ErrorResponse("Phiên sử dụng phòng này đã hoàn tất trước đó.");

            if (session.Status == "Đã hủy")
                return ApiResponse<UsageSessionDto>.ErrorResponse("Phiên sử dụng phòng này đã bị hủy.");

            // ── Quy định nhận phòng (áp dụng cho mọi đường check-in: nút Nhận phòng,
            // check-in theo từng chi tiết, mã nhận phòng nhanh) ──────────────────
            if (session.BookingDetail != null)
            {
                var policyBooking = session.BookingDetail.Booking
                    ?? await _bookingRepo.GetByIdAsync(session.BookingDetail.BookingId);

                if (policyBooking != null && policyBooking.Status == "Đã hủy")
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Đơn đặt phòng đã bị hủy, không thể nhận phòng.");

                var isStaffForPolicy = _currentUser.IsAdmin || (_currentUser.Role == "Employee" || _currentUser.Role == "Manager");
                if (!isStaffForPolicy && policyBooking != null)
                {
                    // Không nhận phòng lần hai: đơn đã được nhận (trừ khi chính phiên này đang dùng).
                    if (policyBooking.CheckedInAt != null
                        && session.Status != "Đang sử dụng"
                        && !request.InternalBookingCheckIn)
                        return ApiResponse<UsageSessionDto>.ErrorResponse("Đơn đặt phòng này đã được nhận phòng trước đó.");

                    // Sinh viên chỉ được nhận phòng trong cửa sổ [T - 15 phút, T).
                    var windowError = BookingCheckInPolicy.ValidateWindow(session.BookingDetail.StartAt, DateTime.UtcNow);
                    if (windowError != null)
                        return ApiResponse<UsageSessionDto>.ErrorResponse(windowError);
                }
            }

            // Kiểm tra phòng có đang bị bảo trì không
            var room = session.BookingDetail?.Room ?? await _roomRepo.GetByIdAsync(session.BookingDetail?.RoomId ?? 0);
            if (room != null && (room.Status == "Bảo trì" || room.Status == "Maintenance"))
            {
                return ApiResponse<UsageSessionDto>.ErrorResponse($"Phòng {room.RoomCode} đang trong tình trạng bảo trì, không thể nhận phòng.");
            }

            // Thực hiện Check-in
            var checkInTime = request.ActualCheckIn ?? DateTime.UtcNow;
            session.ActualCheckIn = DateTime.SpecifyKind(checkInTime, DateTimeKind.Utc);
            var actualGuestCount = request.ActualGuestCount ?? session.BookingDetail?.GuestCount;
            if (!actualGuestCount.HasValue || actualGuestCount.Value <= 0)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Số người thực tế phải lớn hơn 0.");
            if (room != null && actualGuestCount.Value > room.Capacity)
                return ApiResponse<UsageSessionDto>.ErrorResponse($"Số người thực tế ({actualGuestCount}) vượt sức chứa phòng ({room.Capacity}).");

            session.ActualGuestCount = actualGuestCount.Value;
            session.StaffNote = string.IsNullOrWhiteSpace(request.StaffNote) ? session.StaffNote : request.StaffNote.Trim();
            session.Status = "Đang sử dụng";
            _usageRepo.Update(session);

            if (session.BookingDetail != null)
            {
                session.BookingDetail.Status = "Đang sử dụng";
                _bookingDetailRepo.Update(session.BookingDetail);

                var booking = await _bookingRepo.GetByIdAsync(session.BookingDetail.BookingId);
                if (booking != null)
                {
                    if (booking.Status != "Đang sử dụng")
                    {
                        booking.Status = "Đang sử dụng";
                    }
                    // Ghi nhận thời điểm nhận phòng ở cấp đơn (chống check-in lặp và chống auto-cancel).
                    booking.CheckedInAt ??= DateTime.SpecifyKind(checkInTime, DateTimeKind.Utc);
                    _bookingRepo.Update(booking);
                }
            }

            if (room != null)
            {
                room.Status = "Đang sử dụng";
                _roomRepo.Update(room);
            }

            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<UsageSessionDto>.SuccessResponse(
                MapToDto(session),
                $"Check-in thành công cho phòng {room?.RoomCode ?? ""}! Chuyển trạng thái sang 'Đang sử dụng'."
            );
        }

        // ─────────────────────────────────────────────────────────────────
        // CHECK-OUT (Xác nhận trả phòng & Khảo sát bàn giao)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<UsageSessionDto>> CheckOutAsync(CheckOutRequestDto request)
        {
            UsageSession? session = null;

            if (request.UsageSessionId > 0)
            {
                session = await _usageRepo.GetByIdAsync(
                    request.UsageSessionId,
                    s => s.User,
                    s => s.BookingDetail,
                    s => s.BookingDetail.Booking,
                    s => s.BookingDetail.Room,
                    s => s.BookingDetail.Room.RoomType
                );
            }
            else if (request.BookingDetailId.HasValue)
            {
                session = await _usageRepo.FirstOrDefaultAsync(
                    s => s.BookingDetailId == request.BookingDetailId.Value,
                    s => s.User,
                    s => s.BookingDetail,
                    s => s.BookingDetail.Booking,
                    s => s.BookingDetail.Room,
                    s => s.BookingDetail.Room.RoomType
                );
            }

            if (session == null)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Không tìm thấy phiên sử dụng phòng.");

            // Kiểm tra phân quyền:
            if (!_currentUser.IsAdmin && (_currentUser.Role != "Employee" && _currentUser.Role != "Manager"))
            {
                var sessionOwnerId = session.UserId != 0 ? session.UserId : (session.BookingDetail?.Booking?.UserId ?? 0);
                if (sessionOwnerId != _currentUser.UserId)
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Bạn chỉ có quyền xác nhận trả phòng cho đơn mượn của chính mình.");
            }
            else if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                var deptId = session.BookingDetail?.Room?.RoomType?.DepartmentId;
                if (deptId != _currentUser.DepartmentId.Value)
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Bạn chỉ có quyền xác nhận trả phòng thuộc đơn vị của mình.");
            }

            if (session.Status == "Hoàn thành")
                return ApiResponse<UsageSessionDto>.ErrorResponse("Phiên sử dụng này đã được xác nhận trả phòng hoàn tất.");

            var checkOutTime = request.ActualCheckOut ?? DateTime.UtcNow;
            checkOutTime = DateTime.SpecifyKind(checkOutTime, DateTimeKind.Utc);

            // Xác định tình trạng phòng sau khi trả
            var roomCondition = (string.Equals(request.RoomCondition, "Bảo trì", StringComparison.OrdinalIgnoreCase) || !request.DevicesOk)
                ? "Bảo trì"
                : "Trống";

            // Cập nhật Entity thông qua EF Core
            session.ActualCheckOut = checkOutTime;
            session.Status = "Hoàn thành";
            session.StaffNote = string.IsNullOrWhiteSpace(request.StaffNote) ? session.StaffNote : request.StaffNote.Trim();
            session.DevicesOk = request.DevicesOk;
            session.Cleaned = request.Cleaned;
            session.LightsOff = request.LightsOff;
            _usageRepo.Update(session);

            if (session.BookingDetail != null)
            {
                session.BookingDetail.Status = "Hoàn thành";
                _bookingDetailRepo.Update(session.BookingDetail);

                // Cập nhật trạng thái phòng
                var room = session.BookingDetail.Room ?? await _roomRepo.GetByIdAsync(session.BookingDetail.RoomId);
                if (room != null)
                {
                    room.Status = roomCondition;
                    if (roomCondition == "Bảo trì" && !string.IsNullOrWhiteSpace(request.StaffNote))
                    {
                        room.Description = string.IsNullOrWhiteSpace(room.Description)
                            ? $"[Bảo trì lúc {checkOutTime:dd/MM/yyyy HH:mm}] {request.StaffNote}"
                            : $"{room.Description} | [Bảo trì lúc {checkOutTime:dd/MM/yyyy HH:mm}] {request.StaffNote}";
                    }
                    _roomRepo.Update(room);
                }

                // Kiểm tra xem đơn cha (Booking) có tất cả các phòng đã hoàn thành chưa
                var booking = await _bookingRepo.GetByIdAsync(session.BookingDetail.BookingId, b => b.BookingDetails);
                if (booking != null && booking.BookingDetails.All(d => d.Status == "Hoàn thành" || d.Status == "Từ chối" || d.Status == "Đã hủy"))
                {
                    booking.Status = "Hoàn thành";
                    _bookingRepo.Update(booking);
                }
            }

            await _unitOfWork.SaveChangesAsync();

            // Đồng thời kích hoạt Stored Procedure sp_process_room_checkout trong DB (nếu có sẵn)
            try
            {
                await _storedProcedureService.ProcessRoomCheckoutAsync(session.Id, checkOutTime, roomCondition);
            }
            catch (Exception ex)
            {
                // Stored procedure gọi bổ trợ; nếu DB đã commit qua EF Core thì log warning và vẫn thành công
                System.Diagnostics.Debug.WriteLine($"Stored procedure sp_process_room_checkout notice: {ex.Message}");
            }

            var noteMsg = roomCondition == "Bảo trì"
                ? "Ghi nhận trả phòng thành công! Phòng đã được chuyển sang trạng thái 'Bảo trì' để kỹ thuật xử lý sự cố thiết bị."
                : $"Ghi nhận trả phòng #{session.BookingDetail?.Room?.RoomCode ?? ""} thành công! Phòng đã sẵn sàng đón lượt sử dụng mới.";

            return ApiResponse<UsageSessionDto>.SuccessResponse(MapToDto(session), noteMsg);
        }

        // ─────────────────────────────────────────────────────────────────
        // EXTEND ACTIVE USAGE
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<UsageSessionDto>> ExtendAsync(int usageSessionId, ExtendUsageSessionRequestDto request)
        {
            var session = await _usageRepo.GetByIdAsync(
                usageSessionId,
                s => s.User,
                s => s.BookingDetail,
                s => s.BookingDetail.Booking,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.Room.RoomType,
                s => s.BookingDetail.Room.RoomType.Department,
                s => s.BookingDetail.EndPeriod);

            if (session?.BookingDetail == null)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Không tìm thấy phiên sử dụng phòng.");

            if (session.Status != "Đang sử dụng")
                return ApiResponse<UsageSessionDto>.ErrorResponse("Chỉ có thể gia hạn phiên đang sử dụng.");

            var detail = session.BookingDetail;
            var room = detail.Room;
            if (room == null)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Không tìm thấy phòng của phiên sử dụng.");

            if (!_currentUser.IsAdmin && _currentUser.Role != "Employee")
            {
                if (_currentUser.UserId != session.UserId)
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Bạn chỉ có thể gia hạn phòng của đơn mượn của mình.");
            }
            else if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue
                     && room.RoomType?.DepartmentId != _currentUser.DepartmentId.Value)
            {
                return ApiResponse<UsageSessionDto>.ErrorResponse("Bạn chỉ có quyền gia hạn phòng thuộc đơn vị mình quản lý.");
            }

            DateTime newEndAt;
            int? newEndPeriodId = null;
            if (room.RoomType?.IsBookingByPeriod == true)
            {
                if (!request.NewEndPeriodId.HasValue || request.NewEndAt.HasValue)
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Phòng đặt theo tiết yêu cầu NewEndPeriodId và không nhận NewEndAt.");

                var period = await _periodRepo.GetByIdAsync(request.NewEndPeriodId.Value);
                if (period == null || (period.RoomTypeId.HasValue && period.RoomTypeId != room.RoomTypeId))
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Tiết kết thúc không thuộc lịch của loại phòng này.");

                var localStartDate = detail.StartAt.ToUniversalTime().AddHours(7).Date;
                newEndAt = DateTime.SpecifyKind(localStartDate.Add(period.EndTime).AddHours(-7), DateTimeKind.Utc);
                newEndPeriodId = period.Id;
            }
            else
            {
                if (!request.NewEndAt.HasValue || request.NewEndPeriodId.HasValue)
                    return ApiResponse<UsageSessionDto>.ErrorResponse("Phòng đặt theo giờ yêu cầu NewEndAt và không nhận NewEndPeriodId.");
                newEndAt = DateTime.SpecifyKind(request.NewEndAt.Value.ToUniversalTime(), DateTimeKind.Utc);
            }

            if (newEndAt <= detail.EndAt)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Thời gian gia hạn phải sau giờ kết thúc hiện tại.");
            if (newEndAt <= DateTime.UtcNow)
                return ApiResponse<UsageSessionDto>.ErrorResponse("Thời gian kết thúc mới phải ở tương lai.");

            var isLibraryRoom = string.Equals(
                room.RoomType?.Department?.Type, "Library", StringComparison.OrdinalIgnoreCase);
            if (_workingHours != null && isLibraryRoom)
            {
                var week = await _workingHours.GetWeekAsync();
                var hoursError = _workingHours.Validate(week, detail.StartAt, newEndAt);
                if (hoursError != null)
                    return ApiResponse<UsageSessionDto>.ErrorResponse(hoursError);
            }

            var conflicts = await _bookingDetailRepo.FindAsync(d =>
                d.Id != detail.Id
                && d.RoomId == detail.RoomId
                && d.Status != "Từ chối"
                && d.Status != "Đã hủy"
                && d.StartAt < newEndAt
                && d.EndAt > detail.EndAt);
            if (conflicts.Any())
                return ApiResponse<UsageSessionDto>.ErrorResponse("Không thể gia hạn vì phòng đã có lịch kế tiếp bị trùng.");

            var previousEndAt = detail.EndAt;
            var previousEndPeriodId = detail.EndPeriodId;
            detail.EndAt = newEndAt;
            detail.EndPeriodId = newEndPeriodId;
            _bookingDetailRepo.Update(detail);
            session.StaffNote = string.IsNullOrWhiteSpace(request.StaffNote) ? session.StaffNote : request.StaffNote.Trim();
            _usageRepo.Update(session);
            await _bookingExtensionRepo.AddAsync(new BookingExtension
            {
                BookingDetailId = detail.Id,
                UsageSessionId = session.Id,
                PreviousEndAt = previousEndAt,
                NewEndAt = newEndAt,
                PreviousEndPeriodId = previousEndPeriodId,
                NewEndPeriodId = newEndPeriodId,
                RequestedByUserId = _currentUser.UserId ?? session.UserId,
                RequestedAt = DateTime.UtcNow,
                Status = "Đã áp dụng",
                Note = string.IsNullOrWhiteSpace(request.StaffNote) ? null : request.StaffNote.Trim(),
                CreatedAt = DateTime.UtcNow
            });

            try
            {
                await _unitOfWork.SaveChangesAsync();
            }
            catch (HUIT_RoMan.Application.Common.Exceptions.ScheduleConflictException)
            {
                return ApiResponse<UsageSessionDto>.ErrorResponse("Phòng vừa có lịch mới trong thời gian gia hạn. Vui lòng chọn thời điểm khác.");
            }

            return ApiResponse<UsageSessionDto>.SuccessResponse(MapToDto(session), "Gia hạn phòng thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // CANCEL NO-SHOW (Hủy do không đến nhận phòng)
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> CancelNoShowAsync(int usageSessionId, string? reason = null)
        {
            var session = await _usageRepo.GetByIdAsync(
                usageSessionId,
                s => s.BookingDetail,
                s => s.BookingDetail.Room,
                s => s.BookingDetail.Room.RoomType
            );

            if (session == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy phiên sử dụng.");

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                var deptId = session.BookingDetail?.Room?.RoomType?.DepartmentId;
                if (deptId != _currentUser.DepartmentId.Value)
                    return ApiResponse<bool>.ErrorResponse("Bạn chỉ có quyền hủy phiên thuộc đơn vị của mình.");
            }

            if (session.Status != "Chờ nhận phòng")
                return ApiResponse<bool>.ErrorResponse("Chỉ có thể hủy No-show cho phiên đang ở trạng thái 'Chờ nhận phòng'.");

            session.Status = "Đã hủy";
            _usageRepo.Update(session);

            if (session.BookingDetail != null)
            {
                session.BookingDetail.Status = "Đã hủy";
                session.BookingDetail.RejectionReason = reason ?? "Hủy do không nhận phòng (No-show quá 15 phút)";
                _bookingDetailRepo.Update(session.BookingDetail);

                var room = session.BookingDetail.Room ?? await _roomRepo.GetByIdAsync(session.BookingDetail.RoomId);
                if (room != null && room.Status == "Đang sử dụng")
                {
                    room.Status = "Trống";
                    _roomRepo.Update(room);
                }
            }

            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<bool>.SuccessResponse(true, "Đã hủy phiên mượn phòng do quá giờ không nhận (No-show).");
        }

        // ─────────────────────────────────────────────────────────────────
        // ENSURE SESSION FOR BOOKING DETAIL
        // ─────────────────────────────────────────────────────────────────
        public async Task EnsureSessionForBookingDetailAsync(int bookingDetailId)
        {
            var existing = await _usageRepo.FirstOrDefaultAsync(s => s.BookingDetailId == bookingDetailId);
            if (existing != null) return;

            var detail = await _bookingDetailRepo.GetByIdAsync(bookingDetailId, bd => bd.Booking, bd => bd.Room);
            if (detail == null || detail.Status != "Đã duyệt") return;

            var session = new UsageSession
            {
                BookingDetailId = detail.Id,
                UserId = detail.Booking?.UserId ?? (_currentUser.UserId ?? 1),
                Status = "Chờ nhận phòng",
                ConfirmationCode = GenerateConfirmationCode(detail.Room?.RoomCode),
                CreatedAt = DateTime.UtcNow
            };

            await _usageRepo.AddAsync(session);
            await _unitOfWork.SaveChangesAsync();
        }

        // ─────────────────────────────────────────────────────────────────
        // HELPER: Đồng bộ các BookingDetail đã duyệt sang UsageSession
        // ─────────────────────────────────────────────────────────────────
        private async Task SyncApprovedBookingDetailsAsync()
        {
            try
            {
                var approvedDetails = await _bookingDetailRepo.FindAsync(
                    bd => bd.Status == "Đã duyệt" || bd.Status == "Đang sử dụng",
                    bd => bd.Booking,
                    bd => bd.Room
                );

                var existingSessionDetailIds = (await _usageRepo.GetAllAsync())
                    .Select(s => s.BookingDetailId)
                    .ToHashSet();

                bool anyAdded = false;
                foreach (var detail in approvedDetails)
                {
                    if (!existingSessionDetailIds.Contains(detail.Id))
                    {
                        var session = new UsageSession
                        {
                            BookingDetailId = detail.Id,
                            UserId = detail.Booking?.UserId ?? 1,
                            Status = detail.Status == "Đang sử dụng" ? "Đang sử dụng" : "Chờ nhận phòng",
                            ActualCheckIn = detail.Status == "Đang sử dụng" ? DateTime.UtcNow : null,
                            ConfirmationCode = GenerateConfirmationCode(detail.Room?.RoomCode),
                            CreatedAt = DateTime.UtcNow
                        };
                        await _usageRepo.AddAsync(session);
                        anyAdded = true;
                    }
                }

                if (anyAdded)
                {
                    await _unitOfWork.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"SyncApprovedBookingDetails error: {ex.Message}");
            }
        }

        private static string GenerateConfirmationCode(string? roomCode)
        {
            // Database has a unique constraint; a cryptographically strong 12-hex suffix
            // makes a collision practically impossible while keeping the code easy to enter.
            return $"HUIT-{Guid.NewGuid():N}"[..17].ToUpperInvariant();
        }

        private static UsageSessionDto MapToDto(UsageSession s)
        {
            return new UsageSessionDto
            {
                Id = s.Id,
                ActualCheckIn = s.ActualCheckIn,
                ActualCheckOut = s.ActualCheckOut,
                Status = s.Status ?? "Chờ nhận phòng",
                ConfirmationCode = s.ConfirmationCode ?? $"HUIT-{s.Id}",
                CreatedAt = s.CreatedAt,

                UserId = s.UserId,
                UserName = s.User?.UserName ?? string.Empty,
                UserFullName = s.User?.FullName ?? s.User?.UserName ?? "Người dùng HUIT",
                UserEmail = s.User?.Email ?? string.Empty,
                UserPhone = s.User?.PhoneNumber,
                UserCardCode = s.User?.CardCode ?? s.User?.UserName,

                BookingDetailId = s.BookingDetailId,
                BookingId = s.BookingDetail?.BookingId ?? 0,
                ActivityName = s.BookingDetail?.Booking?.ActivityName ?? "Sử dụng phòng học",
                Purpose = s.BookingDetail?.Purpose ?? s.BookingDetail?.Booking?.Purpose ?? string.Empty,
                GuestCount = s.BookingDetail?.GuestCount ?? 0,
                ActualGuestCount = s.ActualGuestCount,

                RoomId = s.BookingDetail?.RoomId ?? 0,
                RoomName = s.BookingDetail?.Room?.Name ?? string.Empty,
                RoomCode = s.BookingDetail?.Room?.RoomCode ?? string.Empty,
                Building = s.BookingDetail?.Room?.Building ?? string.Empty,
                Floor = s.BookingDetail?.Room?.Floor ?? string.Empty,
                RoomStatus = s.BookingDetail?.Room?.Status ?? "Trống",

                StartAt = s.BookingDetail?.StartAt ?? DateTime.MinValue,
                EndAt = s.BookingDetail?.EndAt ?? DateTime.MinValue,
                StartPeriodId = s.BookingDetail?.StartPeriodId,
                StartPeriodName = s.BookingDetail?.StartPeriod?.Name,
                EndPeriodId = s.BookingDetail?.EndPeriodId,
                EndPeriodName = s.BookingDetail?.EndPeriod?.Name,
                StaffNote = s.StaffNote
            };
        }
    }
}
