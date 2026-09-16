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

        public async Task<ApiResponse<IEnumerable<DepartmentDto>>> GetAllAsync()
        {
            var departments = await _departmentRepo.GetAllAsync();
            var dtos = departments.Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                Type = d.Type,
                Status = d.Status
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
            var department = await _departmentRepo.GetByIdAsync(id);
            if (department == null)
            {
                return new ApiResponse<DepartmentDto>
                {
                    Success = false,
                    Message = "Không tìm thấy đơn vị"
                };
            }

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
                Message = "Lấy thông tin đơn vị thành công",
                Data = dto
            };
        }

        public async Task<ApiResponse<DepartmentDto>> CreateAsync(CreateDepartmentDto request)
        {
            try
            {
                var department = new EntitiesDepartment
                {
                    Name = request.Name,
                    Type = request.Type,
                    Status = request.Status
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
                department.Status = request.Status;

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
