using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Domain;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public class EquipmentService : IEquipmentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<Equipment> _equipmentRepo;

        public EquipmentService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _equipmentRepo = _unitOfWork.Repository<Equipment>();
        }

        public async Task<IEnumerable<EquipmentDto>> GetAllAsync()
        {
            var equipments = await _equipmentRepo.GetAllAsync(e => e.RoomEquipments);
            return equipments.Select(e =>
            {
                var allocated = e.RoomEquipments?.Where(re => !re.IsDeleted).Sum(re => re.Quantity) ?? 0;
                return new EquipmentDto
                {
                    Id = e.Id,
                    Code = e.Code,
                    Name = e.Name,
                    Description = e.Description,
                    Status = e.Status,
                    EquipmentCategoryId = e.EquipmentCategoryId,
                    TotalQuantity = e.TotalQuantity,
                    AvailableQuantity = e.AvailableQuantity,
                    AllocatedQuantity = allocated
                };
            }).ToList();
        }

        public async Task<EquipmentDto> GetByIdAsync(int id)
        {
            var e = await _equipmentRepo.GetByIdAsync(id, eq => eq.RoomEquipments);
            if (e == null) return null;

            var allocated = e.RoomEquipments?.Where(re => !re.IsDeleted).Sum(re => re.Quantity) ?? 0;

            return new EquipmentDto
            {
                Id = e.Id,
                Code = e.Code,
                Name = e.Name,
                Description = e.Description,
                Status = e.Status,
                EquipmentCategoryId = e.EquipmentCategoryId,
                TotalQuantity = e.TotalQuantity,
                AvailableQuantity = e.AvailableQuantity,
                AllocatedQuantity = allocated
            };
        }

        public async Task<EquipmentDto> CreateAsync(CreateEquipmentDto request)
        {
            var qty = request.TotalQuantity > 0 ? request.TotalQuantity : 1;
            var initialStatus = !string.IsNullOrWhiteSpace(request.Status) ? NormalizeStatus(request.Status) : "Đang hoạt động";
            var equipment = new Equipment
            {
                Code = request.Code,
                Name = request.Name,
                Description = request.Description,
                Status = initialStatus,
                EquipmentCategoryId = request.EquipmentCategoryId,
                TotalQuantity = qty,
                AvailableQuantity = qty
            };

            await _equipmentRepo.AddAsync(equipment);
            await _unitOfWork.SaveChangesAsync();

            return new EquipmentDto
            {
                Id = equipment.Id,
                Code = equipment.Code,
                Name = equipment.Name,
                Description = equipment.Description,
                Status = equipment.Status,
                EquipmentCategoryId = equipment.EquipmentCategoryId,
                TotalQuantity = equipment.TotalQuantity,
                AvailableQuantity = equipment.AvailableQuantity,
                AllocatedQuantity = 0
            };
        }

        public async Task<ApiResponse<bool>> UpdateAsync(int id, CreateEquipmentDto request)
        {
            var e = await _equipmentRepo.GetByIdAsync(id, eq => eq.RoomEquipments);
            if (e == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy thiết bị.");

            int allocated = e.RoomEquipments?.Where(re => !re.IsDeleted).Sum(re => re.Quantity) ?? 0;
            int newTotal = request.TotalQuantity > 0 ? request.TotalQuantity : e.TotalQuantity;

            if (newTotal < allocated)
            {
                return ApiResponse<bool>.ErrorResponse(
                    $"Tổng số lượng ({newTotal}) không thể nhỏ hơn số lượng đang phân bổ trong các phòng ({allocated}).");
            }

            int delta = newTotal - e.TotalQuantity;
            e.TotalQuantity = newTotal;
            e.AvailableQuantity += delta;
            if (e.AvailableQuantity < 0) e.AvailableQuantity = 0;

            e.Code = request.Code;
            e.Name = request.Name;
            e.Description = request.Description;
            e.EquipmentCategoryId = request.EquipmentCategoryId;

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                e.Status = NormalizeStatus(request.Status);
                var isMaint = IsUnderMaintenance(e.Status);
                var roomEquipRepo = _unitOfWork.Repository<RoomEquipment>();
                var roomEquips = await roomEquipRepo.FindAsync(re => re.EquipmentId == id && !re.IsDeleted);
                foreach (var re in roomEquips)
                {
                    if (isMaint)
                    {
                        re.Status = "Đang bảo trì";
                    }
                    else if (re.Status == "Đang bảo trì")
                    {
                        re.Status = "Hoạt động tốt";
                    }
                    roomEquipRepo.Update(re);
                }

                // Đồng bộ trạng thái phòng bị ảnh hưởng
                var affectedRoomIds = roomEquips.Select(re => re.RoomId).Distinct().ToList();
                await SyncRoomsAfterEquipmentStatusChangeAsync(affectedRoomIds, isMaint);
            }

            _equipmentRepo.Update(e);
            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<bool>.SuccessResponse(true, "Cập nhật thiết bị thành công.");
        }

        public async Task<ApiResponse<bool>> UpdateStatusAsync(int id, string status)
        {
            var e = await _equipmentRepo.GetByIdAsync(id, eq => eq.RoomEquipments);
            if (e == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy thiết bị.");

            e.Status = NormalizeStatus(status);
            _equipmentRepo.Update(e);

            var isMaint = IsUnderMaintenance(e.Status);
            var roomEquipRepo = _unitOfWork.Repository<RoomEquipment>();
            var roomEquips = await roomEquipRepo.FindAsync(re => re.EquipmentId == id && !re.IsDeleted);
            foreach (var re in roomEquips)
            {
                if (isMaint)
                {
                    re.Status = "Đang bảo trì";
                }
                else if (re.Status == "Đang bảo trì")
                {
                    re.Status = "Hoạt động tốt";
                }
                roomEquipRepo.Update(re);
            }

            // Đồng bộ trạng thái phòng bị ảnh hưởng
            var affectedRoomIds = roomEquips.Select(re => re.RoomId).Distinct().ToList();
            await SyncRoomsAfterEquipmentStatusChangeAsync(affectedRoomIds, isMaint);

            await _unitOfWork.SaveChangesAsync();
            return ApiResponse<bool>.SuccessResponse(true, $"Đã cập nhật trạng thái thiết bị thành \"{e.Status}\".");
        }

        public static string NormalizeStatus(string status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "Đang hoạt động";
            var s = status.Trim().ToLowerInvariant();
            if (s.Contains("bảo trì") || s.Contains("maintenance"))
            {
                return "Đang bảo trì";
            }
            if (s.Contains("hỏng") || s.Contains("broken"))
            {
                return "Hỏng hóc";
            }
            if (s.Contains("thanh lý") || s.Contains("disposed"))
            {
                return "Đã thanh lý";
            }
            return "Đang hoạt động";
        }

        public static bool IsUnderMaintenance(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim().ToLowerInvariant();
            return s.Contains("bảo trì") || s.Contains("maintenance");
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var e = await _equipmentRepo.GetByIdAsync(id, eq => eq.RoomEquipments);
            if (e == null) return false;

            var affectedRoomIds = (e.RoomEquipments ?? new List<RoomEquipment>())
                .Where(re => !re.IsDeleted)
                .Select(re => re.RoomId)
                .Distinct()
                .ToList();

            _equipmentRepo.Remove(e);
            await _unitOfWork.SaveChangesAsync();

            if (affectedRoomIds.Count > 0)
            {
                await SyncRoomsAfterEquipmentStatusChangeAsync(affectedRoomIds, false);
                await _unitOfWork.SaveChangesAsync();
            }

            return true;
        }

        private async Task SyncRoomsAfterEquipmentStatusChangeAsync(List<int> roomIds, bool isMaint)
        {
            if (roomIds == null || roomIds.Count == 0) return;

            var roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            var roomEquipRepo = _unitOfWork.Repository<RoomEquipment>();

            foreach (var rId in roomIds)
            {
                var room = await roomRepo.GetByIdAsync(rId);
                if (room == null) continue;

                if (isMaint)
                {
                    if (!room.Status.Equals(RoomStatuses.Maintenance, System.StringComparison.OrdinalIgnoreCase))
                    {
                        room.Status = RoomStatuses.Maintenance;
                        roomRepo.Update(room);
                    }
                }
                else
                {
                    var allEquipsInRoom = await roomEquipRepo.FindAsync(
                        re => re.RoomId == rId && !re.IsDeleted,
                        re => re.Equipment);

                    bool stillHasMaint = allEquipsInRoom.Any(re =>
                        RoomEquipmentService.IsEquipmentUnderMaintenance(re.Status) ||
                        (re.Equipment != null && IsUnderMaintenance(re.Equipment.Status)));

                    if (!stillHasMaint)
                    {
                        if (room.Status.Equals("Bảo trì", System.StringComparison.OrdinalIgnoreCase) ||
                            room.Status.Equals("Maintenance", System.StringComparison.OrdinalIgnoreCase))
                        {
                            room.Status = RoomStatuses.Available;
                            roomRepo.Update(room);
                        }
                    }
                }
            }
        }
    }
}
