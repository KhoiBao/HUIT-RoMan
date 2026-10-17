using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Department.DTOs;
using HUIT_RoMan.Domain.Entities;
using EntitiesDepartment = HUIT_RoMan.Domain.Entities.Department;

namespace HUIT_RoMan.Application.Modules.Department.Services
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IRepository<EntitiesDepartment> _departmentRepo;
        private readonly IUnitOfWork _unitOfWork;

        public DepartmentService(IRepository<EntitiesDepartment> departmentRepo, IUnitOfWork unitOfWork)
        {
            _departmentRepo = departmentRepo;
            _unitOfWork = unitOfWork;
        }

        private static string NormalizeStatus(string status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "Hoạt động";
            var s = status.Trim();
            if (s.Equals("Active", StringComparison.OrdinalIgnoreCase) || s.Equals("Hoạt động", StringComparison.OrdinalIgnoreCase))
                return "Hoạt động";
            if (s.Equals("Inactive", StringComparison.OrdinalIgnoreCase) || s.Equals("Tạm khóa", StringComparison.OrdinalIgnoreCase) || s.Equals("Ngưng hoạt động", StringComparison.OrdinalIgnoreCase))
                return "Tạm khóa";
            return s;
        }

        public async Task<ApiResponse<IEnumerable<DepartmentDto>>> GetAllAsync()
        {
            var departments = await _departmentRepo.GetAllAsync(d => d.RoomTypes);
            var employees = await _unitOfWork.Repository<Employee>().GetAllAsync(e => e.User);
            var rooms = await _unitOfWork.Repository<Domain.Entities.Room>().GetAllAsync(r => r.RoomType);

            bool needsSave = false;
            foreach (var d in departments)
            {
                var norm = NormalizeStatus(d.Status);
                if (d.Status != norm)
                {
                    d.Status = norm;
                    _departmentRepo.Update(d);
                    needsSave = true;
                }
            }
            if (needsSave)
            {
                await _unitOfWork.SaveChangesAsync();
            }

            var dtos = departments.Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Type = d.Type,
                Status = NormalizeStatus(d.Status),
                TotalEmployees = employees.Count(e => e.User?.DepartmentId == d.Id),
                TotalRoomTypes = d.RoomTypes?.Count ?? 0,
                TotalRooms = rooms.Count(r => r.RoomType?.DepartmentId == d.Id)
            }).ToList();

            return new ApiResponse<IEnumerable<DepartmentDto>>
            {
                Success = true,
                Message = "Lấy danh sách đơn vị thành công",
                Data = dtos
            };
        }

        public async Task<ApiResponse<DepartmentDto>> GetByIdAsync(int id)
        {
            var department = await _departmentRepo.GetByIdAsync(id, d => d.RoomTypes);
            if (department == null)
            {
                return new ApiResponse<DepartmentDto>
                {
                    Success = false,
                    Message = "Không tìm thấy đơn vị"
                };
            }

            var employees = await _unitOfWork.Repository<Employee>().GetAllAsync(e => e.User);
            var rooms = await _unitOfWork.Repository<Domain.Entities.Room>().GetAllAsync(r => r.RoomType);

            var dto = new DepartmentDto
            {
                Id = department.Id,
                Name = department.Name,
                Type = department.Type,
                Status = NormalizeStatus(department.Status),
                TotalEmployees = employees.Count(e => e.User?.DepartmentId == department.Id),
                TotalRoomTypes = department.RoomTypes?.Count ?? 0,
                TotalRooms = rooms.Count(r => r.RoomType?.DepartmentId == department.Id)
            };

            return new ApiResponse<DepartmentDto>
            {
                Success = true,
                Message = "Lấy thông tin đơn vị thành công",
                Data = dto
            };
        }

        public async Task<ApiResponse<DepartmentDto>> CreateAsync(CreateDepartmentDto request)
        {
            try
            {
                var normStatus = NormalizeStatus(request.Status);
                var department = new EntitiesDepartment
                {
                    Name = request.Name,
                    Type = request.Type,
                    Status = normStatus
                };

                await _departmentRepo.AddAsync(department);
                await _unitOfWork.SaveChangesAsync();

                var dto = new DepartmentDto
                {
                    Id = department.Id,
                    Name = department.Name,
                    Type = department.Type,
                    Status = department.Status
                };

                return new ApiResponse<DepartmentDto>
                {
                    Success = true,
                    Message = "Tạo đơn vị mới thành công",
                    Data = dto
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse<DepartmentDto>
                {
                    Success = false,
                    Message = $"Lỗi khi tạo đơn vị: {ex.Message}"
                };
            }
        }

        public async Task<ApiResponse<DepartmentDto>> UpdateAsync(int id, UpdateDepartmentDto request)
        {
            try
            {
                var department = await _departmentRepo.GetByIdAsync(id);
                if (department == null)
                {
                    return new ApiResponse<DepartmentDto>
                    {
                        Success = false,
                        Message = "Không tìm thấy đơn vị để cập nhật"
                    };
                }

                department.Name = request.Name;
                department.Type = request.Type;
                department.Status = NormalizeStatus(request.Status);

                _departmentRepo.Update(department);
                await _unitOfWork.SaveChangesAsync();

                var dto = new DepartmentDto
                {
                    Id = department.Id,
                    Name = department.Name,
                    Type = department.Type,
                    Status = department.Status
                };

                return new ApiResponse<DepartmentDto>
                {
                    Success = true,
                    Message = "Cập nhật đơn vị thành công",
                    Data = dto
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse<DepartmentDto>
                {
                    Success = false,
                    Message = $"Lỗi khi cập nhật đơn vị: {ex.Message}"
                };
            }
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            try
            {
                // Kiểm tra xem department có reference từ User hay RoomType không
                // Vì IRepository có GetByIdAsync có thể lấy kèm theo include nếu được, 
                // nhưng nếu không, ta có thể phải tuỳ biến. 
                // Ở đây dùng GetByIdAsync kèm includes
                var department = await _departmentRepo.GetByIdAsync(id, d => d.Users, d => d.RoomTypes);

                if (department == null)
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Không tìm thấy đơn vị để xóa"
                    };
                }

                if (department.Users != null && department.Users.Any())
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Không thể xóa đơn vị này vì đang có người dùng thuộc đơn vị."
                    };
                }

                if (department.RoomTypes != null && department.RoomTypes.Any())
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        Message = "Không thể xóa đơn vị này vì đang có loại phòng thuộc đơn vị."
                    };
                }

                _departmentRepo.Remove(department);
                await _unitOfWork.SaveChangesAsync();

                return new ApiResponse<bool>
                {
                    Success = true,
                    Message = "Xóa đơn vị thành công",
                    Data = true
                };
            }
            catch (Exception ex)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = $"Lỗi khi xóa đơn vị: {ex.Message}"
                };
            }
        }
    }
}
