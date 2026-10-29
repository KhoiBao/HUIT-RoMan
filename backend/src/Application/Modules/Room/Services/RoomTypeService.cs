using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Room.DTOs;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;

namespace HUIT_RoMan.Application.Modules.Room.Services
{
    public class RoomTypeService : IRoomTypeService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRepository<RoomType> _roomTypeRepo;
        private readonly ICurrentUserService _currentUser;

        public RoomTypeService(IUnitOfWork unitOfWork, ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _roomTypeRepo = _unitOfWork.Repository<RoomType>();
            _currentUser = currentUser;
        }

        public async Task<ApiResponse<IEnumerable<RoomTypeDto>>> GetAllAsync()
        {
            var roomTypes = await _roomTypeRepo.GetAllAsync();

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue)
            {
                roomTypes = roomTypes.Where(rt => rt.DepartmentId == _currentUser.DepartmentId.Value).ToList();
            }

            if (StudentBookingPolicy.IsStudent(_currentUser.Role))
            {
                roomTypes = roomTypes.Where(rt => StudentBookingPolicy.IsBookableRoomType(rt.Name)).ToList();
            }

            var dtos = roomTypes.Select(rt => new RoomTypeDto
            {
                Id = rt.Id,
                Name = rt.Name,
                Description = rt.Description,
                DefaultCapacity = rt.DefaultCapacity,
                DepartmentId = rt.DepartmentId,
                IsBookingByPeriod = rt.IsBookingByPeriod
            }).ToList();

            return ApiResponse<IEnumerable<RoomTypeDto>>.SuccessResponse(dtos);
        }

        public async Task<ApiResponse<RoomTypeDto>> GetByIdAsync(int id)
        {
            var rt = await _roomTypeRepo.GetByIdAsync(id);
            if (rt == null) return ApiResponse<RoomTypeDto>.ErrorResponse("Không tìm thấy loại phòng");

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue && rt.DepartmentId != _currentUser.DepartmentId.Value)
            {
                return ApiResponse<RoomTypeDto>.ErrorResponse("Bạn không có quyền xem loại phòng của đơn vị khác.");
            }

            var dto = new RoomTypeDto
            {
                Id = rt.Id,
                Name = rt.Name,
                Description = rt.Description,
                DefaultCapacity = rt.DefaultCapacity,
                DepartmentId = rt.DepartmentId,
                IsBookingByPeriod = rt.IsBookingByPeriod
            };

            return ApiResponse<RoomTypeDto>.SuccessResponse(dto);
        }

        public async Task<ApiResponse<RoomTypeDto>> CreateAsync(CreateRoomTypeDto request)
        {
            var rt = new RoomType
            {
                Name = request.Name,
                Description = request.Description,
                DefaultCapacity = request.DefaultCapacity,
                IsBookingByPeriod = request.IsBookingByPeriod,
                Status = "Hoạt động"
            };

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue)
            {
                rt.DepartmentId = _currentUser.DepartmentId.Value;
            }
            else if (_currentUser.IsAdmin)
            {
                rt.DepartmentId = request.DepartmentId;
            }

            await _roomTypeRepo.AddAsync(rt);
            await _unitOfWork.SaveChangesAsync();

            var dto = new RoomTypeDto
            {
                Id = rt.Id,
                Name = rt.Name,
                Description = rt.Description,
                DefaultCapacity = rt.DefaultCapacity,
                DepartmentId = rt.DepartmentId,
                IsBookingByPeriod = rt.IsBookingByPeriod
            };
            
            return ApiResponse<RoomTypeDto>.SuccessResponse(dto, "Tạo loại phòng thành công");
        }

        public async Task<ApiResponse<bool>> UpdateAsync(int id, CreateRoomTypeDto request)
        {
            var rt = await _roomTypeRepo.GetByIdAsync(id);
            if (rt == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy loại phòng");

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue && rt.DepartmentId != _currentUser.DepartmentId.Value)
            {
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền sửa loại phòng của đơn vị khác.");
            }

            rt.Name = request.Name;
            rt.Description = request.Description;
            rt.DefaultCapacity = request.DefaultCapacity;
            rt.IsBookingByPeriod = request.IsBookingByPeriod;

            if (_currentUser.IsAdmin)
            {
                rt.DepartmentId = request.DepartmentId;
            }

            _roomTypeRepo.Update(rt);
            await _unitOfWork.SaveChangesAsync();
            
            return ApiResponse<bool>.SuccessResponse(true, "Cập nhật thành công");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            var rt = await _roomTypeRepo.GetByIdAsync(id);
            if (rt == null) return ApiResponse<bool>.ErrorResponse("Không tìm thấy loại phòng");

            if (_currentUser.Role == "Employee" && _currentUser.DepartmentId.HasValue && rt.DepartmentId != _currentUser.DepartmentId.Value)
            {
                return ApiResponse<bool>.ErrorResponse("Bạn không có quyền xóa loại phòng của đơn vị khác.");
            }

            _roomTypeRepo.Remove(rt);
            await _unitOfWork.SaveChangesAsync();
            
            return ApiResponse<bool>.SuccessResponse(true, "Xóa thành công");
        }
    }
}
