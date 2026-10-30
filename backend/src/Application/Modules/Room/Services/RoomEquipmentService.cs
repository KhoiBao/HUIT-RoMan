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
    public class RoomEquipmentService : IRoomEquipmentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<RoomEquipment> _roomEquipmentRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;
        private readonly IRepository<Equipment> _equipmentRepo;

        public RoomEquipmentService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _roomEquipmentRepo = _unitOfWork.Repository<RoomEquipment>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _equipmentRepo = _unitOfWork.Repository<Equipment>();
        }

        public async Task<IEnumerable<RoomEquipmentDto>> GetByRoomIdAsync(int roomId)
        {
            var rEquipments = await _roomEquipmentRepo.FindAsync(re => re.RoomId == roomId && !re.IsDeleted, re => re.Equipment, re => re.Room);
            
            return rEquipments.Select(re =>
            {
                var isMasterMaint = re.Equipment != null && EquipmentService.IsUnderMaintenance(re.Equipment.Status);
                var status = isMasterMaint ? "Đang bảo trì" : (string.IsNullOrWhiteSpace(re.Status) ? "Hoạt động tốt" : re.Status);

                return new RoomEquipmentDto
                {
                    RoomId = re.RoomId,
                    RoomName = re.Room?.Name,
                    EquipmentId = re.EquipmentId,
                    EquipmentName = re.Equipment?.Name,
                    Quantity = re.Quantity,
                    Status = status
                };
            }).ToList();
        }

        public async Task<ApiResponse<bool>> AddOrUpdateEquipmentToRoomAsync(int roomId, AddRoomEquipmentDto request)
        {
            if (request.Quantity <= 0)
            {
                return ApiResponse<bool>.ErrorResponse("Số lượng thiết bị phải lớn hơn hoặc bằng 1.");
            }

            // Kiểm tra xem phòng có tồn tại hay không
            var room = await _roomRepo.GetByIdAsync(roomId);
            if (room == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy thông tin phòng học.");

            // Kiểm tra xem thiết bị có tồn tại hay không
            var equipment = await _equipmentRepo.GetByIdAsync(request.EquipmentId);
            if (equipment == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy thông tin thiết bị trong kho.");

            var existing = await _roomEquipmentRepo.FirstOrDefaultAsync(re => re.RoomId == roomId && re.EquipmentId == request.EquipmentId && !re.IsDeleted);

            if (existing != null)
            {
                int delta = request.Quantity - existing.Quantity;
                if (delta > 0)
                {
                    if (EquipmentService.IsUnderMaintenance(equipment.Status))
                    {
                        return ApiResponse<bool>.ErrorResponse(
                            $"Thiết bị \"{equipment.Name}\" đang trong trạng thái bảo trì trong kho, không thể cấp thêm vào phòng.");
                    }
                    if (equipment.AvailableQuantity < delta)
                    {
                        return ApiResponse<bool>.ErrorResponse(
                            $"Số lượng thiết bị \"{equipment.Name}\" trong kho không đủ. Kho hiện còn {equipment.AvailableQuantity} chiếc khả dụng để cấp thêm {delta} chiếc.");
                    }
                    equipment.AvailableQuantity -= delta;
                }
                else if (delta < 0)
                {
                    int returnQty = -delta;
                    equipment.AvailableQuantity += returnQty;
                    if (equipment.AvailableQuantity > equipment.TotalQuantity)
                    {
                        equipment.AvailableQuantity = equipment.TotalQuantity;
                    }
                }

                existing.Quantity = request.Quantity;
                if (!string.IsNullOrEmpty(request.Status))
                {
                    existing.Status = request.Status;
                }
                _roomEquipmentRepo.Update(existing);
                _equipmentRepo.Update(equipment);
            }
            else
            {
                // Thêm mới thiết bị vào phòng: Thiết bị bảo trì trong kho không được phép thêm mới vào phòng
                if (EquipmentService.IsUnderMaintenance(equipment.Status))
                {
                    return ApiResponse<bool>.ErrorResponse(
                        $"Thiết bị \"{equipment.Name}\" đang trong trạng thái bảo trì, không được phép thêm mới vào phòng hoặc sử dụng.");
                }

                if (equipment.AvailableQuantity < request.Quantity)
                {
                    return ApiResponse<bool>.ErrorResponse(
                        $"Số lượng thiết bị \"{equipment.Name}\" trong kho không đủ. Kho hiện còn {equipment.AvailableQuantity} chiếc khả dụng (yêu cầu {request.Quantity} chiếc).");
                }

                equipment.AvailableQuantity -= request.Quantity;
                if (equipment.AvailableQuantity < 0) equipment.AvailableQuantity = 0;

                var newRe = new RoomEquipment
                {
                    RoomId = roomId,
                    EquipmentId = request.EquipmentId,
                    Quantity = request.Quantity,
                    Status = string.IsNullOrWhiteSpace(request.Status) || request.Status == "Good" || request.Status == "Active" ? "Hoạt động tốt" : request.Status
                };
                await _roomEquipmentRepo.AddAsync(newRe);
                _equipmentRepo.Update(equipment);
            }

            await _unitOfWork.SaveChangesAsync();

            // Đồng bộ trạng thái phòng: Nếu có thiết bị bảo trì thì phòng chuyển sang Bảo trì, ngược lại hoàn trả về Trống
            await SyncRoomMaintenanceStatusAsync(roomId);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Phân bổ thiết bị vào phòng thành công.");
        }

        public async Task<ApiResponse<bool>> RemoveEquipmentFromRoomAsync(int roomId, int equipmentId)
        {
            var existing = await _roomEquipmentRepo.FirstOrDefaultAsync(re => re.RoomId == roomId && re.EquipmentId == equipmentId);
            if (existing == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy thiết bị trong phòng này.");

            var equipment = await _equipmentRepo.GetByIdAsync(equipmentId);
            if (equipment != null)
            {
                equipment.AvailableQuantity += existing.Quantity;
                if (equipment.AvailableQuantity > equipment.TotalQuantity)
                {
                    equipment.AvailableQuantity = equipment.TotalQuantity;
                }
                _equipmentRepo.Update(equipment);
            }

            _roomEquipmentRepo.HardRemove(existing);
            await _unitOfWork.SaveChangesAsync();

            // Đồng bộ trạng thái phòng sau khi thu hồi thiết bị
            await SyncRoomMaintenanceStatusAsync(roomId);
            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Đã thu hồi thiết bị khỏi phòng và hoàn trả về kho.");
        }

        public static bool IsEquipmentUnderMaintenance(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim().ToLowerInvariant();
            return s.Contains("bảo trì") || s.Contains("maintenance") || s.Contains("hỏng") || s.Contains("broken");
        }

        private async Task SyncRoomMaintenanceStatusAsync(int roomId)
        {
            var room = await _roomRepo.GetByIdAsync(roomId);
            if (room == null) return;

            var roomEquips = await _roomEquipmentRepo.FindAsync(
                re => re.RoomId == roomId && !re.IsDeleted,
                re => re.Equipment
            );

            bool hasMaintenanceEquip = roomEquips.Any(re =>
                IsEquipmentUnderMaintenance(re.Status) ||
                (re.Equipment != null && EquipmentService.IsUnderMaintenance(re.Equipment.Status))
            );

            if (hasMaintenanceEquip)
            {
                if (!room.Status.Equals(RoomStatuses.Maintenance, System.StringComparison.OrdinalIgnoreCase))
                {
                    room.Status = RoomStatuses.Maintenance;
                    _roomRepo.Update(room);
                }
            }
            else
            {
                if (room.Status.Equals("Bảo trì", System.StringComparison.OrdinalIgnoreCase) ||
                    room.Status.Equals("Maintenance", System.StringComparison.OrdinalIgnoreCase))
                {
                    room.Status = RoomStatuses.Available;
                    _roomRepo.Update(room);
                }
            }
        }
    }
}
