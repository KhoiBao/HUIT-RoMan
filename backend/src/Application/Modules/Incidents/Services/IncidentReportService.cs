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
    /// Quản lý Báo cáo sự cố & Lịch sử bảo trì:
    /// Toàn bộ thao tác CRUD, phân công kỹ thuật, thống kê KPI và mở lại phòng sau bảo trì
    /// được lưu trữ và đồng bộ 100% trên cơ sở dữ liệu PostgreSQL.
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
            if (string.IsNullOrWhiteSpace(request.Description))
            {
                return ApiResponse<IncidentReportDto>.ErrorResponse("Vui lòng nhập mô tả chi tiết sự cố cần xử lý.");
            }

            Domain.Entities.Room? room = null;
            if (request.RoomId.HasValue && request.RoomId.Value > 0)
            {
                room = await _roomRepo.GetByIdAsync(request.RoomId.Value);
            }

            if (room == null && !string.IsNullOrWhiteSpace(request.RoomCode))
            {
                var cleanCode = request.RoomCode.Trim();
                room = await _roomRepo.FirstOrDefaultAsync(r =>
                    r.RoomCode.ToLower() == cleanCode.ToLower());
            }

            int? bookingDetailId = request.BookingDetailId ?? request.SessionId;
            if (bookingDetailId.HasValue)
            {
                var detail = await _bookingDetailRepo.GetByIdAsync(bookingDetailId.Value, d => d.Booking);
                if (detail != null && room == null)
                {
                    room = await _roomRepo.GetByIdAsync(detail.RoomId);
                }
            }

            var dateStr = DateTime.UtcNow.ToString("yyyyMMdd");
            var allReports = (await _repo.GetAllAsync()).Cast<IncidentReport>().ToList();
            var countToday = allReports.Count(r => r.Code != null && r.Code.Contains(dateStr)) + 1;
            var seq = countToday.ToString("D3");
            var code = $"#SC-{dateStr}-{seq}";

            var title = !string.IsNullOrWhiteSpace(request.Title)
                ? request.Title.Trim()
                : (!string.IsNullOrWhiteSpace(request.Category) ? request.Category.Trim() : "Sự cố kỹ thuật");

            var status = !string.IsNullOrWhiteSpace(request.Status)
                ? IncidentReportStatuses.NormalizeStatus(request.Status)
                : (!string.IsNullOrWhiteSpace(request.AssignedTechnician)
                    ? IncidentReportStatuses.InMaintenance
                    : IncidentReportStatuses.Pending);

            User? reporter = null;
            if (_currentUser.UserId.HasValue)
            {
                reporter = await _userManager.FindByIdAsync(_currentUser.UserId.Value.ToString());
            }

            var reportedByName = !string.IsNullOrWhiteSpace(request.ReportedBy)
                ? request.ReportedBy.Trim()
                : (reporter?.FullName ?? reporter?.UserName ?? "Thủ thư trực ca");

            var now = DateTime.UtcNow;
            var incident = new IncidentReport
            {
                Code = code,
                TargetType = string.IsNullOrWhiteSpace(request.TargetType) ? "Phòng" : request.TargetType.Trim(),
                Category = string.IsNullOrWhiteSpace(request.Category) ? "Thiết bị hư hỏng" : request.Category.Trim(),
                Severity = string.IsNullOrWhiteSpace(request.Severity) ? "Khẩn cấp" : request.Severity.Trim(),
                EquipmentId = request.EquipmentId,
                EquipmentName = request.EquipmentName?.Trim(),
                Title = title,
                Status = status,
                Description = request.Description.Trim(),
                ReportedByName = reportedByName,
                ReporterPhone = request.ReporterPhone?.Trim(),
                AssignedTechnician = request.AssignedTechnician?.Trim(),
                TechnicianNote = request.TechnicianNote?.Trim(),
                RoomId = room?.Id,
                BookingDetailId = bookingDetailId,
                ReportedByUserId = _currentUser.UserId,
                ReportedAt = now,
                CreatedAt = now,
                StaffNote = string.Empty
            };

            await _repo.AddAsync(incident);

            // Tự động chuyển trạng thái phòng sang "Bảo trì" nếu được yêu cầu
            if (request.SetRoomMaintenance == true && room != null)
            {
                room.Status = "Bảo trì";
                _roomRepo.Update(room);
            }

            await _unitOfWork.SaveChangesAsync();

            if (room != null)
            {
                await NotifyStaffAsync(incident, room);
            }

            return ApiResponse<IncidentReportDto>.SuccessResponse(
                await MapAsync(incident), $"Đã lập phiếu sự cố {incident.Code} thành công!");
        }

        public async Task<ApiResponse<IncidentReportDto>> GetByIdAsync(int id)
        {
            var incident = await _repo.GetByIdAsync(id, r => r.Room, r => r.ReportedBy, r => r.ResolvedBy);
            if (incident == null)
            {
                return ApiResponse<IncidentReportDto>.ErrorResponse("Không tìm thấy phiếu báo cáo sự cố.");
            }
            return ApiResponse<IncidentReportDto>.SuccessResponse(await MapAsync(incident));
        }

        public async Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetMineAsync()
        {
            if (_currentUser.UserId == null)
            {
                return ApiResponse<IEnumerable<IncidentReportDto>>.ErrorResponse("Bạn cần đăng nhập để xem báo cáo sự cố của mình.");
            }

            var reports = (await _repo.FindAsync(
                r => r.ReportedByUserId == _currentUser.UserId.Value,
                r => r.Room,
                r => r.ReportedBy,
                r => r.ResolvedBy))
                .OrderByDescending(r => r.ReportedAt)
                .ToList();

            var mapped = new List<IncidentReportDto>();
            foreach (var r in reports) mapped.Add(await MapAsync(r));
            return ApiResponse<IEnumerable<IncidentReportDto>>.SuccessResponse(mapped);
        }

        public async Task<ApiResponse<IEnumerable<IncidentReportDto>>> GetAllAsync(
            string? status = null,
            string? category = null,
            string? severity = null,
            string? roomCode = null,
            string? keyword = null)
        {
            var reports = (await _repo.GetAllAsync(
                r => r.Room,
                r => r.ReportedBy,
                r => r.ResolvedBy)).Cast<IncidentReport>().ToList();

            IEnumerable<IncidentReport> query = reports;

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                var norm = IncidentReportStatuses.NormalizeStatus(status);
                query = query.Where(r => IncidentReportStatuses.NormalizeStatus(r.Status) == norm);
            }

            if (!string.IsNullOrWhiteSpace(category) && category != "ALL")
            {
                query = query.Where(r => string.Equals(r.Category, category.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(severity) && severity != "ALL")
            {
                query = query.Where(r => string.Equals(r.Severity, severity.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(roomCode) && roomCode != "ALL")
            {
                var rc = roomCode.Trim().ToLower();
                query = query.Where(r => (r.Room?.RoomCode ?? string.Empty).ToLower() == rc);
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var term = keyword.Trim().ToLower();
                query = query.Where(r =>
                    (r.Code ?? string.Empty).ToLower().Contains(term) ||
                    (r.Room?.RoomCode ?? string.Empty).ToLower().Contains(term) ||
                    (r.Room?.Name ?? string.Empty).ToLower().Contains(term) ||
                    (r.Description ?? string.Empty).ToLower().Contains(term) ||
                    (r.Title ?? string.Empty).ToLower().Contains(term) ||
                    (r.EquipmentName ?? string.Empty).ToLower().Contains(term) ||
                    (r.AssignedTechnician ?? string.Empty).ToLower().Contains(term) ||
                    (r.ReportedByName ?? string.Empty).ToLower().Contains(term) ||
                    (r.ReportedBy?.FullName ?? string.Empty).ToLower().Contains(term));
            }

            var ordered = query.OrderByDescending(r => r.ReportedAt).ToList();

            var mapped = new List<IncidentReportDto>();
            foreach (var r in ordered) mapped.Add(await MapAsync(r));
            return ApiResponse<IEnumerable<IncidentReportDto>>.SuccessResponse(mapped);
        }

        public async Task<ApiResponse<IncidentStatsDto>> GetStatsAsync()
        {
            var reports = (await _repo.GetAllAsync()).Cast<IncidentReport>().ToList();
            var stats = new IncidentStatsDto
            {
                Total = reports.Count,
                Pending = reports.Count(r => IncidentReportStatuses.IsPending(r.Status)),
                InMaintenance = reports.Count(r => IncidentReportStatuses.IsInMaintenance(r.Status)),
                Resolved = reports.Count(r => IncidentReportStatuses.IsResolved(r.Status)),
                Urgent = reports.Count(r =>
                    r.Severity == "Khẩn cấp" &&
                    !IncidentReportStatuses.IsResolved(r.Status) &&
                    r.Status != IncidentReportStatuses.Cancelled)
            };
            return ApiResponse<IncidentStatsDto>.SuccessResponse(stats);
        }

        public async Task<ApiResponse<IncidentReportDto>> UpdateAsync(int id, UpdateIncidentReportDto request)
        {
            var incident = await _repo.GetByIdAsync(id, r => r.Room, r => r.ReportedBy, r => r.ResolvedBy);
            if (incident == null)
            {
                return ApiResponse<IncidentReportDto>.ErrorResponse("Không tìm thấy phiếu báo cáo sự cố.");
            }

            if (!string.IsNullOrWhiteSpace(request.Category)) incident.Category = request.Category.Trim();
            if (!string.IsNullOrWhiteSpace(request.Severity)) incident.Severity = request.Severity.Trim();
            if (!string.IsNullOrWhiteSpace(request.Description)) incident.Description = request.Description.Trim();
            if (!string.IsNullOrWhiteSpace(request.EquipmentName)) incident.EquipmentName = request.EquipmentName.Trim();
            if (request.AssignedTechnician != null) incident.AssignedTechnician = request.AssignedTechnician.Trim();
            if (request.TechnicianNote != null) incident.TechnicianNote = request.TechnicianNote.Trim();
            if (request.RepairCost.HasValue) incident.RepairCost = request.RepairCost.Value;
            if (request.StaffNote != null) incident.StaffNote = request.StaffNote.Trim();

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var normStatus = IncidentReportStatuses.NormalizeStatus(request.Status);
                incident.Status = normStatus;

                if (normStatus == IncidentReportStatuses.Resolved && incident.ResolvedAt == null)
                {
                    incident.ResolvedAt = DateTime.UtcNow;
                    incident.ResolvedByUserId = _currentUser.UserId;
                }
            }

            incident.UpdatedAt = DateTime.UtcNow;

            // Nếu khắc phục xong và yêu cầu mở lại phòng
            if (request.RestoreRoomToAvailable == true &&
                IncidentReportStatuses.IsResolved(incident.Status) &&
                incident.RoomId.HasValue)
            {
                var room = await _roomRepo.GetByIdAsync(incident.RoomId.Value);
                if (room != null && room.Status == "Bảo trì")
                {
                    room.Status = "Trống";
                    _roomRepo.Update(room);
                }
            }

            _repo.Update(incident);
            await _unitOfWork.SaveChangesAsync();

            // Gửi thông báo cho người báo cáo nếu có liên kết user
            if (incident.ReportedByUserId.HasValue)
            {
                await _notificationService.CreateNotificationAsync(new CreateNotificationDto
                {
                    UserId = incident.ReportedByUserId.Value,
                    Title = $"Cập nhật sự cố {incident.Code}: {incident.Status}",
                    Content = $"Phiếu sự cố '{incident.Title}' tại phòng {incident.Room?.RoomCode ?? ""} đã được cập nhật trạng thái '{incident.Status}'.",
                    Type = NotificationType.General
                });
            }

            return ApiResponse<IncidentReportDto>.SuccessResponse(
                await MapAsync(incident), $"Đã cập nhật thông tin phiếu sự cố {incident.Code} thành công!");
        }

        public async Task<ApiResponse<IncidentReportDto>> UpdateStatusAsync(int id, UpdateIncidentReportStatusDto request)
        {
            return await UpdateAsync(id, new UpdateIncidentReportDto
            {
                Status = request.Status,
                StaffNote = request.StaffNote
            });
        }

        public async Task<ApiResponse<IncidentReportDto>> ResolveAsync(int id, ResolveIncidentReportDto request)
        {
            return await UpdateAsync(id, new UpdateIncidentReportDto
            {
                Status = IncidentReportStatuses.Resolved,
                TechnicianNote = request.TechnicianNote ?? "Đã hoàn tất kiểm tra, sửa chữa và nghiệm thu vận hành bình thường.",
                RepairCost = request.RepairCost,
                ResolvedBy = request.ResolvedBy ?? "Kỹ thuật viên Thư viện",
                RestoreRoomToAvailable = request.RestoreRoomToAvailable ?? true
            });
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            var incident = await _repo.GetByIdAsync(id);
            if (incident == null)
            {
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy phiếu báo cáo sự cố.");
            }

            incident.IsDeleted = true;
            incident.UpdatedAt = DateTime.UtcNow;
            _repo.Update(incident);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, $"Đã xóa phiếu sự cố {incident.Code} khỏi hệ thống.");
        }

        private async Task NotifyStaffAsync(IncidentReport incident, Domain.Entities.Room room)
        {
            try
            {
                var staffUserIds = new Dictionary<int, string>();
                foreach (var role in new[] { "Admin", "Manager", "Employee" })
                {
                    var roleUsers = await _userManager.GetUsersInRoleAsync(role);
                    foreach (var u in roleUsers.Where(u => !u.IsDeleted))
                        staffUserIds.TryAdd(u.Id, u.FullName);
                }

                var title = $"Sự cố mới tại {room.RoomCode} ({room.Name})";
                var content = $"{incident.ReportedByName ?? "Nhân viên"} đã báo cáo sự cố '{incident.Title}' ({incident.Category} - {incident.Severity}). Nội dung: {incident.Description}";

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
            catch
            {
                // Bỏ qua lỗi gửi thông báo để không gián đoạn luồng chính
            }
        }

        private async Task<IncidentReportDto> MapAsync(IncidentReport r)
        {
            var room = r.Room ?? (r.RoomId.HasValue ? await _roomRepo.GetByIdAsync(r.RoomId.Value) : null);

            string reportedByName = r.ReportedByName ?? r.ReportedBy?.FullName ?? string.Empty;
            string? reportedByCode = r.ReportedBy?.CardCode;

            var resolvedUser = r.ResolvedBy;
            if (r.ResolvedByUserId.HasValue && resolvedUser == null)
            {
                resolvedUser = await _userManager.FindByIdAsync(r.ResolvedByUserId.Value.ToString());
            }

            var resolvedByName = !string.IsNullOrWhiteSpace(r.AssignedTechnician)
                ? r.AssignedTechnician
                : (resolvedUser?.FullName ?? (r.ResolvedByUserId.HasValue ? $"KTV #{r.ResolvedByUserId}" : null));

            return new IncidentReportDto
            {
                Id = r.Id,
                Code = !string.IsNullOrWhiteSpace(r.Code) ? r.Code : $"#SC-{r.Id:D5}",
                TargetType = !string.IsNullOrWhiteSpace(r.TargetType) ? r.TargetType : "Phòng",
                RoomId = r.RoomId,
                RoomName = room?.Name ?? (r.RoomId.HasValue ? $"Phòng #{r.RoomId}" : string.Empty),
                RoomCode = room?.RoomCode ?? string.Empty,
                BookingDetailId = r.BookingDetailId,
                SessionId = r.BookingDetailId,
                EquipmentId = r.EquipmentId,
                EquipmentName = r.EquipmentName,
                Title = !string.IsNullOrWhiteSpace(r.Title) ? r.Title : r.Category,
                Category = !string.IsNullOrWhiteSpace(r.Category) ? r.Category : "Thiết bị hư hỏng",
                Severity = !string.IsNullOrWhiteSpace(r.Severity) ? r.Severity : "Khẩn cấp",
                Description = r.Description ?? string.Empty,
                Status = IncidentReportStatuses.NormalizeStatus(r.Status),
                ReportedBy = reportedByName,
                ReportedByName = reportedByName,
                ReportedByCode = reportedByCode,
                ReporterPhone = r.ReporterPhone,
                AssignedTechnician = r.AssignedTechnician,
                TechnicianNote = r.TechnicianNote,
                RepairCost = r.RepairCost,
                StaffNote = r.StaffNote ?? string.Empty,
                ReportedByUserId = r.ReportedByUserId,
                ReportedAt = r.ReportedAt,
                ResolvedByUserId = r.ResolvedByUserId,
                ResolvedByName = resolvedByName,
                ResolvedAt = r.ResolvedAt,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            };
        }
    }
}
