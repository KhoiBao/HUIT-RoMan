using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Shift.DTOs;
using HUIT_RoMan.Domain.Entities;

namespace HUIT_RoMan.Application.Modules.Shift.Services
{
    public class ShiftService : IShiftService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Domain.Entities.Shift> _shiftRepo;
        private readonly IRepository<ShiftLog> _shiftLogRepo;
        private readonly IRepository<Employee> _employeeRepo;
        private readonly ICurrentUserService _currentUser;

        public ShiftService(IUnitOfWork unitOfWork, ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _shiftRepo = _unitOfWork.Repository<Domain.Entities.Shift>();
            _shiftLogRepo = _unitOfWork.Repository<ShiftLog>();
            _employeeRepo = _unitOfWork.Repository<Employee>();
            _currentUser = currentUser;
        }

        // ─────────────────────────────────────────────────────────────────
        // 1. GET SHIFTS WITH FILTERS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<ShiftDto>>> GetShiftsAsync(ShiftFilterDto filter)
        {
            var shifts = await _shiftRepo.GetAllAsync(
                s => s.Employees
            );

            // Need employee full details
            var allEmployees = (await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department))
                .ToDictionary(e => e.Id);

            var query = shifts.AsEnumerable();

            if (filter.FromDate.HasValue)
            {
                var fromUtc = filter.FromDate.Value.Date.ToUniversalTime();
                query = query.Where(s => s.Date >= fromUtc);
            }

            if (filter.ToDate.HasValue)
            {
                var toUtc = filter.ToDate.Value.Date.AddDays(1).AddTicks(-1).ToUniversalTime();
                query = query.Where(s => s.Date <= toUtc);
            }

            if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "ALL")
            {
                query = query.Where(s => s.Status == filter.Status);
            }

            if (filter.EmployeeId.HasValue)
            {
                query = query.Where(s => s.Employees.Any(e => e.Id == filter.EmployeeId.Value));
            }

            if (filter.DepartmentId.HasValue)
            {
                query = query.Where(s => s.Employees.Any(e =>
                {
                    if (allEmployees.TryGetValue(e.Id, out var fullEmp))
                    {
                        return fullEmp.User?.DepartmentId == filter.DepartmentId.Value;
                    }
                    return false;
                }));
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var term = filter.Search.Trim().ToLower();
                query = query.Where(s =>
                    (s.Name != null && s.Name.ToLower().Contains(term)) ||
                    s.Employees.Any(e =>
                    {
                        if (allEmployees.TryGetValue(e.Id, out var fullEmp))
                        {
                            return (fullEmp.Code != null && fullEmp.Code.ToLower().Contains(term)) ||
                                   (fullEmp.User?.FullName != null && fullEmp.User.FullName.ToLower().Contains(term));
                        }
                        return false;
                    })
                );
            }

            var list = query
                .OrderByDescending(s => s.Date)
                .ThenBy(s => s.StartTime)
                .Select(s => MapToShiftDto(s, allEmployees))
                .ToList();

            return ApiResponse<IEnumerable<ShiftDto>>.SuccessResponse(list);
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. GET BY ID
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ShiftDto>> GetShiftByIdAsync(int id)
        {
            var shift = await _shiftRepo.GetByIdAsync(id, s => s.Employees);
            if (shift == null)
                return ApiResponse<ShiftDto>.ErrorResponse("Không tìm thấy ca trực.");

            var allEmployees = (await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department))
                .ToDictionary(e => e.Id);

            return ApiResponse<ShiftDto>.SuccessResponse(MapToShiftDto(shift, allEmployees));
        }

        // ─────────────────────────────────────────────────────────────────
        // 3. CREATE SHIFT
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ShiftDto>> CreateShiftAsync(CreateShiftDto dto)
        {
            if (dto.StartTime >= dto.EndTime)
                return ApiResponse<ShiftDto>.ErrorResponse("Giờ bắt đầu ca trực phải trước giờ kết thúc.");

            var shift = new Domain.Entities.Shift
            {
                Date = DateTime.SpecifyKind(dto.Date.Date, DateTimeKind.Utc),
                Name = dto.Name.Trim(),
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Lên lịch" : dto.Status,
                CreatedAt = DateTime.UtcNow
            };

            if (dto.EmployeeIds != null && dto.EmployeeIds.Any())
            {
                var emps = (await _employeeRepo.FindAsync(e => dto.EmployeeIds.Contains(e.Id))).ToList();
                foreach (var emp in emps)
                {
                    shift.Employees.Add(emp);
                }
            }

            await _shiftRepo.AddAsync(shift);
            await _unitOfWork.SaveChangesAsync();

            var allEmployees = (await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department))
                .ToDictionary(e => e.Id);

            return ApiResponse<ShiftDto>.SuccessResponse(MapToShiftDto(shift, allEmployees), "Khởi tạo ca trực thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 4. UPDATE SHIFT
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ShiftDto>> UpdateShiftAsync(int id, UpdateShiftDto dto)
        {
            var shift = await _shiftRepo.GetByIdAsync(id, s => s.Employees);
            if (shift == null)
                return ApiResponse<ShiftDto>.ErrorResponse("Không tìm thấy ca trực.");

            if (dto.StartTime >= dto.EndTime)
                return ApiResponse<ShiftDto>.ErrorResponse("Giờ bắt đầu ca trực phải trước giờ kết thúc.");

            shift.Date = DateTime.SpecifyKind(dto.Date.Date, DateTimeKind.Utc);
            shift.Name = dto.Name.Trim();
            shift.StartTime = dto.StartTime;
            shift.EndTime = dto.EndTime;
            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                shift.Status = dto.Status;
            }
            shift.UpdatedAt = DateTime.UtcNow;

            shift.Employees.Clear();
            if (dto.EmployeeIds != null && dto.EmployeeIds.Any())
            {
                var emps = (await _employeeRepo.FindAsync(e => dto.EmployeeIds.Contains(e.Id))).ToList();
                foreach (var emp in emps)
                {
                    shift.Employees.Add(emp);
                }
            }

            _shiftRepo.Update(shift);
            await _unitOfWork.SaveChangesAsync();

            var allEmployees = (await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department))
                .ToDictionary(e => e.Id);

            return ApiResponse<ShiftDto>.SuccessResponse(MapToShiftDto(shift, allEmployees), "Cập nhật ca trực thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 5. DELETE SHIFT
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<bool>> DeleteShiftAsync(int id)
        {
            var shift = await _shiftRepo.GetByIdAsync(id);
            if (shift == null)
                return ApiResponse<bool>.ErrorResponse("Không tìm thấy ca trực.");

            if (shift.Status == "Đang trực")
                return ApiResponse<bool>.ErrorResponse("Không thể xóa ca trực đang diễn ra.");

            _shiftRepo.Remove(shift);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Đã xóa ca trực thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 6. UPDATE STATUS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ShiftDto>> UpdateShiftStatusAsync(int id, string status)
        {
            var shift = await _shiftRepo.GetByIdAsync(id, s => s.Employees);
            if (shift == null)
                return ApiResponse<ShiftDto>.ErrorResponse("Không tìm thấy ca trực.");

            shift.Status = status;
            shift.UpdatedAt = DateTime.UtcNow;
            _shiftRepo.Update(shift);
            await _unitOfWork.SaveChangesAsync();

            var allEmployees = (await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department))
                .ToDictionary(e => e.Id);

            return ApiResponse<ShiftDto>.SuccessResponse(MapToShiftDto(shift, allEmployees), $"Trạng thái ca trực đã chuyển sang '{status}'.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 7. ASSIGN EMPLOYEES
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ShiftDto>> AssignEmployeesAsync(int id, List<int> employeeIds)
        {
            var shift = await _shiftRepo.GetByIdAsync(id, s => s.Employees);
            if (shift == null)
                return ApiResponse<ShiftDto>.ErrorResponse("Không tìm thấy ca trực.");

            shift.Employees.Clear();
            if (employeeIds != null && employeeIds.Any())
            {
                var emps = (await _employeeRepo.FindAsync(e => employeeIds.Contains(e.Id))).ToList();
                foreach (var emp in emps)
                {
                    shift.Employees.Add(emp);
                }
            }
            shift.UpdatedAt = DateTime.UtcNow;
            _shiftRepo.Update(shift);
            await _unitOfWork.SaveChangesAsync();

            var allEmployees = (await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department))
                .ToDictionary(e => e.Id);

            return ApiResponse<ShiftDto>.SuccessResponse(MapToShiftDto(shift, allEmployees), "Cập nhật phân công nhân viên thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 8. SHIFT LOGS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<ShiftLogDto>>> GetShiftLogsAsync(
            int? employeeId = null, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var logs = await _shiftLogRepo.GetAllAsync(sl => sl.Employee, sl => sl.Employee.User);
            var query = logs.AsEnumerable();

            if (employeeId.HasValue)
            {
                query = query.Where(sl => sl.EmployeeId == employeeId.Value);
            }

            if (fromDate.HasValue)
            {
                var f = fromDate.Value.Date.ToUniversalTime();
                query = query.Where(sl => sl.LogTime >= f);
            }

            if (toDate.HasValue)
            {
                var t = toDate.Value.Date.AddDays(1).AddTicks(-1).ToUniversalTime();
                query = query.Where(sl => sl.LogTime <= t);
            }

            var dtos = query
                .OrderByDescending(sl => sl.LogTime)
                .Take(100)
                .Select(sl => new ShiftLogDto
                {
                    Id = sl.Id,
                    LogTime = sl.LogTime,
                    Content = sl.Content,
                    Type = sl.Type,
                    TypeText = GetLogTypeText(sl.Type),
                    EmployeeId = sl.EmployeeId,
                    EmployeeName = sl.Employee?.User?.FullName ?? "Nhân viên trực",
                    EmployeeCode = sl.Employee?.Code ?? "",
                    EmployeePosition = sl.Employee?.Position
                }).ToList();

            return ApiResponse<IEnumerable<ShiftLogDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<ShiftLogDto>> CreateShiftLogAsync(CreateShiftLogDto dto)
        {
            int targetEmployeeId = dto.EmployeeId ?? 0;

            if (targetEmployeeId == 0 && _currentUser.UserId.HasValue)
            {
                var emp = await _employeeRepo.FirstOrDefaultAsync(e => e.UserId == _currentUser.UserId.Value);
                if (emp != null)
                {
                    targetEmployeeId = emp.Id;
                }
            }

            if (targetEmployeeId == 0)
            {
                var firstEmp = (await _employeeRepo.GetAllAsync()).FirstOrDefault();
                if (firstEmp == null)
                    return ApiResponse<ShiftLogDto>.ErrorResponse("Chưa có hồ sơ nhân viên trong hệ thống.");
                targetEmployeeId = firstEmp.Id;
            }

            var log = new ShiftLog
            {
                LogTime = DateTime.UtcNow,
                Content = dto.Content.Trim(),
                Type = dto.Type,
                EmployeeId = targetEmployeeId,
                CreatedAt = DateTime.UtcNow
            };

            await _shiftLogRepo.AddAsync(log);
            await _unitOfWork.SaveChangesAsync();

            var loaded = await _shiftLogRepo.GetByIdAsync(log.Id, sl => sl.Employee, sl => sl.Employee.User);

            var resDto = new ShiftLogDto
            {
                Id = loaded.Id,
                LogTime = loaded.LogTime,
                Content = loaded.Content,
                Type = loaded.Type,
                TypeText = GetLogTypeText(loaded.Type),
                EmployeeId = loaded.EmployeeId,
                EmployeeName = loaded.Employee?.User?.FullName ?? "Nhân viên trực",
                EmployeeCode = loaded.Employee?.Code ?? "",
                EmployeePosition = loaded.Employee?.Position
            };

            return ApiResponse<ShiftLogDto>.SuccessResponse(resDto, "Ghi nhật ký ca trực thành công.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 9. MY SHIFTS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<IEnumerable<ShiftDto>>> GetMyShiftsAsync(
            DateTime? fromDate = null, DateTime? toDate = null)
        {
            if (!_currentUser.UserId.HasValue)
                return ApiResponse<IEnumerable<ShiftDto>>.ErrorResponse("Bạn chưa đăng nhập.");

            var emp = await _employeeRepo.FirstOrDefaultAsync(e => e.UserId == _currentUser.UserId.Value);
            if (emp == null)
            {
                return ApiResponse<IEnumerable<ShiftDto>>.SuccessResponse(new List<ShiftDto>());
            }

            var allShifts = await _shiftRepo.GetAllAsync(s => s.Employees);
            var allEmployees = (await _employeeRepo.GetAllAsync(e => e.User, e => e.User.Department))
                .ToDictionary(e => e.Id);

            var query = allShifts.Where(s => s.Employees.Any(e => e.Id == emp.Id)).AsEnumerable();

            if (fromDate.HasValue)
            {
                var f = fromDate.Value.Date.ToUniversalTime();
                query = query.Where(s => s.Date >= f);
            }

            if (toDate.HasValue)
            {
                var t = toDate.Value.Date.AddDays(1).AddTicks(-1).ToUniversalTime();
                query = query.Where(s => s.Date <= t);
            }

            var list = query
                .OrderBy(s => s.Date)
                .ThenBy(s => s.StartTime)
                .Select(s => MapToShiftDto(s, allEmployees))
                .ToList();

            return ApiResponse<IEnumerable<ShiftDto>>.SuccessResponse(list);
        }

        // ─────────────────────────────────────────────────────────────────
        // 10. SHIFT STATS
        // ─────────────────────────────────────────────────────────────────
        public async Task<ApiResponse<ShiftStatsDto>> GetShiftStatsAsync()
        {
            var allShifts = (await _shiftRepo.GetAllAsync(s => s.Employees)).ToList();
            var allLogs = (await _shiftLogRepo.GetAllAsync()).ToList();

            var distinctEmployees = allShifts
                .SelectMany(s => s.Employees)
                .Select(e => e.Id)
                .Distinct()
                .Count();

            var stats = new ShiftStatsDto
            {
                TotalShifts = allShifts.Count,
                ScheduledShifts = allShifts.Count(s => s.Status == "Lên lịch" || s.Status == "Scheduled"),
                InProgressShifts = allShifts.Count(s => s.Status == "Đang trực" || s.Status == "InProgress"),
                CompletedShifts = allShifts.Count(s => s.Status == "Hoàn thành" || s.Status == "Completed"),
                CancelledShifts = allShifts.Count(s => s.Status == "Hủy" || s.Status == "Cancelled"),
                TotalAssignedEmployees = distinctEmployees,
                TotalLogs = allLogs.Count
            };

            return ApiResponse<ShiftStatsDto>.SuccessResponse(stats);
        }

        // ─────────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────────
        private static ShiftDto MapToShiftDto(Domain.Entities.Shift s, Dictionary<int, Employee> employeeDict)
        {
            var assigned = new List<AssignedEmployeeDto>();
            if (s.Employees != null)
            {
                foreach (var e in s.Employees)
                {
                    if (employeeDict.TryGetValue(e.Id, out var full))
                    {
                        assigned.Add(new AssignedEmployeeDto
                        {
                            Id = full.Id,
                            Code = full.Code ?? "",
                            FullName = full.User?.FullName ?? "",
                            Email = full.User?.Email ?? "",
                            PhoneNumber = full.User?.PhoneNumber,
                            Position = full.Position ?? "Nhân viên",
                            DepartmentName = full.User?.Department?.Name
                        });
                    }
                    else
                    {
                        assigned.Add(new AssignedEmployeeDto
                        {
                            Id = e.Id,
                            Code = e.Code ?? "",
                            FullName = "Nhân viên",
                            Position = e.Position ?? "Nhân viên"
                        });
                    }
                }
            }

            return new ShiftDto
            {
                Id = s.Id,
                Date = s.Date,
                Name = s.Name ?? "Ca trực",
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Status = s.Status ?? "Lên lịch",
                CreatedAt = s.CreatedAt,
                Employees = assigned
            };
        }

        private static string GetLogTypeText(int type) => type switch
        {
            1 => "Bàn giao ca trực",
            2 => "Sự cố phát sinh",
            3 => "Kiểm tra an ninh & vệ sinh",
            _ => "Ghi chú chung"
        };
    }
}
