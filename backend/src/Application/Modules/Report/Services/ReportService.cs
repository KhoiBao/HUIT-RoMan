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
            _userManager = userManager;
            _spService = spService;
            _currentUser = currentUser;
        }

        // ─────────────────────────────────────────────────────────────────
        // 1. SYSTEM OVERVIEW
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<SystemOverviewReportDto>> GetSystemOverviewAsync(ReportFilterDto filter)
        {
            var from = filter.FromDate?.ToUniversalTime() ?? DateTime.UtcNow.AddMonths(-1);
            var to = filter.ToDate?.ToUniversalTime() ?? DateTime.UtcNow.AddDays(1);

            // 1. Bookings
            var bookings = (await _bookingRepo.GetAllAsync(b => b.BookingDetails, b => b.User, b => b.User.Department))
                .Where(b => b.RequestedAt >= from && b.RequestedAt <= to)
                .ToList();

            long totalBookings = bookings.Count;
            long approved = bookings.Count(b => b.Status == "Đã duyệt" || b.Status == "Approved");
            long pending = bookings.Count(b => b.Status == "Chờ duyệt" || b.Status == "Pending");
            long rejected = bookings.Count(b => b.Status == "Từ chối" || b.Status == "Rejected");
            long cancelled = bookings.Count(b => b.Status == "Đã hủy" || b.Status == "Cancelled");
            // Phân loại nguồn hủy: sinh viên tự hủy / tự động hủy (no-show) / quản trị hủy.
            // Đơn cũ không có dữ liệu nguồn được đếm riêng, không suy đoán.
            long cancelledByStudent = bookings.Count(b => (b.Status == "Đã hủy" || b.Status == "Cancelled") && b.CancelSource == BookingCancelPolicy.SourceStudent);
            long cancelledByNoShow = bookings.Count(b => (b.Status == "Đã hủy" || b.Status == "Cancelled") && b.CancelSource == BookingCancelPolicy.SourceAuto);
            long cancelledByStaff = bookings.Count(b => (b.Status == "Đã hủy" || b.Status == "Cancelled") && b.CancelSource == BookingCancelPolicy.SourceStaff);
            long cancelledUnknown = cancelled - cancelledByStudent - cancelledByNoShow - cancelledByStaff;
            double approvalRate = totalBookings > 0 ? Math.Round((double)approved / totalBookings * 100, 1) : 100.0;

            // 2. Rooms & Usage
            var allRooms = (await _roomRepo.GetAllAsync(r => r.RoomType)).ToList();
            int totalRooms = allRooms.Count;
            int activeRooms = allRooms.Count(r => r.Status != "Bảo trì" && r.Status != "Ngưng hoạt động");

            var sessions = (await _usageSessionRepo.GetAllAsync(s => s.BookingDetail))
                .Where(s => (s.ActualCheckIn ?? s.CreatedAt) >= from && (s.ActualCheckIn ?? s.CreatedAt) <= to)
                .ToList();

            long totalRoomsUsed = sessions.Select(s => s.BookingDetail?.RoomId).Where(id => id.HasValue).Distinct().Count();
            if (totalRoomsUsed == 0 && approved > 0)
            {
                totalRoomsUsed = bookings.SelectMany(b => b.BookingDetails).Select(d => d.RoomId).Distinct().Count();
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
                    .SelectMany(b => b.BookingDetails)
                    .Sum(d => Math.Max(0.5, (d.EndAt - d.StartAt).TotalHours));
            }
            totalHours = Math.Round(totalHours, 1);
            double avgSessionHours = sessions.Count > 0 ? Math.Round(totalHours / sessions.Count, 1) : 2.0;

            double days = Math.Max(1, (to - from).TotalDays);
            double maxCapacityHours = Math.Max(1, activeRooms * days * 12);
            double occupancyRate = Math.Min(100.0, Math.Round((totalHours / maxCapacityHours) * 100, 1));

            // 3. Violations
            var violations = (await _violationRecordRepo.GetAllAsync(v => v.ViolationType))
                .Where(v => v.IncidentTime >= from && v.IncidentTime <= to)
                .ToList();

            int totalViolations = violations.Count;
            int resolved = violations.Count(v => v.Status == "Đã xử lý" || v.Status == "Đã nộp phạt");
            int pendingViolations = violations.Count(v => v.Status == "Chờ xử lý");
            int severe = violations.Count(v => v.Severity >= 3);

            var now = DateTime.UtcNow;
            var activeBans = (await _userRestrictionRepo.FindAsync(
                ur => ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now)
            )).Count();

            // 4. Shifts
            var shifts = (await _shiftRepo.GetAllAsync())
                .Where(s => s.Date >= from && s.Date <= to)
                .ToList();

            int totalShifts = shifts.Count;
            int completedShifts = shifts.Count(s => s.Status == "Hoàn thành" || s.Status == "Completed");
            int shiftLogs = (await _shiftLogRepo.GetAllAsync())
                .Count(l => l.LogTime >= from && l.LogTime <= to);

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
            var overviewRes = await GetSystemOverviewAsync(filter);
            var overview = overviewRes.Data ?? new SystemOverviewReportDto();

            var from = filter.FromDate?.ToUniversalTime() ?? DateTime.UtcNow.AddMonths(-1);
            var to = filter.ToDate?.ToUniversalTime() ?? DateTime.UtcNow.AddDays(1);

            var allBookings = (await _bookingRepo.GetAllAsync(b => b.BookingDetails, b => b.User, b => b.User.Department))
                .Where(b => b.RequestedAt >= from && b.RequestedAt <= to)
                .ToList();

            if (filter.DepartmentId.HasValue)
            {
                allBookings = allBookings.Where(b => b.User != null && b.User.DepartmentId == filter.DepartmentId.Value).ToList();
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
                    Approved = g.Count(x => x.Status == "Đã duyệt" || x.Status == "Approved"),
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

            // Department Stats
            var deptGroups = allBookings
                .GroupBy(b => b.User?.Department?.Name ?? "Đơn vị khác")
                .ToList();

            var deptStats = deptGroups.Select(g =>
            {
                long tot = g.Count();
                long app = g.Count(b => b.Status == "Đã duyệt" || b.Status == "Approved");
                double succ = tot > 0 ? Math.Round((double)app / tot * 100, 1) : 0;
                double hours = g.Where(b => b.Status == "Đã duyệt" || b.Status == "Approved")
                                .SelectMany(b => b.BookingDetails)
                                .Sum(d => Math.Max(0.5, (d.EndAt - d.StartAt).TotalHours));

                return new DepartmentBookingStatDto
                {
                    DepartmentName = g.Key,
                    TotalBookings = tot,
                    ApprovedBookings = app,
                    SuccessRate = succ,
                    TotalHoursUsed = Math.Round(hours, 1)
                };
            }).OrderByDescending(x => x.TotalBookings).ToList();

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
            var from = filter.FromDate?.ToUniversalTime() ?? DateTime.UtcNow.AddMonths(-1);
            var to = filter.ToDate?.ToUniversalTime() ?? DateTime.UtcNow.AddDays(1);

            var rooms = (await _roomRepo.GetAllAsync(r => r.RoomType)).ToList();

            var details = (await _bookingDetailRepo.GetAllAsync(d => d.Booking, d => d.UsageSessions))
                .Where(d => d.StartAt >= from && d.StartAt <= to)
                .ToList();

            var sessions = (await _usageSessionRepo.GetAllAsync(s => s.BookingDetail))
                .Where(s => (s.ActualCheckIn ?? s.CreatedAt) >= from && (s.ActualCheckIn ?? s.CreatedAt) <= to)
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
            var from = filter.FromDate?.ToUniversalTime() ?? DateTime.UtcNow.AddMonths(-3);
            var to = filter.ToDate?.ToUniversalTime() ?? DateTime.UtcNow.AddDays(1);

            var violations = (await _violationRecordRepo.GetAllAsync(v => v.ViolationType, v => v.User, v => v.User.Department))
                .Where(v => v.IncidentTime >= from && v.IncidentTime <= to)
                .ToList();

            int totalRecords = violations.Count;
            int pending = violations.Count(v => v.Status == "Chờ xử lý");
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
            var activeRestrictions = (await _userRestrictionRepo.GetAllAsync(ur => ur.User))
                .Where(ur => ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now))
                .ToList();

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
                sb.AppendLine("Ngay,TongDon,DaDuyet,TuChoi,DaHuy");
                foreach (var pt in bookRep.Data?.TimeSeries ?? new List<TimeSeriesPointDto>())
                {
                    sb.AppendLine($"\"{pt.DateString}\",{pt.Total},{pt.Approved},{pt.Rejected},{pt.Cancelled}");
                }
                var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
                return (bytes, $"BaoCao_LuotMuonPhong_{DateTime.Now:yyyyMMdd_HHmm}.csv", "text/csv; charset=utf-8");
            }
        }
    }
}
