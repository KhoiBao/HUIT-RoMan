using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Room.DTOs;
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
        private readonly ICurrentUserService _currentUser;

        public RoomService(IUnitOfWork unitOfWork, ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
            _roomTypeRepo = _unitOfWork.Repository<RoomType>();
            _currentUser = currentUser;
        }

        public async Task<ApiResponse<IEnumerable<RoomDto>>> GetAllAsync()
        {
            var rooms = await _roomRepo.GetAllAsync(r => r.RoomType);

            if (!_currentUser.IsAdmin && _currentUser.DepartmentId.HasValue)
            {
                rooms = rooms.Where(r => r.RoomType?.DepartmentId == _currentUser.DepartmentId).ToList();
            }

            var dtos = rooms.Select(r => new RoomDto
            {
                Id = r.Id,
                Name = r.Name,
                RoomCode = r.RoomCode,
                Building = r.Building,
                Capacity = r.Capacity,
                Status = r.Status,
                RoomTypeId = r.RoomTypeId,
                RoomTypeName = r.RoomType?.Name
            }).ToList();
            
            return ApiResponse<IEnumerable<RoomDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<RoomDto>> GetByIdAsync(int id)
        {
            var r = await _roomRepo.GetByIdAsync(id, r => r.RoomType);
            
            if (r == null) return ApiResponse<RoomDto>.ErrorResponse("Không tìm thấy phòng");

            if (!_currentUser.IsAdmin && _currentUser.DepartmentId.HasValue)
            {
                if (r.RoomType?.DepartmentId != _currentUser.DepartmentId)
                {
                    return ApiResponse<RoomDto>.ErrorResponse("Bạn không có quyền xem phòng của khoa khác.");
                }
            }

            var dto = new RoomDto
            {
                Id = r.Id,
                Name = r.Name,
                RoomCode = r.RoomCode,
                Building = r.Building,
                Capacity = r.Capacity,
                Status = r.Status,
                RoomTypeId = r.RoomTypeId,
                RoomTypeName = r.RoomType?.Name
            };
            
            return ApiResponse<RoomDto>.SuccessResponse(dto);
        }

        public async Task<ApiResponse<RoomDto>> CreateAsync(CreateRoomDto request)
        {
            if (!_currentUser.IsAdmin && _currentUser.DepartmentId.HasValue)
            {
                var roomType = await _roomTypeRepo.GetByIdAsync(request.RoomTypeId);
                if (roomType == null || roomType.DepartmentId != _currentUser.DepartmentId)
                {
                    return ApiResponse<RoomDto>.ErrorResponse("Bạn chỉ có thể tạo phòng cho loại phòng thuộc khoa của mình.");
                }
            }

            var room = new Domain.Entities.Room
            {
                Name = request.Name,
                RoomCode = request.RoomCode,
                Building = request.Building,
                Capacity = request.Capacity,
                Status = "Available",
                RoomTypeId = request.RoomTypeId
            };

            await _roomRepo.AddAsync(room);
            await _unitOfWork.SaveChangesAsync();

            var result = await GetByIdAsync(room.Id);
            return ApiResponse<RoomDto>.SuccessResponse(result.Data, "Tạo phòng thành công");
        }

        public async Task<ApiResponse<bool>> UpdateAsync(int id, UpdateRoomDto request)
        {
            var r = await _roomRepo.GetByIdAsync(id, r => r.RoomType);
            if (r == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy phòng");

            if (!_currentUser.IsAdmin && _currentUser.DepartmentId.HasValue)
            {
                if (r.RoomType?.DepartmentId != _currentUser.DepartmentId)
                {
                    return ApiResponse<bool>.ErrorResponse("Bạn không có quyền sửa phòng của khoa khác.");
                }
                
                // Allow transfer, we don't check if the new RoomTypeId belongs to their department
                // since they said "Nhân viên được phép chuyển phòng sang khoa khác"
            }

            r.Name = request.Name;
            r.RoomCode = request.RoomCode;
            r.Building = request.Building;
            r.Capacity = request.Capacity;
            r.Status = request.Status;
            r.RoomTypeId = request.RoomTypeId;

            _roomRepo.Update(r);
            await _unitOfWork.SaveChangesAsync();
            
            return ApiResponse<bool>.SuccessResponse(true, "Cập nhật thành công");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            var r = await _roomRepo.GetByIdAsync(id, r => r.RoomType);
            if (r == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy phòng");

            if (!_currentUser.IsAdmin && _currentUser.DepartmentId.HasValue)
            {
                if (r.RoomType?.DepartmentId != _currentUser.DepartmentId)
                {
                    return ApiResponse<bool>.ErrorResponse("Bạn không có quyền xóa phòng của khoa khác.");
                }
            }

            _roomRepo.Remove(r);
            await _unitOfWork.SaveChangesAsync();
            
            return ApiResponse<bool>.SuccessResponse(true, "Xóa phòng thành công");
        }
    }
}
