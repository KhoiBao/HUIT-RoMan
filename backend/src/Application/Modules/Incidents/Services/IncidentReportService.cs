using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Incidents.DTOs;
using HUIT_RoMan.Application.Modules.Notification.DTOs;
using HUIT_RoMan.Application.Modules.Notification.Services;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Incidents.Services
{
    /// <summary>
    /// Phiếu báo cáo sự cố / hư hỏng: người dùng tạo phiếu, nhân sự theo dõi và xử lý.
    /// Khi tạo phiếu, hệ thống tự gửi thông báo cho toàn bộ nhân sự có vai trò
    /// Admin / Manager / Employee để họ nhận biết sớm.
    /// </summary>
    public class IncidentReportService : IIncidentReportService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUser;
        private readonly UserManager<User> _userManager;
        private readonly INotificationService _notificationService;

        public IncidentReportService(
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUser,
            UserManager<User> userManager,
            INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
            _userManager = userManager;
            _notificationService = notificationService;
        }

        private IRepository<IncidentReport> _repo => _unitOfWork.Repository<IncidentReport>();
        private IRepository<Domain.Entities.Room> _roomRepo => _unitOfWork.Repository<Domain.Entities.Room>();
        private IRepository<BookingDetail> _bookingDetailRepo => _unitOfWork.Repository<BookingDetail>();

        public async Task<ApiResponse<IncidentReportDto>> CreateAsync(CreateIncidentReportDto request)
        {
            if (_currentUser.UserId == null)
                return ApiResponse<IncidentReportDto>.ErrorResponse("Bạn cần đăng nhập để báo cáo sự cố.");

            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Description))
                return ApiResponse<IncidentReportDto>.ErrorResponse(
                    "Vui lòng nhập hiện tượng gặp phải và mô tả chi tiết sự cố.");

            var room = await _roomRepo.GetByIdAsync(request.RoomId);
            if (room == null)
                return ApiResponse<IncidentReportDto>.ErrorResponse("Phòng không tồn tại.");

            if (request.BookingDetailId.HasValue)
            {
                var detail = await _bookingDetailRepo.GetByIdAsync(
                    request.BookingDetailId.Value, d => d.Booking);
                if (detail == null)
                    return ApiResponse<IncidentReportDto>.ErrorResponse(
                        "Không tìm thấy lần sử dụng phòng tương ứng.");

                var isOwner = detail.Booking?.UserId == _currentUser.UserId;
                var isStaff = _currentUser.IsStaff;
                if (!isOwner && !isStaff)
                    return ApiResponse<IncidentReportDto>.ErrorResponse(
                        "Báo cáo phải gắn với lần sử dụng phòng của chính bạn.");
            }

            var reporter = await _userManager.FindByIdAsync(_currentUser.UserId.Value.ToString());
            var now = DateTime.UtcNow;

            var incident = new IncidentReport
            {
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                Status = IncidentReportStatuses.New,
                RoomId = request.RoomId,
                BookingDetailId = request.BookingDetailId,
                ReportedByUserId = _currentUser.UserId.Value,
                ReportedBy = reporter,
                ReportedAt = now
            };

            await _repo.AddAsync(incident);
            await _unitOfWork.SaveChangesAsync();

            await NotifyStaffAsync(incident, room);
            return ApiResponse<IncidentReportDto>.SuccessResponse(
                await MapAsync(incident), "Đã gửi báo cáo sự cố cho nhân viên phụ trách. Cảm ơn bạn!");
        }

        public async Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetMineAsync()
        {
            if (_currentUser.UserId == null)
                return ApiResponse<IEnumerable<IncidentReportDto>>.ErrorResponse(
                    "Bạn cần đăng nhập để xem báo cáo sự cố của mình.");

            var reports = (await _repo.FindAsync(
                r => r.ReportedByUserId == _currentUser.UserId.Value))
                .OrderByDescending(r => r.ReportedAt)
                .ToList();

            var mapped = new List<IncidentReportDto>();
            foreach (var r in reports) mapped.Add(await MapAsync(r));
            return ApiResponse<IEnumerable<IncidentReportDto>>.SuccessResponse(mapped);
        }

        public async Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetAllAsync(string? status = null)
        {
            var reports = (await _repo.GetAllAsync(
                r => r.Room,
                r => r.ReportedBy,
                r => r.ResolvedBy)).Cast<IncidentReport>().ToList();

            IEnumerable<IncidentReport> query = reports;

            if (!string.IsNullOrWhiteSpace(status))
            {
                var valid = new[] { IncidentReportStatuses.New, IncidentReportStatuses.Processing, IncidentReportStatuses.Resolved };
                var matched = valid.FirstOrDefault(s => string.Equals(s, status.Trim(), StringComparison.OrdinalIgnoreCase));
                if (matched == null)
                {
                    var byLabel = IncidentReportStatuses.Labels.FirstOrDefault(
                        kv => string.Equals(kv.Value, status.Trim(), StringComparison.OrdinalIgnoreCase)).Key;
                    if (byLabel != null) matched = byLabel;
                }

                if (matched == null)
                    return ApiResponse<IEnumerable<IncidentReportDto>>.ErrorResponse(
                        $"Trạng thái không hợp lệ. Chỉ nhận: {IncidentReportStatuses.New}, {IncidentReportStatuses.Processing}, {IncidentReportStatuses.Resolved}.");

                query = query.Where(r => r.Status == matched);
            }

            var ordered = query.OrderByDescending(r => r.ReportedAt).ToList();

            var mapped = new List<IncidentReportDto>();
            foreach (var r in ordered) mapped.Add(await MapAsync(r));
            return ApiResponse<IEnumerable<IncidentReportDto>>.SuccessResponse(mapped);
        }

        public async Task<ApiResponse<IncidentReportDto>> UpdateStatusAsync(int id, UpdateIncidentReportStatusDto request)
        {
            var incident = await _repo.GetByIdAsync(id, r => r.Room, r => r.ReportedBy, r => r.ResolvedBy);
            if (incident == null)
                return ApiResponse<IncidentReportDto>.ErrorResponse("Không tìm thấy báo cáo sự cố.");

            var requested = (request.Status ?? string.Empty).Trim();
            var matched = new[] { IncidentReportStatuses.New, IncidentReportStatuses.Processing, IncidentReportStatuses.Resolved }
                .FirstOrDefault(s => string.Equals(s, requested, StringComparison.OrdinalIgnoreCase));
            if (matched == null)
            {
                var byLabel = IncidentReportStatuses.Labels.FirstOrDefault(
                    kv => string.Equals(kv.Value, requested, StringComparison.OrdinalIgnoreCase)).Key;
                if (byLabel != null) matched = byLabel;
            }

            if (matched == null)
                return ApiResponse<IncidentReportDto>.ErrorResponse(
                    $"Trạng thái không hợp lệ. Chỉ nhận: {IncidentReportStatuses.New}, {IncidentReportStatuses.Processing}, {IncidentReportStatuses.Resolved}.");

            incident.Status = matched;
            incident.StaffNote = string.IsNullOrWhiteSpace(request.StaffNote) ? incident.StaffNote : request.StaffNote!.Trim();
            incident.UpdatedAt = DateTime.UtcNow;

            if (matched == IncidentReportStatuses.Resolved && incident.ResolvedAt == null)
            {
                incident.ResolvedByUserId = _currentUser.UserId;
                incident.ResolvedAt = DateTime.UtcNow;
            }

            _repo.Update(incident);
            await _unitOfWork.SaveChangesAsync();

            // Báo lại cho người báo sự cố biết phiếu đã được xử lý.
            await _notificationService.CreateNotificationAsync(new CreateNotificationDto
            {
                UserId = incident.ReportedByUserId,
                Title = $"Sự cố tại {incident.Room?.Name ?? ("phòng #" + incident.RoomId)}: {matched}",
                Content = incident.Status == IncidentReportStatuses.Resolved
                    ? (string.IsNullOrEmpty(incident.StaffNote)
                        ? $"Báo cáo '{incident.Title}' đã được xử lý."
                        : $"Báo cáo '{incident.Title}' đã được xử lý. Ghi chú: {incident.StaffNote}")
                    : $"Báo cáo '{incident.Title}' đang được xử lý." + (string.IsNullOrEmpty(incident.StaffNote) ? "" : $" Ghi chú: {incident.StaffNote}"),
                Type = NotificationType.General
            });

            return ApiResponse<IncidentReportDto>.SuccessResponse(
                await MapAsync(incident), "Đã cập nhật trạng thái sự cố.");
        }

        private async Task NotifyStaffAsync(IncidentReport incident, Domain.Entities.Room room)
        {
            var staffUserIds = new Dictionary<int, string>();
            foreach (var role in new[] { "Admin", "Manager", "Employee" })
            {
                var roleUsers = await _userManager.GetUsersInRoleAsync(role);
                foreach (var u in roleUsers.Where(u => !u.IsDeleted))
                    staffUserIds.TryAdd(u.Id, u.FullName);
            }

            var title = $"Sự cố mới tại {room.Name}";
            var content = $"{incident.ReportedBy?.FullName ?? "Người dùng"} đã báo cáo: '{incident.Title}'. Nội dung: {incident.Description}. Vui lòng kiểm tra và xử lý.";

            foreach (var userId in staffUserIds.Keys)
            {
                await _notificationService.CreateNotificationAsync(new CreateNotificationDto
                {
                    UserId = userId,
                    Title = title,
                    Content = content,
                    Type = NotificationType.General
                });
            }
        }

        private async Task<IncidentReportDto> MapAsync(IncidentReport r)
        {
            var room = r.Room ?? await _roomRepo.GetByIdAsync(r.RoomId);

            string reportedByName = r.ReportedBy?.FullName ?? string.Empty;
            string? reportedByCode = r.ReportedBy?.CardCode;

            var resolvedUser = r.ResolvedBy;
            if (r.ResolvedByUserId.HasValue && resolvedUser == null)
                resolvedUser = await _userManager.FindByIdAsync(r.ResolvedByUserId.Value.ToString());

            return new IncidentReportDto
            {
                Id = r.Id,
                RoomId = r.RoomId,
                RoomName = room?.Name ?? $"Phòng #{r.RoomId}",
                RoomCode = room?.RoomCode ?? string.Empty,
                BookingDetailId = r.BookingDetailId,
                Title = r.Title,
                Description = r.Description,
                Status = r.Status,
                StaffNote = r.StaffNote,
                ReportedByUserId = r.ReportedByUserId,
                ReportedByName = reportedByName,
                ReportedByCode = reportedByCode,
                ReportedAt = r.ReportedAt,
                ResolvedByUserId = r.ResolvedByUserId,
                ResolvedByName = resolvedUser?.FullName,
                ResolvedAt = r.ResolvedAt
            };
        }
    }
}
