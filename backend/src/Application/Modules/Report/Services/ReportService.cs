using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Report.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HUIT_RoMan.Application.Modules.Report.Services
{
    public class ReportService : IReportService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<UsageSession> _usageSessionRepo;
        private readonly IRepository<ViolationRecord> _violationRecordRepo;
        private readonly IRepository<UserRestriction> _userRestrictionRepo;
        private readonly IRepository<Domain.Entities.Shift> _shiftRepo;
        private readonly IRepository<ShiftLog> _shiftLogRepo;
        private readonly IRepository<Employee> _employeeRepo;
        private readonly UserManager<User> _userManager;
        private readonly IStoredProcedureService _spService;
        private readonly ICurrentUserService _currentUser;

        public ReportService(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager,
            IStoredProcedureService spService,
            ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _usageSessionRepo = _unitOfWork.Repository<UsageSession>();
            _violationRecordRepo = _unitOfWork.Repository<ViolationRecord>();
            _userRestrictionRepo = _unitOfWork.Repository<UserRestriction>();
            _shiftRepo = _unitOfWork.Repository<Domain.Entities.Shift>();
            _shiftLogRepo = _unitOfWork.Repository<ShiftLog>();
            _employeeRepo = _unitOfWork.Repository<Employee>();
            _userManager = userManager;
            _spService = spService;
            _currentUser = currentUser;
        }

        // ─────────────────────────────────────────────────────────────────
        // 1. SYSTEM OVERVIEW
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<SystemOverviewReportDto>> GetSystemOverviewAsync(ReportFilterDto filter)
        {
            var targetDeptId = ResolveTargetDepartmentId(filter);
            var (from, to) = ResolveDateRange(filter);

            // 1. Rooms & Scope
            var allRooms = (await _roomRepo.GetAllAsync(r => r.RoomType, r => r.RoomType.Department)).ToList();
            HashSet<int>? deptRoomIds = null;
            if (targetDeptId.HasValue)
            {
                deptRoomIds = allRooms
                    .Where(r => r.RoomType?.DepartmentId == targetDeptId.Value)
                    .Select(r => r.Id)
                    .ToHashSet();
                allRooms = allRooms.Where(r => deptRoomIds.Contains(r.Id)).ToList();
            }

            int totalRooms = allRooms.Count;
            int activeRooms = allRooms.Count(r => r.Status != "Bảo trì" && r.Status != "Ngưng hoạt động");

            // 2. Bookings
            var allBookings = (await _bookingRepo.GetAllAsync(b => b.BookingDetails, b => b.User, b => b.User.Department))
                .Where(b => b.RequestedAt >= from && b.RequestedAt <= to)
                .ToList();

            List<Domain.Entities.Booking> bookings;
            if (deptRoomIds != null)
            {
                bookings = allBookings
                    .Where(b => b.BookingDetails != null && b.BookingDetails.Any(bd => deptRoomIds.Contains(bd.RoomId)))
                    .ToList();
            }
            else
            {
                bookings = allBookings;
            }

            long totalBookings = bookings.Count;
            long approved;
            long pending;
            long rejected;
            long cancelled;

            if (deptRoomIds != null)
            {
                approved = bookings.Count(b => b.BookingDetails != null && b.BookingDetails.Any(bd => deptRoomIds.Contains(bd.RoomId) && (bd.Status == "Đã duyệt" || bd.Status == "Approved")));
                pending = bookings.Count(b => b.BookingDetails != null && b.BookingDetails.Any(bd => deptRoomIds.Contains(bd.RoomId) && (bd.Status == "Chờ duyệt" || bd.Status == "Pending")));
                rejected = bookings.Count(b => b.BookingDetails != null && b.BookingDetails.All(bd => deptRoomIds.Contains(bd.RoomId) && (bd.Status == "Từ chối" || bd.Status == "Rejected")));
                cancelled = bookings.Count(b => (b.Status == "Đã hủy" || b.Status == "Cancelled") || (b.BookingDetails != null && b.BookingDetails.All(bd => deptRoomIds.Contains(bd.RoomId) && (bd.Status == "Đã hủy" || bd.Status == "Cancelled"))));
            }
            else
            {
                approved = bookings.Count(b => b.Status == "Đã duyệt" || b.Status == "Approved");
                pending = bookings.Count(b => b.Status == "Chờ duyệt" || b.Status == "Pending");
                rejected = bookings.Count(b => b.Status == "Từ chối" || b.Status == "Rejected");
                cancelled = bookings.Count(b => b.Status == "Đã hủy" || b.Status == "Cancelled");
            }

            // Phân loại nguồn hủy: sinh viên tự hủy / tự động hủy (no-show) / quản trị hủy.
            long cancelledByStudent = bookings.Count(b => (b.Status == "Đã hủy" || b.Status == "Cancelled") && b.CancelSource == BookingCancelPolicy.SourceStudent);
            long cancelledByNoShow = bookings.Count(b => (b.Status == "Đã hủy" || b.Status == "Cancelled") && b.CancelSource == BookingCancelPolicy.SourceAuto);
            long cancelledByStaff = bookings.Count(b => (b.Status == "Đã hủy" || b.Status == "Cancelled") && b.CancelSource == BookingCancelPolicy.SourceStaff);
            long cancelledUnknown = Math.Max(0, cancelled - cancelledByStudent - cancelledByNoShow - cancelledByStaff);
            double approvalRate = totalBookings > 0 ? Math.Round((double)approved / totalBookings * 100, 1) : 100.0;

            // 3. Sessions & Usage
            var sessions = (await _usageSessionRepo.GetAllAsync(s => s.BookingDetail))
                .Where(s => (s.ActualCheckIn ?? s.CreatedAt) >= from && (s.ActualCheckIn ?? s.CreatedAt) <= to)
                .ToList();

            if (deptRoomIds != null)
            {
                sessions = sessions.Where(s => s.BookingDetail != null && deptRoomIds.Contains(s.BookingDetail.RoomId)).ToList();
            }

            long totalRoomsUsed = sessions.Select(s => s.BookingDetail?.RoomId).Where(id => id.HasValue).Distinct().Count();
            if (totalRoomsUsed == 0 && approved > 0)
            {
                totalRoomsUsed = bookings.SelectMany(b => b.BookingDetails ?? Enumerable.Empty<BookingDetail>())
                    .Where(d => deptRoomIds == null || deptRoomIds.Contains(d.RoomId))
                    .Select(d => d.RoomId)
                    .Distinct()
                    .Count();
            }

            double totalHours = 0;
            foreach (var s in sessions)
            {
                var checkIn = s.ActualCheckIn ?? s.CreatedAt;
                var end = s.ActualCheckOut ?? (s.BookingDetail != null ? s.BookingDetail.EndAt : checkIn.AddHours(2));
                var dur = (end - checkIn).TotalHours;
                if (dur > 0 && dur < 24) totalHours += dur;
            }
            if (totalHours == 0 && approved > 0)
            {
                totalHours = bookings.Where(b => b.Status == "Đã duyệt" || b.Status == "Approved")
                    .SelectMany(b => b.BookingDetails ?? Enumerable.Empty<BookingDetail>())
                    .Where(d => deptRoomIds == null || deptRoomIds.Contains(d.RoomId))
                    .Sum(d => Math.Max(0.5, (d.EndAt - d.StartAt).TotalHours));
            }
            totalHours = Math.Round(totalHours, 1);
            double avgSessionHours = sessions.Count > 0 ? Math.Round(totalHours / sessions.Count, 1) : 2.0;

            double days = Math.Max(1, (to - from).TotalDays);
            double maxCapacityHours = Math.Max(1, activeRooms * days * 12);
            double occupancyRate = Math.Min(100.0, Math.Round((totalHours / maxCapacityHours) * 100, 1));

            // 4. Violations (phân theo đơn vị quản lý)
            var violationsQuery = (await _violationRecordRepo.GetAllAsync(
                v => v.ViolationType,
                v => v.User,
                v => v.UsageSession,
                v => v.UsageSession.BookingDetail,
                v => v.UsageSession.BookingDetail.Room,
                v => v.UsageSession.BookingDetail.Room.RoomType
            )).Where(v => v.IncidentTime >= from && v.IncidentTime <= to);

            if (targetDeptId.HasValue)
            {
                violationsQuery = violationsQuery.Where(v =>
                    v.UsageSession != null
                        ? v.UsageSession.BookingDetail?.Room?.RoomType?.DepartmentId == targetDeptId.Value
                        : (targetDeptId.Value == 3 || v.User?.DepartmentId == targetDeptId.Value));
            }

            var violations = violationsQuery.ToList();

            int totalViolations = violations.Count;
            int resolved = violations.Count(v => v.Status == "Đã xử lý" || v.Status == "Đã nộp phạt");
            int pendingViolations = violations.Count(v => v.Status == "Chờ xử lý" || v.Status == "Đang xử lý");
            int severe = violations.Count(v => v.Severity >= 3);

            var now = DateTime.UtcNow;
            var activeRestrictionsQuery = (await _userRestrictionRepo.FindAsync(
                ur => ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now)
            )).AsEnumerable();

            if (targetDeptId.HasValue)
            {
                var deptUserIds = violations.Select(v => v.UserId).ToHashSet();
                activeRestrictionsQuery = activeRestrictionsQuery.Where(ur => deptUserIds.Contains(ur.UserId) || (targetDeptId.Value == 3 && ur.Reason != null && ur.Reason.StartsWith("[Biên bản #")) || ur.User?.DepartmentId == targetDeptId.Value);
            }

            var activeBans = activeRestrictionsQuery.Select(ur => ur.UserId).Distinct().Count();

            // 5. Shifts (phân theo đơn vị quản lý ca trực)
            var allShifts = (await _shiftRepo.GetAllAsync(s => s.Employees)).ToList();
            var allEmployeesForShifts = (await _employeeRepo.GetAllAsync(e => e.User))
                .ToDictionary(e => e.Id);

            var shiftsQuery = allShifts.Where(s => s.Date >= from && s.Date <= to);
            if (targetDeptId.HasValue)
            {
                shiftsQuery = shiftsQuery.Where(s => s.Employees.Any(e =>
                    allEmployeesForShifts.TryGetValue(e.Id, out var fullEmp) && fullEmp.User?.DepartmentId == targetDeptId.Value));
            }
            var shiftList = shiftsQuery.ToList();

            int totalShifts = shiftList.Count;
            int completedShifts = shiftList.Count(s => s.Status == "Hoàn thành" || s.Status == "Completed");

            var allLogs = (await _shiftLogRepo.GetAllAsync(l => l.Employee, l => l.Employee.User))
                .Where(l => l.LogTime >= from && l.LogTime <= to);
            if (targetDeptId.HasValue)
            {
                allLogs = allLogs.Where(l => l.Employee?.User?.DepartmentId == targetDeptId.Value);
            }
            int shiftLogs = allLogs.Count();

            var overview = new SystemOverviewReportDto
            {
                TotalBookings = totalBookings,
                ApprovedBookings = approved,
                PendingBookings = pending,
                RejectedBookings = rejected,
                CancelledBookings = cancelled,
                CancelledByStudent = cancelledByStudent,
                CancelledByNoShow = cancelledByNoShow,
                CancelledByStaff = cancelledByStaff,
                CancelledUnknownSource = cancelledUnknown,
                ApprovalRate = approvalRate,
                TotalRooms = totalRooms,
                ActiveRooms = activeRooms,
                TotalRoomsUsed = totalRoomsUsed,
                TotalUsageHours = totalHours,
                AverageSessionHours = avgSessionHours,
                OverallOccupancyRate = occupancyRate,
                TotalViolations = totalViolations,
                ResolvedViolations = resolved,
                PendingViolations = pendingViolations,
                SevereViolations = severe,
                ActiveBannedUsers = activeBans,
                TotalShifts = totalShifts,
                CompletedShifts = completedShifts,
                TotalShiftLogs = shiftLogs
            };

            return ApiResponse<SystemOverviewReportDto>.SuccessResponse(overview);
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. BOOKING STATS REPORT
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<BookingStatsReportDto>> GetBookingStatsReportAsync(ReportFilterDto filter)
        {
            var targetDeptId = ResolveTargetDepartmentId(filter);
            var overviewRes = await GetSystemOverviewAsync(filter);
            var overview = overviewRes.Data ?? new SystemOverviewReportDto();

            var (from, to) = ResolveDateRange(filter);

            var allRoomsWithDept = (await _roomRepo.GetAllAsync(r => r.RoomType, r => r.RoomType.Department)).ToList();

            HashSet<int>? deptRoomIds = null;
            if (targetDeptId.HasValue)
            {
                deptRoomIds = allRoomsWithDept
                    .Where(r => r.RoomType?.DepartmentId == targetDeptId.Value)
                    .Select(r => r.Id)
                    .ToHashSet();
            }

            var rawBookings = (await _bookingRepo.GetAllAsync(b => b.BookingDetails, b => b.User, b => b.User.Department))
                .Where(b => b.RequestedAt >= from && b.RequestedAt <= to)
                .ToList();

            var allBookings = rawBookings;
            if (deptRoomIds != null)
            {
                allBookings = rawBookings
                    .Where(b => b.BookingDetails != null && b.BookingDetails.Any(bd => deptRoomIds.Contains(bd.RoomId)))
                    .ToList();
            }

            // Time series grouping
            var timeSeries = allBookings
                .GroupBy(b => b.RequestedAt.ToString("yyyy-MM-dd"))
                .OrderBy(g => g.Key)
                .Select(g => new TimeSeriesPointDto
                {
                    DateString = g.Key,
                    Label = DateTime.Parse(g.Key).ToString("dd/MM"),
                    Total = g.Count(),
                    Approved = g.Count(x => x.Status == "Đã duyệt" || x.Status == "Approved" || x.Status == "Duyệt một phần"),
                    Pending = g.Count(x => x.Status == "Chờ duyệt" || x.Status == "Pending"),
                    Completed = g.Count(x => x.Status == "Hoàn thành" || x.Status == "Đang sử dụng" || x.Status == "Chờ nhận phòng" || x.Status == "Completed" || x.Status == "InUse"),
                    Rejected = g.Count(x => x.Status == "Từ chối" || x.Status == "Rejected"),
                    Cancelled = g.Count(x => x.Status == "Đã hủy" || x.Status == "Cancelled")
                }).ToList();

            // Status Distribution
            var statusGroups = allBookings.GroupBy(b => b.Status).ToList();
            var statusDist = statusGroups.Select(g => new CategoryShareDto
            {
                Name = g.Key switch
                {
                    "Approved" => "Đã duyệt",
                    "Pending" => "Chờ duyệt",
                    "Rejected" => "Từ chối",
                    "Cancelled" => "Đã hủy",
                    _ => g.Key
                },
                Count = g.Count(),
                Percentage = allBookings.Count > 0 ? Math.Round((double)g.Count() / allBookings.Count * 100, 1) : 0,
                Color = g.Key switch
                {
                    "Đã duyệt" or "Approved" => "#10b981",
                    "Chờ duyệt" or "Pending" => "#f59e0b",
                    "Từ chối" or "Rejected" => "#ef4444",
                    "Đã hủy" or "Cancelled" => "#6b7280",
                    _ => "#3b82f6"
                }
            }).OrderByDescending(x => x.Count).ToList();

            // Purpose Distribution
            var purposeGroups = allBookings
                .GroupBy(b => string.IsNullOrWhiteSpace(b.Purpose) ? "Học nhóm & Nghiên cứu" : b.Purpose.Trim())
                .ToList();

            var purposeDist = purposeGroups.Select(g => new CategoryShareDto
            {
                Name = g.Key,
                Count = g.Count(),
                Percentage = allBookings.Count > 0 ? Math.Round((double)g.Count() / allBookings.Count * 100, 1) : 0
            }).OrderByDescending(x => x.Count).Take(6).ToList();

            // Department Stats: Thống kê độc lập theo Đơn vị quản lý phòng (Thư viện vs Phòng Đào tạo)
            var managingDepts = allRoomsWithDept
                .Where(r => r.RoomType?.Department != null)
                .Select(r => r.RoomType!.Department!)
                .GroupBy(d => d.Id)
                .Select(g => g.First())
                .ToList();

            if (targetDeptId.HasValue)
            {
                managingDepts = managingDepts.Where(d => d.Id == targetDeptId.Value).ToList();
            }

            var deptStats = new List<DepartmentBookingStatDto>();
            foreach (var dept in managingDepts)
            {
                var currentDeptRoomIds = allRoomsWithDept
                    .Where(r => r.RoomType?.DepartmentId == dept.Id)
                    .Select(r => r.Id)
                    .ToHashSet();

                var deptBookings = rawBookings
                    .Where(b => b.BookingDetails != null && b.BookingDetails.Any(bd => currentDeptRoomIds.Contains(bd.RoomId)))
                    .ToList();

                var deptDetails = deptBookings
                    .SelectMany(b => b.BookingDetails ?? Enumerable.Empty<BookingDetail>())
                    .Where(bd => currentDeptRoomIds.Contains(bd.RoomId))
                    .ToList();

                long tot = deptBookings.Count;
                long app = deptBookings.Count(b => b.BookingDetails != null && b.BookingDetails.Any(bd => currentDeptRoomIds.Contains(bd.RoomId) && (bd.Status == "Đã duyệt" || bd.Status == "Approved")));
                double succ = tot > 0 ? Math.Round((double)app / tot * 100, 1) : 0;
                double hours = deptDetails
                    .Where(d => d.Status == "Đã duyệt" || d.Status == "Approved")
                    .Sum(d => Math.Max(0.5, (d.EndAt - d.StartAt).TotalHours));

                deptStats.Add(new DepartmentBookingStatDto
                {
                    DepartmentId = dept.Id,
                    DepartmentName = dept.Name,
                    TotalBookings = tot,
                    ApprovedBookings = app,
                    SuccessRate = succ,
                    TotalHoursUsed = Math.Round(hours, 1)
                });
            }
            deptStats = deptStats.OrderByDescending(x => x.TotalBookings).ToList();

            var report = new BookingStatsReportDto
            {
                Overview = overview,
                TimeSeries = timeSeries,
                StatusDistribution = statusDist,
                PurposeDistribution = purposeDist,
                DepartmentStats = deptStats,
                CancellationReasonStats = BuildCancellationReasonStats(allBookings)
            };

            return ApiResponse<BookingStatsReportDto>.SuccessResponse(report);
        }

        /// <summary>
        /// Thống kê hủy theo lý do: phân biệt sinh viên tự hủy, tự động hủy (no-show),
        /// quản trị hủy và đơn cũ chưa có dữ liệu lý do (không suy đoán).
        /// Đơn "Từ chối" không được tính là đơn đã hủy.
        /// </summary>
        private static List<CategoryShareDto> BuildCancellationReasonStats(List<Domain.Entities.Booking> bookings)
        {
            var cancelled = bookings
                .Where(b => b.Status == "Đã hủy" || b.Status == "Cancelled")
                .ToList();

            if (cancelled.Count == 0)
                return new List<CategoryShareDto>();

            return cancelled
                .GroupBy(b =>
                {
                    if (string.IsNullOrWhiteSpace(b.CancelReason))
                        return "Chưa có thông tin lý do hủy";

                    var label = BookingCancelPolicy.GetReasonLabel(b.CancelReason);
                    return b.CancelSource == BookingCancelPolicy.SourceAuto
                        ? $"{label} (tự động)"
                        : label;
                })
                .Select(g => new CategoryShareDto
                {
                    Name = g.Key,
                    Count = g.Count(),
                    Percentage = Math.Round((double)g.Count() / cancelled.Count * 100, 1)
                })
                .OrderByDescending(x => x.Count)
                .ToList();
        }

        // ─────────────────────────────────────────────────────────────────
        // 3. ROOM USAGE REPORT
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<RoomUsageReportDto>> GetRoomUsageReportAsync(ReportFilterDto filter)
        {
            var targetDeptId = ResolveTargetDepartmentId(filter);
            var (from, to) = ResolveDateRange(filter);

            var rooms = (await _roomRepo.GetAllAsync(r => r.RoomType, r => r.RoomType.Department)).ToList();
            if (targetDeptId.HasValue)
            {
                rooms = rooms.Where(r => r.RoomType?.DepartmentId == targetDeptId.Value).ToList();
            }

            var roomIds = rooms.Select(r => r.Id).ToHashSet();

            var details = (await _bookingDetailRepo.GetAllAsync(d => d.Booking, d => d.UsageSessions))
                .Where(d => d.StartAt >= from && d.StartAt <= to && roomIds.Contains(d.RoomId))
                .ToList();

            var sessions = (await _usageSessionRepo.GetAllAsync(s => s.BookingDetail))
                .Where(s => (s.ActualCheckIn ?? s.CreatedAt) >= from && (s.ActualCheckIn ?? s.CreatedAt) <= to && s.BookingDetail != null && roomIds.Contains(s.BookingDetail.RoomId))
                .ToList();

            double totalPeriodDays = Math.Max(1, (to - from).TotalDays);
            double standardRoomCapacityHours = totalPeriodDays * 12.0;

            var topRooms = rooms.Select(r =>
            {
                var roomDetails = details.Where(d => d.RoomId == r.Id && (d.Booking?.Status == "Đã duyệt" || d.Booking?.Status == "Approved")).ToList();
                long totalBookings = roomDetails.Count;
                var roomSessions = sessions.Where(s => s.BookingDetail?.RoomId == r.Id).ToList();
                long totalCheckIns = roomSessions.Count;

                double hours = roomSessions.Sum(s =>
                {
                    var checkIn = s.ActualCheckIn ?? s.CreatedAt;
                    var end = s.ActualCheckOut ?? (s.BookingDetail != null ? s.BookingDetail.EndAt : checkIn.AddHours(2));
                    return Math.Max(0.5, (end - checkIn).TotalHours);
                });

                if (hours == 0 && roomDetails.Any())
                {
                    hours = roomDetails.Sum(d => Math.Max(0.5, (d.EndAt - d.StartAt).TotalHours));
                }

                double occRate = Math.Min(100.0, Math.Round((hours / standardRoomCapacityHours) * 100, 1));

                return new RoomPerformanceDto
                {
                    RoomId = r.Id,
                    RoomCode = r.RoomCode,
                    RoomName = r.Name,
                    Building = r.Building ?? "Tòa A",
                    Floor = r.Floor ?? "Tầng 1",
                    RoomTypeName = r.RoomType?.Name ?? "Phòng chung",
                    Capacity = r.Capacity,
                    TotalBookings = totalBookings,
                    TotalCheckIns = totalCheckIns > 0 ? totalCheckIns : totalBookings,
                    TotalHours = Math.Round(hours, 1),
                    OccupancyRate = occRate,
                    Status = r.Status ?? "Hoạt động"
                };
            }).OrderByDescending(x => x.TotalHours).ThenByDescending(x => x.TotalBookings).ToList();

            // Room Type Stats
            var roomTypeStats = rooms
                .GroupBy(r => r.RoomType?.Name ?? "Loại phòng khác")
                .Select(g =>
                {
                    var roomIds = g.Select(r => r.Id).ToHashSet();
                    var matchingDetails = details.Where(d => roomIds.Contains(d.RoomId) && (d.Booking?.Status == "Đã duyệt" || d.Booking?.Status == "Approved")).ToList();
                    double hours = matchingDetails.Sum(d => Math.Max(0.5, (d.EndAt - d.StartAt).TotalHours));

                    return new RoomTypeStatDto
                    {
                        RoomTypeName = g.Key,
                        RoomCount = g.Count(),
                        TotalSessions = matchingDetails.Count,
                        TotalHours = Math.Round(hours, 1)
                    };
                }).OrderByDescending(x => x.TotalHours).ToList();

            double grandTotalHours = topRooms.Sum(r => r.TotalHours);
            foreach (var rts in roomTypeStats)
            {
                rts.SharePercentage = grandTotalHours > 0 ? Math.Round(rts.TotalHours / grandTotalHours * 100, 1) : 0;
            }

            // Building Stats
            var bldgStats = rooms
                .GroupBy(r => string.IsNullOrWhiteSpace(r.Building) ? "Khu vực Thư viện" : r.Building)
                .Select(g =>
                {
                    var roomIds = g.Select(r => r.Id).ToHashSet();
                    var count = details.Count(d => roomIds.Contains(d.RoomId));
                    return new CategoryShareDto
                    {
                        Name = g.Key,
                        Count = count,
                        Percentage = details.Count > 0 ? Math.Round((double)count / details.Count * 100, 1) : 0
                    };
                }).OrderByDescending(x => x.Count).ToList();

            // Checkout Conditions
            int normalCheckout = sessions.Count(s => s.Status == "Hoàn thành" || string.IsNullOrWhiteSpace(s.Status));
            int issueCheckout = sessions.Count(s => s.Status == "Sự cố" || s.Status == "Vi phạm");
            double eqGoodRate = sessions.Count > 0 ? Math.Round((double)normalCheckout / sessions.Count * 100, 1) : 98.5;

            var report = new RoomUsageReportDto
            {
                TotalRooms = rooms.Count,
                TotalUsageHours = grandTotalHours,
                AverageOccupancyRate = topRooms.Count > 0 ? Math.Round(topRooms.Average(r => r.OccupancyRate), 1) : 0,
                TopRooms = topRooms,
                RoomTypeStats = roomTypeStats,
                BuildingStats = bldgStats,
                NormalCheckoutCount = normalCheckout,
                IssueCheckoutCount = issueCheckout,
                EquipmentGoodRate = eqGoodRate
            };

            return ApiResponse<RoomUsageReportDto>.SuccessResponse(report);
        }

        // ─────────────────────────────────────────────────────────────────
        // 4. VIOLATION STATS REPORT
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ViolationStatsReportDto>> GetViolationStatsReportAsync(ReportFilterDto filter)
        {
            var targetDeptId = filter.DepartmentId;
            if (!_currentUser.IsAdmin && (_currentUser.Role == "Manager" || _currentUser.Role == "Employee") && _currentUser.DepartmentId.HasValue)
            {
                targetDeptId = _currentUser.DepartmentId.Value;
            }

            var (from, to) = ResolveDateRange(filter, defaultMonths: 3);

            var violationsQuery = (await _violationRecordRepo.GetAllAsync(
                v => v.ViolationType,
                v => v.User,
                v => v.User.Department,
                v => v.UsageSession,
                v => v.UsageSession.BookingDetail,
                v => v.UsageSession.BookingDetail.Room,
                v => v.UsageSession.BookingDetail.Room.RoomType
            )).Where(v => v.IncidentTime >= from && v.IncidentTime <= to);

            if (targetDeptId.HasValue)
            {
                violationsQuery = violationsQuery.Where(v =>
                    v.UsageSession != null
                        ? v.UsageSession.BookingDetail?.Room?.RoomType?.DepartmentId == targetDeptId.Value
                        : v.User?.DepartmentId == targetDeptId.Value);
            }

            var violations = violationsQuery.ToList();

            int totalRecords = violations.Count;
            int pending = violations.Count(v => v.Status == "Chờ xử lý" || v.Status == "Đang xử lý");
            int resolved = violations.Count(v => v.Status == "Đã xử lý" || v.Status == "Đã nộp phạt");

            // Severity Breakdown
            var sevGroups = violations.GroupBy(v => v.Severity).ToList();
            var sevDist = sevGroups.Select(g => new CategoryShareDto
            {
                Name = g.Key switch
                {
                    1 => "Mức 1 (Nhẹ / Nhắc nhở)",
                    2 => "Mức 2 (Trung bình)",
                    3 => "Mức 3 (Nghiêm trọng)",
                    4 => "Mức 4 (Rất nghiêm trọng)",
                    _ => $"Mức {g.Key}"
                },
                Count = g.Count(),
                Percentage = totalRecords > 0 ? Math.Round((double)g.Count() / totalRecords * 100, 1) : 0,
                Color = g.Key switch
                {
                    1 => "#3b82f6",
                    2 => "#f59e0b",
                    3 => "#ef4444",
                    4 => "#7f1d1d",
                    _ => "#6b7280"
                }
            }).OrderBy(x => x.Name).ToList();

            // Type Distribution
            var typeGroups = violations.GroupBy(v => v.ViolationType?.Name ?? "Khác").ToList();
            var typeDist = typeGroups.Select(g => new CategoryShareDto
            {
                Name = g.Key,
                Count = g.Count(),
                Percentage = totalRecords > 0 ? Math.Round((double)g.Count() / totalRecords * 100, 1) : 0
            }).OrderByDescending(x => x.Count).ToList();

            // Frequent Offenders
            var offenderGroups = violations
                .Where(v => v.User != null)
                .GroupBy(v => v.User)
                .ToList();

            var now = DateTime.UtcNow;
            var activeRestrictions = (await _userRestrictionRepo.GetAllAsync(ur => ur.User, ur => ur.User.Department))
                .Where(ur => ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now))
                .ToList();

            if (targetDeptId.HasValue)
            {
                var deptUserIds = violations.Select(v => v.UserId).ToHashSet();
                activeRestrictions = activeRestrictions.Where(ur => deptUserIds.Contains(ur.UserId) || ur.User?.DepartmentId == targetDeptId.Value).ToList();
            }

            var bannedUserIds = activeRestrictions.Select(ur => ur.UserId).ToHashSet();

            var offenders = offenderGroups.Select(g => new OffenderSummaryDto
            {
                UserId = g.Key.Id,
                CardCode = g.Key.CardCode ?? "",
                FullName = g.Key.FullName ?? "",
                Email = g.Key.Email ?? "",
                Role = g.Key.Status ?? "Sinh viên",
                DepartmentName = g.Key.Department?.Name,
                ViolationCount = g.Count(),
                HasActiveBan = bannedUserIds.Contains(g.Key.Id)
            }).OrderByDescending(x => x.ViolationCount).Take(10).ToList();

            // Active Bans
            var activeBanDtos = activeRestrictions.Select(ur =>
            {
                int rem = ur.EndAt.HasValue ? Math.Max(0, (int)Math.Ceiling((ur.EndAt.Value - now).TotalDays)) : 999;

                return new ActiveBanSummaryDto
                {
                    Id = ur.Id,
                    UserId = ur.UserId,
                    CardCode = ur.User?.CardCode ?? "",
                    FullName = ur.User?.FullName ?? "Người dùng",
                    RestrictionType = ur.RestrictionType,
                    Reason = ur.Reason,
                    StartAt = ur.StartAt,
                    EndAt = ur.EndAt,
                    RemainingDays = rem
                };
            }).OrderBy(x => x.RemainingDays).ToList();

            var report = new ViolationStatsReportDto
            {
                TotalRecords = totalRecords,
                PendingRecords = pending,
                ResolvedRecords = resolved,
                ActiveBansCount = activeRestrictions.Count,
                SeverityDistribution = sevDist,
                TypeDistribution = typeDist,
                FrequentOffenders = offenders,
                CurrentActiveBans = activeBanDtos
            };

            return ApiResponse<ViolationStatsReportDto>.SuccessResponse(report);
        }

        // ─────────────────────────────────────────────────────────────────
        // 5. CSV EXPORT
        // ─────────────────────────────────────────────────────────────────
        public async Task<(byte[] Bytes, string FileName, string ContentType)> ExportReportCsvAsync(
            string reportType, ReportFilterDto filter)
        {
            var sb = new StringBuilder();

            if (reportType.ToLower() == "rooms")
            {
                var roomRep = await GetRoomUsageReportAsync(filter);
                sb.AppendLine("MaPhong,TenPhong,ToaNha,Tang,LoaiPhong,SucChua,TongLuotMuon,TongGioSuDung,TyLeLapDay(%),TrangThai");
                foreach (var r in roomRep.Data?.TopRooms ?? new List<RoomPerformanceDto>())
                {
                    sb.AppendLine($"\"{r.RoomCode}\",\"{r.RoomName}\",\"{r.Building}\",\"{r.Floor}\",\"{r.RoomTypeName}\",{r.Capacity},{r.TotalBookings},{r.TotalHours},{r.OccupancyRate},\"{r.Status}\"");
                }
                var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
                return (bytes, $"BaoCao_SuDungPhong_{DateTime.Now:yyyyMMdd_HHmm}.csv", "text/csv; charset=utf-8");
            }
            else if (reportType.ToLower() == "violations")
            {
                var vioRep = await GetViolationStatsReportAsync(filter);
                sb.AppendLine("MaDinhDanh,HoVaTen,LoaiHanChe,LyDo,NgayBatDau,NgayKetThuc,SoNgayConLai");
                foreach (var b in vioRep.Data?.CurrentActiveBans ?? new List<ActiveBanSummaryDto>())
                {
                    sb.AppendLine($"\"{b.CardCode}\",\"{b.FullName}\",\"{b.RestrictionType}\",\"{b.Reason}\",\"{b.StartAt:dd/MM/yyyy}\",\"{b.EndAt:dd/MM/yyyy}\",{b.RemainingDays}");
                }
                var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
                return (bytes, $"BaoCao_ViPham_CamMuon_{DateTime.Now:yyyyMMdd_HHmm}.csv", "text/csv; charset=utf-8");
            }
            else
            {
                // Default: Bookings
                var bookRep = await GetBookingStatsReportAsync(filter);
                sb.AppendLine("Ngay,TongDon,DaDuyet,ChoDuyet,HoanThanh,TuChoi,DaHuy");
                foreach (var pt in bookRep.Data?.TimeSeries ?? new List<TimeSeriesPointDto>())
                {
                    sb.AppendLine($"\"{pt.DateString}\",{pt.Total},{pt.Approved},{pt.Pending},{pt.Completed},{pt.Rejected},{pt.Cancelled}");
                }
                var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
                return (bytes, $"BaoCao_LuotMuonPhong_{DateTime.Now:yyyyMMdd_HHmm}.csv", "text/csv; charset=utf-8");
            }
        }

        /// <summary>
        /// Bộ lọc gửi lên chỉ có ngày (date-only) nên lấy trọn ngày cuối thay vì mốc 00:00,
        /// tránh việc dữ liệu phát sinh trong ngày hôm nay bị loại khỏi báo cáo.
        /// </summary>
        private static (DateTime From, DateTime To) ResolveDateRange(ReportFilterDto filter, int defaultMonths = 1)
        {
            var from = filter.FromDate.HasValue
                ? DateTime.SpecifyKind(filter.FromDate.Value.Date, DateTimeKind.Utc)
                : DateTime.UtcNow.AddMonths(-defaultMonths);
            var to = filter.ToDate.HasValue
                ? DateTime.SpecifyKind(filter.ToDate.Value.Date, DateTimeKind.Utc).AddDays(1)
                : DateTime.UtcNow.AddDays(1);
            return (from, to);
        }

        /// <summary>
        /// Xác định phòng ban quản lý phòng mục tiêu:
        /// Nhân sự / Quản lý chỉ được xem dữ liệu thuộc đơn vị quản lý phòng của mình (Thư viện hoặc Đào tạo).
        /// Quản trị viên (Admin) xem toàn bộ hệ thống hoặc theo bộ lọc gửi lên.
        /// </summary>
        private int? ResolveTargetDepartmentId(ReportFilterDto filter)
        {
            if (!_currentUser.IsAdmin && (_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                return _currentUser.DepartmentId.Value;
            }
            return filter?.DepartmentId;
        }
    }
}
