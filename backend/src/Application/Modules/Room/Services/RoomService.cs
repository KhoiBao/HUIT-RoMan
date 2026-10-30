using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Domain;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public class RoomService : IRoomService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<RoomType> _roomTypeRepo;
        private readonly IRepository<BookingDetail> _bookingDetailRepo;
        private readonly ICurrentUserService _currentUser;

        public RoomService(IUnitOfWork unitOfWork, ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _roomTypeRepo = _unitOfWork.Repository<RoomType>();
            _bookingDetailRepo = _unitOfWork.Repository<BookingDetail>();
            _currentUser = currentUser;
        }

        public async Task<ApiResponse<IEnumerable<RoomDto>>> GetAllAsync()
        {
            var rooms = await _roomRepo.GetAllAsync(r => r.RoomType, r => r.RoomType.Department, r => r.RoomEquipments);

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                rooms = rooms.Where(r => r.RoomType?.DepartmentId == _currentUser.DepartmentId.Value).ToList();
            }

            if (StudentBookingPolicy.IsStudent(_currentUser.Role))
            {
                rooms = rooms.Where(r => StudentBookingPolicy.IsBookableRoomType(r.RoomType?.Name)).ToList();
            }

            foreach (var r in rooms)
            {
                var resolved = ResolveRoomStatus(r);
                if (!string.Equals(r.Status, resolved, System.StringComparison.OrdinalIgnoreCase))
                {
                    r.Status = resolved;
                    _roomRepo.Update(r);
                }
            }
            await _unitOfWork.SaveChangesAsync();

            var dtos = rooms.Select(r => new RoomDto
            {
                Id = r.Id,
                Name = r.Name,
                RoomCode = r.RoomCode,
                Building = r.Building,
                Floor = r.Floor,
                RoomNumber = r.RoomNumber,
                Capacity = r.Capacity,
                Status = ResolveRoomStatus(r),
                Description = r.Description,
                RoomTypeId = r.RoomTypeId,
                RoomTypeName = r.RoomType?.Name,
                IsBookingByPeriod = r.RoomType?.IsBookingByPeriod ?? false,

                DepartmentId = r.RoomType?.DepartmentId,

                DepartmentName = r.RoomType?.Department?.Name
            }).ToList();
            
            return ApiResponse<IEnumerable<RoomDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<RoomDto>> GetByIdAsync(int id)
        {
            var r = await _roomRepo.GetByIdAsync(id, r => r.RoomType, r => r.RoomType.Department, r => r.RoomEquipments);
            
            if (r == null) return ApiResponse<RoomDto>.ErrorResponse("Không tìm thấy phòng");

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                if (r.RoomType?.DepartmentId != _currentUser.DepartmentId.Value)
                {
                    return ApiResponse<RoomDto>.ErrorResponse("Bạn không có quyền xem phòng của đơn vị khác.");
                }
            }

            var resolvedStatus = ResolveRoomStatus(r);
            if (!string.Equals(r.Status, resolvedStatus, System.StringComparison.OrdinalIgnoreCase))
            {
                r.Status = resolvedStatus;
                _roomRepo.Update(r);
                await _unitOfWork.SaveChangesAsync();
            }

            var dto = new RoomDto
            {
                Id = r.Id,
                Name = r.Name,
                RoomCode = r.RoomCode,
                Building = r.Building,
                Floor = r.Floor,
                RoomNumber = r.RoomNumber,
                Capacity = r.Capacity,
                Status = resolvedStatus,
                Description = r.Description,
                RoomTypeId = r.RoomTypeId,
                RoomTypeName = r.RoomType?.Name,
                IsBookingByPeriod = r.RoomType?.IsBookingByPeriod ?? false,

                DepartmentId = r.RoomType?.DepartmentId,

                DepartmentName = r.RoomType?.Department?.Name
            };
            
            return ApiResponse<RoomDto>.SuccessResponse(dto);
        }

        public async Task<ApiResponse<RoomDto>> CreateAsync(CreateRoomDto request)
        {
            if (request.Capacity <= 0)
                return ApiResponse<RoomDto>.ErrorResponse("Sức chứa phòng phải lớn hơn 0.");
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Building)
                || string.IsNullOrWhiteSpace(request.Floor) || string.IsNullOrWhiteSpace(request.RoomNumber))
                return ApiResponse<RoomDto>.ErrorResponse("Tên phòng, tòa, tầng và số phòng là bắt buộc.");
            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                var roomType = await _roomTypeRepo.GetByIdAsync(request.RoomTypeId);
                if (roomType == null || roomType.DepartmentId != _currentUser.DepartmentId.Value)
                {
                    return ApiResponse<RoomDto>.ErrorResponse("Bạn chỉ có thể tạo phòng cho loại phòng thuộc đơn vị của mình.");
                }
            }

            var room = new Domain.Entities.Room
            {
                Name = request.Name,
                RoomCode =  request.Building + request.Floor + request.RoomNumber,
                Building = request.Building,
                Floor = request.Floor,
                RoomNumber = request.RoomNumber,
                Capacity = request.Capacity,
                Status = "Trống",
                Description = request.Description,
                RoomTypeId = request.RoomTypeId
            };

            await _roomRepo.AddAsync(room);
            await _unitOfWork.SaveChangesAsync();

            var result = await GetByIdAsync(room.Id);
            return ApiResponse<RoomDto>.SuccessResponse(result.Data, "Tạo phòng thành công");
        }

        public async Task<ApiResponse<bool>> UpdateAsync(int id, UpdateRoomDto request)
        {
            if (request.Capacity <= 0)
                return ApiResponse<bool>.ErrorResponse("Sức chứa phòng phải lớn hơn 0.");
            var normalizedStatus = request.Status switch
            {
                "Available" or "Trống" => RoomStatuses.Available,
                "InUse" or "Đang sử dụng" => RoomStatuses.InUse,
                "Maintenance" or "Bảo trì" => RoomStatuses.Maintenance,
                _ => null
            };
            if (normalizedStatus == null)
                return ApiResponse<bool>.ErrorResponse("Trạng thái phòng không hợp lệ.");
            var r = await _roomRepo.GetByIdAsync(id, r => r.RoomType, r => r.RoomType.Department);
            if (r == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy phòng");

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                if (r.RoomType?.DepartmentId != _currentUser.DepartmentId.Value)
                {
                    return ApiResponse<bool>.ErrorResponse("Bạn không có quyền sửa phòng của đơn vị khác.");
                }
            }

            r.Name = request.Name;
            r.RoomCode = request.Building + request.Floor + request.RoomNumber;
            r.Building = request.Building;
            r.Floor = request.Floor;
            r.RoomNumber = request.RoomNumber;
            r.Capacity = request.Capacity;
            r.Status = normalizedStatus;
            r.Description = request.Description;
            r.RoomTypeId = request.RoomTypeId;

            _roomRepo.Update(r);
            await _unitOfWork.SaveChangesAsync();
            
            return ApiResponse<bool>.SuccessResponse(true, "Cập nhật thành công");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            var r = await _roomRepo.GetByIdAsync(id, r => r.RoomType, r => r.RoomType.Department);
            if (r == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy phòng");

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                if (r.RoomType?.DepartmentId != _currentUser.DepartmentId.Value)
                {
                    return ApiResponse<bool>.ErrorResponse("Bạn không có quyền xóa phòng của đơn vị khác.");
                }
            }

            _roomRepo.Remove(r);
            await _unitOfWork.SaveChangesAsync();
            
            return ApiResponse<bool>.SuccessResponse(true, "Xóa phòng thành công");
        }

        public async Task<ApiResponse<IEnumerable<RoomDto>>> SearchAsync(
            string? keyword,
            int? roomTypeId,
            string? building,
            string? floor,
            string? status,
            int? minCapacity)
        {
            var rooms = await _roomRepo.GetAllAsync(r => r.RoomType, r => r.RoomType.Department);

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                rooms = rooms.Where(r => r.RoomType?.DepartmentId == _currentUser.DepartmentId.Value).ToList();
            }

            if (StudentBookingPolicy.IsStudent(_currentUser.Role))
            {
                rooms = rooms.Where(r => StudentBookingPolicy.IsBookableRoomType(r.RoomType?.Name)).ToList();
            }

            var query = rooms.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var term = keyword.Trim().ToLower();
                query = query.Where(r =>
                    r.Name.ToLower().Contains(term) ||
                    r.RoomCode.ToLower().Contains(term) ||
                    (r.Building != null && r.Building.ToLower().Contains(term)) ||
                    (r.Floor != null && r.Floor.ToLower().Contains(term)) ||
                    (r.RoomType != null && r.RoomType.Name.ToLower().Contains(term))
                );
            }

            if (roomTypeId.HasValue && roomTypeId.Value > 0)
                query = query.Where(r => r.RoomTypeId == roomTypeId.Value);

            if (!string.IsNullOrWhiteSpace(building) && building != "ALL")
                query = query.Where(r => string.Equals(r.Building, building, System.StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrWhiteSpace(floor) && floor != "ALL")
                query = query.Where(r => string.Equals(r.Floor, floor, System.StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
                query = query.Where(r => string.Equals(r.Status, status, System.StringComparison.OrdinalIgnoreCase));

            if (minCapacity.HasValue && minCapacity.Value > 0)
                query = query.Where(r => r.Capacity >= minCapacity.Value);

            var dtos = query.Select(r => new RoomDto
            {
                Id = r.Id,
                Name = r.Name,
                RoomCode = r.RoomCode,
                Building = r.Building,
                Floor = r.Floor,
                RoomNumber = r.RoomNumber,
                Capacity = r.Capacity,
                Status = r.Status,
                Description = r.Description,
                RoomTypeId = r.RoomTypeId,
                RoomTypeName = r.RoomType?.Name,
                IsBookingByPeriod = r.RoomType?.IsBookingByPeriod ?? false,

                DepartmentId = r.RoomType?.DepartmentId,

                DepartmentName = r.RoomType?.Department?.Name
            }).ToList();

            return ApiResponse<IEnumerable<RoomDto>>.SuccessResponse(dtos);
        }

        /// <summary>
        /// Danh mục phòng có phân trang, lọc theo từ khóa/loại/tòa/tầng/sức chứa
        /// và trạng thái vận hành. Trạng thái free/in-use được xác định theo
        /// lịch đặt của ngày được truyền vào (giờ Việt Nam).
        /// </summary>
        public async Task<ApiResponse<PagedRoomResultDto>> GetPagedAsync(PagedRoomQueryDto query)
        {
            var page = query.Page < 1 ? 1 : query.Page;
            var pageSize = query.PageSize <= 0 ? 10 : System.Math.Min(query.PageSize, 100);

            var rooms = await _roomRepo.GetAllAsync(r => r.RoomType, r => r.RoomType.Department);
            var roomList = rooms.ToList();

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                roomList = roomList
                    .Where(r => r.RoomType?.DepartmentId == _currentUser.DepartmentId.Value)
                    .ToList();
            }

            if (StudentBookingPolicy.IsStudent(_currentUser.Role))
            {
                roomList = roomList
                    .Where(r => StudentBookingPolicy.IsBookableRoomType(r.RoomType?.Name))
                    .ToList();
            }

            var filtered = roomList.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var term = query.Keyword.Trim().ToLowerInvariant();
                filtered = filtered.Where(r =>
                    r.Name.ToLower().Contains(term) ||
                    r.RoomCode.ToLower().Contains(term) ||
                    (r.Building != null && r.Building.ToLower().Contains(term)) ||
                    (r.Floor != null && r.Floor.ToLower().Contains(term)) ||
                    (r.RoomType?.Name != null && r.RoomType.Name.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(query.RoomType) && query.RoomType != "all")
            {
                filtered = filtered.Where(r =>
                    string.Equals(r.RoomType?.Name, query.RoomType, System.StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(query.Building) && query.Building != "all")
            {
                filtered = filtered.Where(r =>
                    string.Equals(r.Building, query.Building, System.StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(query.Floor) && query.Floor != "all")
            {
                filtered = filtered.Where(r =>
                    string.Equals(r.Floor, query.Floor, System.StringComparison.OrdinalIgnoreCase));
            }

            if (query.MinCapacity.HasValue && query.MinCapacity.Value > 0)
            {
                filtered = filtered.Where(r => r.Capacity >= query.MinCapacity.Value);
            }

            var statusFilter = (query.Status ?? "all").Trim().ToLowerInvariant();
            if (statusFilter == "free" || statusFilter == "in-use" || statusFilter == "maintenance")
            {
                var localDate = (query.Date ?? System.DateTime.Today).Date;
                var windowStart = System.DateTime.SpecifyKind(
                    localDate.AddHours(-7), System.DateTimeKind.Utc);
                var windowEnd = System.DateTime.SpecifyKind(
                    localDate.AddDays(1).AddHours(-7), System.DateTimeKind.Utc);
                var nowUtc = System.DateTime.UtcNow;

                var details = await _bookingDetailRepo.FindAsync(
                    bd => bd.Status != "Từ chối"
                       && bd.Status != "Đã hủy"
                       && bd.StartAt < windowEnd
                       && bd.EndAt > windowStart);
                var detailsByRoom = details
                    .GroupBy(bd => bd.RoomId)
                    .ToDictionary(group => group.Key, group => group.ToList());

                filtered = filtered.Where(room =>
                {
                    detailsByRoom.TryGetValue(room.Id, out var roomDetails);
                    var state = GetLiveRoomState(room, roomDetails, nowUtc);
                    return state == statusFilter;
                });
            }

            var ordered = filtered
                .OrderBy(r => int.TryParse(r.Floor, out var floorNumber) ? floorNumber : int.MaxValue)
                .ThenBy(r => r.RoomCode, System.StringComparer.OrdinalIgnoreCase)
                .ToList();

            var totalItems = ordered.Count;
            var totalPages = totalItems == 0
                ? 0
                : (int)System.Math.Ceiling(totalItems / (double)pageSize);
            if (totalPages > 0 && page > totalPages) page = totalPages;

            var items = ordered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new RoomDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    RoomCode = r.RoomCode,
                    Building = r.Building,
                    Floor = r.Floor,
                    RoomNumber = r.RoomNumber,
                    Capacity = r.Capacity,
                    Status = ResolveRoomStatus(r),
                    Description = r.Description,
                    RoomTypeId = r.RoomTypeId,
                    RoomTypeName = r.RoomType?.Name,
                    IsBookingByPeriod = r.RoomType?.IsBookingByPeriod ?? false,

                DepartmentId = r.RoomType?.DepartmentId,

                DepartmentName = r.RoomType?.Department?.Name
                })
                .ToList();

            return ApiResponse<PagedRoomResultDto>.SuccessResponse(new PagedRoomResultDto
            {
                Items = items,
                Page = totalPages == 0 ? 1 : page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            });
        }

        private static string GetLiveRoomState(
            Domain.Entities.Room room,
            IReadOnlyCollection<BookingDetail>? details,
            System.DateTime nowUtc)
        {
            var status = NormalizeRoomStatus(room.Status);
            if (status == "maintenance") return "maintenance";
            if (room.RoomEquipments != null && room.RoomEquipments.Any(re =>
                !re.IsDeleted && (EquipmentService.IsUnderMaintenance(re.Status) ||
                                 (re.Equipment != null && EquipmentService.IsUnderMaintenance(re.Equipment.Status)))))
            {
                return "maintenance";
            }
            if (status == "in-use") return "in-use";
            if (details == null || details.Count == 0) return "free";

            var inUse = details.Any(detail =>
                detail.Status == "Đang sử dụng"
                || (nowUtc >= detail.StartAt && nowUtc < detail.EndAt));
            return inUse ? "in-use" : "booked";
        }

        public static string ResolveRoomStatus(Domain.Entities.Room room)
        {
            var raw = (room.Status ?? string.Empty).Trim();
            if (raw.Equals("Maintenance", System.StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("Bảo trì", System.StringComparison.OrdinalIgnoreCase))
            {
                return RoomStatuses.Maintenance;
            }

            if (room.RoomEquipments != null && room.RoomEquipments.Any(re =>
                !re.IsDeleted && (RoomEquipmentService.IsEquipmentUnderMaintenance(re.Status) ||
                                 (re.Equipment != null && EquipmentService.IsUnderMaintenance(re.Equipment.Status)))))
            {
                return RoomStatuses.Maintenance;
            }

            if (raw.Equals("InUse", System.StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("Đang sử dụng", System.StringComparison.OrdinalIgnoreCase))
            {
                return RoomStatuses.InUse;
            }

            return RoomStatuses.Available;
        }

        private static string NormalizeRoomStatus(string? status)
        {
            var value = (status ?? string.Empty).Trim().ToLowerInvariant();
            if (value == "bảo trì" || value == "bao tri" || value == "maintenance")
                return "maintenance";
            if (value == "đang sử dụng" || value == "dang su dung"
                || value == "inuse" || value == "in use")
                return "in-use";
            return "free";
        }
    }
}
