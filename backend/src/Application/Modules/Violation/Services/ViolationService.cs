using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Violation.DTOs;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace HUIT_RoMan.Application.Modules.Violation.Services
{
    public class ViolationService : IViolationService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<ViolationType> _violationTypeRepo;
        private readonly IRepository<ViolationRecord> _violationRecordRepo;
        private readonly IRepository<UserRestriction> _userRestrictionRepo;
        private readonly IRepository<UsageSession> _usageSessionRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly UserManager<User> _userManager;
        private readonly ICurrentUserService _currentUser;

        public ViolationService(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager,
            ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _violationTypeRepo = _unitOfWork.Repository<ViolationType>();
            _violationRecordRepo = _unitOfWork.Repository<ViolationRecord>();
            _userRestrictionRepo = _unitOfWork.Repository<UserRestriction>();
            _usageSessionRepo = _unitOfWork.Repository<UsageSession>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _userManager = userManager;
            _currentUser = currentUser;
        }

        private static string GetSeverityText(int severity) => severity switch
        {
            1 => "1 - Nhẹ",
            2 => "2 - Vừa",
            3 => "3 - Nghiêm trọng",
            4 => "4 - Rất nghiêm trọng",
            _ => $"{severity}"
        };

        // ─────────────────────────────────────────────────────────────────
        // VIOLATION TYPES
        // ─────────────────────────────────────────────────────────────────

        public async Task<ApiResponse<IEnumerable<ViolationTypeDto>>> GetViolationTypesAsync()
        {
            var types = await _violationTypeRepo.GetAllAsync(vt => vt.ViolationRecords);
            var dtos = types.Select(vt => new ViolationTypeDto
            {
                Id = vt.Id,
                Code = vt.Code,
                Name = vt.Name,
                Description = vt.Description,
                Severity = vt.Severity,
                DefaultPenalty = vt.DefaultPenalty,
                RecordCount = vt.ViolationRecords?.Count(vr => !vr.IsDeleted) ?? 0
            }).OrderBy(vt => vt.Severity).ThenBy(vt => vt.Code).ToList();

            return ApiResponse<IEnumerable<ViolationTypeDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<ViolationTypeDto>> GetViolationTypeByIdAsync(int id)
        {
            var vt = await _violationTypeRepo.GetByIdAsync(id, v => v.ViolationRecords);
            if (vt == null) return ApiResponse<ViolationTypeDto>.ErrorResponse("Không tìm thấy loại vi phạm.");

            return ApiResponse<ViolationTypeDto>.SuccessResponse(new ViolationTypeDto
            {
                Id = vt.Id,
                Code = vt.Code,
                Name = vt.Name,
                Description = vt.Description,
                Severity = vt.Severity,
                DefaultPenalty = vt.DefaultPenalty,
                RecordCount = vt.ViolationRecords?.Count(vr => !vr.IsDeleted) ?? 0
            });
        }

        public async Task<ApiResponse<ViolationTypeDto>> CreateViolationTypeAsync(CreateViolationTypeDto request)
        {
            var existing = await _violationTypeRepo.FindAsync(vt => vt.Code.ToUpper() == request.Code.ToUpper());
            if (existing.Any())
                return ApiResponse<ViolationTypeDto>.ErrorResponse($"Mã loại vi phạm '{request.Code}' đã tồn tại.");

            var vt = new ViolationType
            {
                Code = request.Code.Trim().ToUpper(),
                Name = request.Name.Trim(),
                Description = request.Description ?? "",
                Severity = request.Severity,
                DefaultPenalty = request.DefaultPenalty ?? "",
                CreatedAt = DateTime.UtcNow
            };

            await _violationTypeRepo.AddAsync(vt);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<ViolationTypeDto>.SuccessResponse(new ViolationTypeDto
            {
                Id = vt.Id,
                Code = vt.Code,
                Name = vt.Name,
                Description = vt.Description,
                Severity = vt.Severity,
                DefaultPenalty = vt.DefaultPenalty,
                RecordCount = 0
            }, "Tạo loại vi phạm thành công.");
        }

        public async Task<ApiResponse<ViolationTypeDto>> UpdateViolationTypeAsync(int id, UpdateViolationTypeDto request)
        {
            var vt = await _violationTypeRepo.GetByIdAsync(id);
            if (vt == null) return ApiResponse<ViolationTypeDto>.ErrorResponse("Không tìm thấy loại vi phạm.");

            vt.Name = request.Name.Trim();
            vt.Description = request.Description ?? vt.Description;
            vt.Severity = request.Severity;
            vt.DefaultPenalty = request.DefaultPenalty ?? vt.DefaultPenalty;
            vt.UpdatedAt = DateTime.UtcNow;

            _violationTypeRepo.Update(vt);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<ViolationTypeDto>.SuccessResponse(new ViolationTypeDto
            {
                Id = vt.Id,
                Code = vt.Code,
                Name = vt.Name,
                Description = vt.Description,
                Severity = vt.Severity,
                DefaultPenalty = vt.DefaultPenalty
            }, "Cập nhật loại vi phạm thành công.");
        }

        public async Task<ApiResponse<bool>> DeleteViolationTypeAsync(int id)
        {
            var vt = await _violationTypeRepo.GetByIdAsync(id, v => v.ViolationRecords);
            if (vt == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy loại vi phạm.");

            if (vt.ViolationRecords != null && vt.ViolationRecords.Any(vr => !vr.IsDeleted))
                return ApiResponse<bool>.ErrorResponse("Không thể xóa loại vi phạm đang có biên bản ghi nhận liên kết.");

            _violationTypeRepo.Remove(vt);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Xóa loại vi phạm thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // VIOLATION RECORDS
        // ─────────────────────────────────────────────────────────────────

        public async Task<ApiResponse<IEnumerable<ViolationRecordDto>>> GetViolationRecordsAsync(ViolationFilterDto filter)
        {
            var records = await _violationRecordRepo.GetAllAsync(
                vr => vr.User,
                vr => vr.User.Department,
                vr => vr.ViolationType,
                vr => vr.UsageSession,
                vr => vr.UsageSession.BookingDetail,
                vr => vr.UsageSession.BookingDetail.Room,
                vr => vr.UsageSession.BookingDetail.Room.RoomType);

            var query = records.AsEnumerable();

            // Employee department filter if needed
            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue)
            {
                query = query.Where(vr =>
                    vr.User?.DepartmentId == _currentUser.DepartmentId.Value ||
                    vr.UsageSession?.BookingDetail?.Room?.RoomType?.DepartmentId == _currentUser.DepartmentId.Value ||
                    vr.UsageSession == null);
            }

            // Keyword Search
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var term = filter.Search.Trim().ToLower();
                query = query.Where(vr =>
                    (vr.Code != null && vr.Code.ToLower().Contains(term)) ||
                    (vr.Description != null && vr.Description.ToLower().Contains(term)) ||
                    (vr.PenaltyApplied != null && vr.PenaltyApplied.ToLower().Contains(term)) ||
                    (vr.User != null && (
                        (vr.User.FullName != null && vr.User.FullName.ToLower().Contains(term)) ||
                        (vr.User.CardCode != null && vr.User.CardCode.ToLower().Contains(term)) ||
                        (vr.User.UserName != null && vr.User.UserName.ToLower().Contains(term)) ||
                        (vr.User.Email != null && vr.User.Email.ToLower().Contains(term))
                    )) ||
                    (vr.ViolationType != null && vr.ViolationType.Name.ToLower().Contains(term)) ||
                    (vr.UsageSession?.BookingDetail?.Room != null && (
                        vr.UsageSession.BookingDetail.Room.Name.ToLower().Contains(term) ||
                        vr.UsageSession.BookingDetail.Room.RoomCode.ToLower().Contains(term)
                    ))
                );
            }

            if (filter.ViolationTypeId.HasValue)
                query = query.Where(vr => vr.ViolationTypeId == filter.ViolationTypeId.Value);

            if (filter.UserId.HasValue)
                query = query.Where(vr => vr.UserId == filter.UserId.Value);

            if (filter.Severity.HasValue)
                query = query.Where(vr => vr.Severity == filter.Severity.Value);

            if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "ALL")
                query = query.Where(vr => string.Equals(vr.Status, filter.Status, StringComparison.OrdinalIgnoreCase));

            if (filter.FromDate.HasValue)
                query = query.Where(vr => vr.IncidentTime >= filter.FromDate.Value.ToUniversalTime());

            if (filter.ToDate.HasValue)
                query = query.Where(vr => vr.IncidentTime <= filter.ToDate.Value.ToUniversalTime());

            // Active restrictions lookup
            var activeRestrictions = (await _userRestrictionRepo.FindAsync(
                ur => ur.Status == "Hoạt động" && ur.StartAt <= DateTime.UtcNow && (ur.EndAt == null || ur.EndAt >= DateTime.UtcNow)
            )).GroupBy(ur => ur.UserId).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.EndAt).First());

            var result = query
                .OrderByDescending(vr => vr.IncidentTime)
                .Select(vr =>
                {
                    var hasRestr = activeRestrictions.TryGetValue(vr.UserId, out var r);
                    var room = vr.UsageSession?.BookingDetail?.Room;
                    return new ViolationRecordDto
                    {
                        Id = vr.Id,
                        Code = vr.Code ?? $"VP-{vr.Id:D4}",
                        IncidentTime = vr.IncidentTime,
                        Description = vr.Description,
                        Severity = vr.Severity,
                        SeverityText = GetSeverityText(vr.Severity),
                        PenaltyApplied = vr.PenaltyApplied,
                        Status = vr.Status,
                        UserId = vr.UserId,
                        UserName = vr.User?.UserName ?? "",
                        UserFullName = vr.User?.FullName ?? "",
                        UserCardCode = vr.User?.CardCode ?? "",
                        UserEmail = vr.User?.Email ?? "",
                        UserPhoneNumber = vr.User?.PhoneNumber,
                        DepartmentName = vr.User?.Department?.Name,
                        UsageSessionId = vr.UsageSessionId,
                        RoomId = room?.Id,
                        RoomCode = room?.RoomCode,
                        RoomName = room?.Name,
                        ViolationTypeId = vr.ViolationTypeId,
                        ViolationTypeCode = vr.ViolationType?.Code ?? "",
                        ViolationTypeName = vr.ViolationType?.Name ?? "",
                        IsRestricted = hasRestr,
                        RestrictDays = hasRestr && r?.EndAt != null ? Math.Max(0, (int)Math.Ceiling((r.EndAt.Value - DateTime.UtcNow).TotalDays)) : 0,
                        RestrictionEndAt = hasRestr ? r?.EndAt : null,
                        CreatedAt = vr.CreatedAt
                    };
                }).ToList();

            return ApiResponse<IEnumerable<ViolationRecordDto>>.SuccessResponse(result);
        }

        public async Task<ApiResponse<ViolationRecordDto>> GetViolationRecordByIdAsync(int id)
        {
            var vr = await _violationRecordRepo.GetByIdAsync(
                id,
                v => v.User,
                v => v.User.Department,
                v => v.ViolationType,
                v => v.UsageSession,
                v => v.UsageSession.BookingDetail,
                v => v.UsageSession.BookingDetail.Room);

            if (vr == null) return ApiResponse<ViolationRecordDto>.ErrorResponse("Không tìm thấy biên bản vi phạm.");

            var activeRestriction = (await _userRestrictionRepo.FindAsync(
                ur => ur.UserId == vr.UserId && ur.Status == "Hoạt động" && ur.StartAt <= DateTime.UtcNow && (ur.EndAt == null || ur.EndAt >= DateTime.UtcNow)
            )).OrderByDescending(ur => ur.EndAt).FirstOrDefault();

            var room = vr.UsageSession?.BookingDetail?.Room;
            var dto = new ViolationRecordDto
            {
                Id = vr.Id,
                Code = vr.Code ?? $"VP-{vr.Id:D4}",
                IncidentTime = vr.IncidentTime,
                Description = vr.Description,
                Severity = vr.Severity,
                SeverityText = GetSeverityText(vr.Severity),
                PenaltyApplied = vr.PenaltyApplied,
                Status = vr.Status,
                UserId = vr.UserId,
                UserName = vr.User?.UserName ?? "",
                UserFullName = vr.User?.FullName ?? "",
                UserCardCode = vr.User?.CardCode ?? "",
                UserEmail = vr.User?.Email ?? "",
                UserPhoneNumber = vr.User?.PhoneNumber,
                DepartmentName = vr.User?.Department?.Name,
                UsageSessionId = vr.UsageSessionId,
                RoomId = room?.Id,
                RoomCode = room?.RoomCode,
                RoomName = room?.Name,
                ViolationTypeId = vr.ViolationTypeId,
                ViolationTypeCode = vr.ViolationType?.Code ?? "",
                ViolationTypeName = vr.ViolationType?.Name ?? "",
                IsRestricted = activeRestriction != null,
                RestrictDays = activeRestriction?.EndAt != null ? Math.Max(0, (int)Math.Ceiling((activeRestriction.EndAt.Value - DateTime.UtcNow).TotalDays)) : 0,
                RestrictionEndAt = activeRestriction?.EndAt,
                CreatedAt = vr.CreatedAt
            };

            return ApiResponse<ViolationRecordDto>.SuccessResponse(dto);
        }

        public async Task<ApiResponse<ViolationRecordDto>> RecordViolationAsync(RecordViolationDto request)
        {
            // 1. Validate User
            var user = await _userManager.FindByIdAsync(request.UserId.ToString());
            if (user == null)
                return ApiResponse<ViolationRecordDto>.ErrorResponse("Người dùng không tồn tại.");

            // 2. Validate Violation Type
            var vt = await _violationTypeRepo.GetByIdAsync(request.ViolationTypeId);
            if (vt == null)
                return ApiResponse<ViolationRecordDto>.ErrorResponse("Loại vi phạm không tồn tại.");

            // 3. Validate Session if provided
            UsageSession? session = null;
            if (request.UsageSessionId.HasValue && request.UsageSessionId.Value > 0)
            {
                session = await _usageSessionRepo.GetByIdAsync(request.UsageSessionId.Value, s => s.BookingDetail, s => s.BookingDetail.Room);
            }

            // 4. Generate unique violation code: VP-yyyyMMdd-XXX
            var todayStr = DateTime.UtcNow.ToString("yyyyMMdd");
            var countToday = (await _violationRecordRepo.FindAsync(
                r => r.CreatedAt.Date == DateTime.UtcNow.Date ||
                     (r.Code != null && r.Code.StartsWith($"VP-{todayStr}"))
            )).Count();

            var newCode = $"VP-{todayStr}-{(countToday + 1):D3}";

            // 5. Create Violation Record
            var incidentTime = request.IncidentTime?.ToUniversalTime() ?? DateTime.UtcNow;
            var record = new ViolationRecord
            {
                Code = newCode,
                UserId = request.UserId,
                ViolationTypeId = request.ViolationTypeId,
                UsageSessionId = session?.Id,
                IncidentTime = incidentTime,
                Description = request.Description.Trim(),
                Severity = request.Severity > 0 ? request.Severity : vt.Severity,
                PenaltyApplied = !string.IsNullOrWhiteSpace(request.PenaltyApplied) ? request.PenaltyApplied.Trim() : vt.DefaultPenalty ?? "Cảnh cáo",
                Status = string.IsNullOrWhiteSpace(request.Status) ? "Chờ xử lý" : request.Status,
                CreatedAt = DateTime.UtcNow
            };

            await _violationRecordRepo.AddAsync(record);
            await _unitOfWork.SaveChangesAsync();

            // 6. Handle User Restriction if restrictDays > 0
            bool isRestricted = false;
            DateTime? restrictionEndAt = null;
            int restrictDays = request.RestrictDays;

            if (restrictDays > 0)
            {
                var startDate = DateTime.UtcNow;
                restrictionEndAt = startDate.AddDays(restrictDays);

                var restriction = new UserRestriction
                {
                    UserId = request.UserId,
                    RestrictionType = "Cấm mượn phòng",
                    Reason = $"[Biên bản #{newCode}] {record.PenaltyApplied}: {record.Description}",
                    StartAt = startDate,
                    EndAt = restrictionEndAt,
                    Status = "Hoạt động",
                    CreatedAt = DateTime.UtcNow
                };

                await _userRestrictionRepo.AddAsync(restriction);
                await _unitOfWork.SaveChangesAsync();
                isRestricted = true;
            }

            var room = session?.BookingDetail?.Room;
            var dto = new ViolationRecordDto
            {
                Id = record.Id,
                Code = record.Code,
                IncidentTime = record.IncidentTime,
                Description = record.Description,
                Severity = record.Severity,
                SeverityText = GetSeverityText(record.Severity),
                PenaltyApplied = record.PenaltyApplied,
                Status = record.Status,
                UserId = record.UserId,
                UserName = user.UserName ?? "",
                UserFullName = user.FullName ?? "",
                UserCardCode = user.CardCode ?? "",
                UserEmail = user.Email ?? "",
                UserPhoneNumber = user.PhoneNumber,
                UsageSessionId = record.UsageSessionId,
                RoomId = room?.Id,
                RoomCode = room?.RoomCode,
                RoomName = room?.Name,
                ViolationTypeId = vt.Id,
                ViolationTypeCode = vt.Code,
                ViolationTypeName = vt.Name,
                IsRestricted = isRestricted,
                RestrictDays = restrictDays,
                RestrictionEndAt = restrictionEndAt,
                CreatedAt = record.CreatedAt
            };

            return ApiResponse<ViolationRecordDto>.SuccessResponse(dto, $"Đã ghi nhận biên bản vi phạm {record.Code} thành công!");
        }

        public async Task<ApiResponse<ViolationRecordDto>> UpdateViolationRecordAsync(int id, UpdateViolationRecordDto request)
        {
            var record = await _violationRecordRepo.GetByIdAsync(
                id,
                v => v.User,
                v => v.ViolationType,
                v => v.UsageSession,
                v => v.UsageSession.BookingDetail,
                v => v.UsageSession.BookingDetail.Room);

            if (record == null) return ApiResponse<ViolationRecordDto>.ErrorResponse("Không tìm thấy biên bản vi phạm.");

            if (!string.IsNullOrWhiteSpace(request.Status))
                record.Status = request.Status;

            if (!string.IsNullOrWhiteSpace(request.PenaltyApplied))
                record.PenaltyApplied = request.PenaltyApplied.Trim();

            if (!string.IsNullOrWhiteSpace(request.Description))
                record.Description = request.Description.Trim();

            if (request.Severity.HasValue && request.Severity.Value > 0)
                record.Severity = request.Severity.Value;

            record.UpdatedAt = DateTime.UtcNow;

            _violationRecordRepo.Update(record);
            await _unitOfWork.SaveChangesAsync();

            return await GetViolationRecordByIdAsync(id);
        }

        public async Task<ApiResponse<bool>> DeleteViolationRecordAsync(int id)
        {
            var record = await _violationRecordRepo.GetByIdAsync(id);
            if (record == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy biên bản vi phạm.");

            _violationRecordRepo.Remove(record);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Đã xóa biên bản vi phạm.");
        }

        // ─────────────────────────────────────────────────────────────────
        // USER RESTRICTIONS
        // ─────────────────────────────────────────────────────────────────

        public async Task<ApiResponse<IEnumerable<UserRestrictionDto>>> GetRestrictionsAsync(string? status = null, string? search = null)
        {
            var list = await _userRestrictionRepo.GetAllAsync(ur => ur.User, ur => ur.User.Department);
            var now = DateTime.UtcNow;

            var query = list.AsEnumerable();

            // Filter status
            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                if (status == "ACTIVE")
                {
                    query = query.Where(ur => ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now));
                }
                else if (status == "EXPIRED")
                {
                    query = query.Where(ur => ur.Status != "Đã gỡ" && ur.EndAt != null && ur.EndAt < now);
                }
                else
                {
                    query = query.Where(ur => string.Equals(ur.Status, status, StringComparison.OrdinalIgnoreCase));
                }
            }

            // Search
            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                query = query.Where(ur =>
                    (ur.Reason != null && ur.Reason.ToLower().Contains(q)) ||
                    (ur.RestrictionType != null && ur.RestrictionType.ToLower().Contains(q)) ||
                    (ur.User != null && (
                        (ur.User.FullName != null && ur.User.FullName.ToLower().Contains(q)) ||
                        (ur.User.CardCode != null && ur.User.CardCode.ToLower().Contains(q)) ||
                        (ur.User.Email != null && ur.User.Email.ToLower().Contains(q)) ||
                        (ur.User.UserName != null && ur.User.UserName.ToLower().Contains(q))
                    ))
                );
            }

            var dtos = query
                .OrderByDescending(ur => ur.CreatedAt)
                .Select(ur =>
                {
                    bool isActive = ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now);
                    int? remainingDays = null;
                    if (isActive && ur.EndAt.HasValue)
                    {
                        remainingDays = Math.Max(0, (int)Math.Ceiling((ur.EndAt.Value - now).TotalDays));
                    }

                    string displayStatus = ur.Status;
                    if (ur.Status == "Hoạt động" && ur.EndAt.HasValue && ur.EndAt.Value < now)
                    {
                        displayStatus = "Hết hạn";
                    }

                    return new UserRestrictionDto
                    {
                        Id = ur.Id,
                        UserId = ur.UserId,
                        UserName = ur.User?.UserName ?? "",
                        UserFullName = ur.User?.FullName ?? "",
                        UserCardCode = ur.User?.CardCode ?? "",
                        UserEmail = ur.User?.Email ?? "",
                        DepartmentName = ur.User?.Department?.Name,
                        RestrictionType = ur.RestrictionType,
                        Reason = ur.Reason,
                        StartAt = ur.StartAt,
                        EndAt = ur.EndAt,
                        Status = displayStatus,
                        IsActive = isActive,
                        RemainingDays = remainingDays,
                        CreatedAt = ur.CreatedAt
                    };
                }).ToList();

            return ApiResponse<IEnumerable<UserRestrictionDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<UserRestrictionDto>> CreateRestrictionAsync(CreateUserRestrictionDto request)
        {
            var user = await _userManager.FindByIdAsync(request.UserId.ToString());
            if (user == null)
                return ApiResponse<UserRestrictionDto>.ErrorResponse("Người dùng không tồn tại.");

            var startAt = DateTime.UtcNow;
            var endAt = startAt.AddDays(request.Days);

            var restriction = new UserRestriction
            {
                UserId = request.UserId,
                RestrictionType = string.IsNullOrWhiteSpace(request.RestrictionType) ? "Cấm mượn phòng" : request.RestrictionType.Trim(),
                Reason = request.Reason.Trim(),
                StartAt = startAt,
                EndAt = endAt,
                Status = "Hoạt động",
                CreatedAt = DateTime.UtcNow
            };

            await _userRestrictionRepo.AddAsync(restriction);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<UserRestrictionDto>.SuccessResponse(new UserRestrictionDto
            {
                Id = restriction.Id,
                UserId = user.Id,
                UserName = user.UserName ?? "",
                UserFullName = user.FullName ?? "",
                UserCardCode = user.CardCode ?? "",
                UserEmail = user.Email ?? "",
                RestrictionType = restriction.RestrictionType,
                Reason = restriction.Reason,
                StartAt = restriction.StartAt,
                EndAt = restriction.EndAt,
                Status = "Hoạt động",
                IsActive = true,
                RemainingDays = request.Days,
                CreatedAt = restriction.CreatedAt
            }, $"Đã áp dụng lệnh cấm mượn phòng {request.Days} ngày đối với {user.FullName}.");
        }

        public async Task<ApiResponse<bool>> LiftRestrictionAsync(int restrictionId, string? reason = null)
        {
            var restr = await _userRestrictionRepo.GetByIdAsync(restrictionId, ur => ur.User);
            if (restr == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy lệnh hạn chế.");

            restr.Status = "Đã gỡ";
            restr.EndAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(reason))
                restr.Reason = $"{restr.Reason} [Đã gỡ sớm ngày {DateTime.UtcNow:dd/MM/yyyy}: {reason}]";
            restr.UpdatedAt = DateTime.UtcNow;

            _userRestrictionRepo.Update(restr);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, $"Đã gỡ bỏ lệnh cấm mượn phòng cho người dùng {restr.User?.FullName ?? ""}.");
        }

        public async Task<ApiResponse<UserEligibilityDto>> CheckUserEligibilityAsync(int userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null || user.IsDeleted || (user.Status != "Active" && user.Status != "Hoạt động"))
            {
                return ApiResponse<UserEligibilityDto>.SuccessResponse(new UserEligibilityDto
                {
                    IsEligible = false,
                    Message = "Tài khoản người dùng không hợp lệ hoặc đã bị khóa.",
                    HasActiveRestriction = false
                });
            }

            var now = DateTime.UtcNow;
            var activeRestrictions = await _userRestrictionRepo.FindAsync(
                ur => ur.UserId == userId && ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now)
            );
            var activeRestriction = activeRestrictions.OrderByDescending(ur => ur.EndAt).FirstOrDefault();

            if (activeRestriction != null)
            {
                var remainingDays = activeRestriction.EndAt.HasValue
                    ? (int)Math.Max(1, Math.Ceiling((activeRestriction.EndAt.Value - now).TotalDays))
                    : 999;

                var endStr = activeRestriction.EndAt.HasValue
                    ? activeRestriction.EndAt.Value.ToString("dd/MM/yyyy")
                    : "vô thời hạn";

                return ApiResponse<UserEligibilityDto>.SuccessResponse(new UserEligibilityDto
                {
                    IsEligible = false,
                    Message = $"Tài khoản đang bị tạm đình chỉ / cấm mượn phòng đến ngày {endStr}.",
                    HasActiveRestriction = true,
                    RestrictionType = activeRestriction.RestrictionType,
                    Reason = activeRestriction.Reason,
                    StartAt = activeRestriction.StartAt,
                    EndAt = activeRestriction.EndAt,
                    RemainingDays = remainingDays
                });
            }

            return ApiResponse<UserEligibilityDto>.SuccessResponse(new UserEligibilityDto
            {
                IsEligible = true,
                Message = "Người dùng đủ điều kiện đăng ký mượn phòng.",
                HasActiveRestriction = false
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // STATS
        // ─────────────────────────────────────────────────────────────────

        public async Task<ApiResponse<ViolationStatsDto>> GetStatsAsync()
        {
            var records = await _violationRecordRepo.GetAllAsync();
            var now = DateTime.UtcNow;
            var activeRestrictions = (await _userRestrictionRepo.FindAsync(
                ur => ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now)
            )).Select(ur => ur.UserId).Distinct().Count();

            var stats = new ViolationStatsDto
            {
                TotalRecords = records.Count(),
                PendingRecords = records.Count(r => r.Status == "Chờ xử lý"),
                ResolvedRecords = records.Count(r => r.Status == "Đã xử lý" || r.Status == "Đã nộp phạt"),
                ActiveRestrictions = activeRestrictions,
                SevereRecords = records.Count(r => r.Severity >= 3)
            };

            return ApiResponse<ViolationStatsDto>.SuccessResponse(stats);
        }

        // ─────────────────────────────────────────────────────────────────
        // UNIFIED SEARCH (Phòng, Người mượn, Phiếu mượn, Biên bản vi phạm)
        // ─────────────────────────────────────────────────────────────────

        public async Task<ApiResponse<GlobalSearchResultDto>> GlobalSearchAsync(string query)
        {
            var result = new GlobalSearchResultDto
            {
                Query = query ?? string.Empty
            };

            if (string.IsNullOrWhiteSpace(query))
                return ApiResponse<GlobalSearchResultDto>.SuccessResponse(result);

            var q = query.Trim().ToLower();

            // 1. Search Rooms
            var rooms = await _roomRepo.GetAllAsync(r => r.RoomType);
            result.Rooms = rooms.Where(r =>
                r.Name.ToLower().Contains(q) ||
                r.RoomCode.ToLower().Contains(q) ||
                (r.Building != null && r.Building.ToLower().Contains(q)) ||
                (r.Floor != null && r.Floor.ToLower().Contains(q)) ||
                (r.RoomType != null && r.RoomType.Name.ToLower().Contains(q))
            ).Take(10).Select(r => new GlobalSearchRoomItem
            {
                Id = r.Id,
                Name = r.Name,
                RoomCode = r.RoomCode,
                Building = r.Building,
                Floor = r.Floor,
                Capacity = r.Capacity,
                Status = r.Status,
                RoomTypeName = r.RoomType?.Name
            }).ToList();

            // 2. Search Users / Borrowers
            var users = _userManager.Users.Include(u => u.Department).ToList();
            var now = DateTime.UtcNow;
            var activeRestrictionUserIds = (await _userRestrictionRepo.FindAsync(
                ur => ur.Status == "Hoạt động" && ur.StartAt <= now && (ur.EndAt == null || ur.EndAt >= now)
            )).Select(ur => ur.UserId).ToHashSet();

            result.Users = users.Where(u =>
                (u.FullName != null && u.FullName.ToLower().Contains(q)) ||
                (u.CardCode != null && u.CardCode.ToLower().Contains(termMatch(q))) ||
                (u.Email != null && u.Email.ToLower().Contains(q)) ||
                (u.UserName != null && u.UserName.ToLower().Contains(q)) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(q))
            ).Take(10).Select(u => new GlobalSearchUserItem
            {
                Id = u.Id,
                UserName = u.UserName ?? "",
                FullName = u.FullName ?? "",
                CardCode = u.CardCode ?? "",
                Email = u.Email ?? "",
                PhoneNumber = u.PhoneNumber,
                Role = u.EmployeeProfile != null ? "Employee" : "User",
                Status = u.Status,
                DepartmentName = u.Department?.Name,
                HasActiveRestriction = activeRestrictionUserIds.Contains(u.Id)
            }).ToList();

            // 3. Search Bookings (Phiếu mượn)
            var bookings = await _bookingRepo.GetAllAsync(
                b => b.User,
                b => b.BookingDetails);

            result.Bookings = bookings.Where(b =>
                b.Id.ToString() == q ||
                $"#{b.Id}".Contains(q) ||
                (b.ActivityName != null && b.ActivityName.ToLower().Contains(q)) ||
                (b.Purpose != null && b.Purpose.ToLower().Contains(q)) ||
                (b.User != null && (
                    (b.User.FullName != null && b.User.FullName.ToLower().Contains(q)) ||
                    (b.User.CardCode != null && b.User.CardCode.ToLower().Contains(q))
                ))
            ).Take(10).Select(b => new GlobalSearchBookingItem
            {
                Id = b.Id,
                ActivityName = b.ActivityName,
                Purpose = b.Purpose,
                Status = b.Status,
                BorrowerName = b.User?.FullName ?? "",
                BorrowerCode = b.User?.CardCode ?? "",
                RoomsSummary = $"{b.BookingDetails?.Count ?? 0} phòng",
                RequestedAt = b.RequestedAt
            }).ToList();

            // 4. Search Violations (Biên bản vi phạm)
            var violations = await _violationRecordRepo.GetAllAsync(
                vr => vr.User,
                vr => vr.ViolationType);

            result.Violations = violations.Where(vr =>
                (vr.Code != null && vr.Code.ToLower().Contains(q)) ||
                (vr.Description != null && vr.Description.ToLower().Contains(q)) ||
                (vr.PenaltyApplied != null && vr.PenaltyApplied.ToLower().Contains(q)) ||
                (vr.ViolationType != null && vr.ViolationType.Name.ToLower().Contains(q)) ||
                (vr.User != null && (
                    (vr.User.FullName != null && vr.User.FullName.ToLower().Contains(q)) ||
                    (vr.User.CardCode != null && vr.User.CardCode.ToLower().Contains(q))
                ))
            ).Take(10).Select(vr => new GlobalSearchViolationItem
            {
                Id = vr.Id,
                Code = vr.Code ?? $"VP-{vr.Id:D4}",
                OffenderName = vr.User?.FullName ?? "",
                OffenderCode = vr.User?.CardCode ?? "",
                ViolationTypeName = vr.ViolationType?.Name ?? "",
                Description = vr.Description,
                PenaltyApplied = vr.PenaltyApplied,
                Severity = vr.Severity,
                Status = vr.Status,
                IncidentTime = vr.IncidentTime
            }).ToList();

            return ApiResponse<GlobalSearchResultDto>.SuccessResponse(result);
        }

        private static string termMatch(string q) => q;
    }
}
