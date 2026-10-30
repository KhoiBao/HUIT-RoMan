using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Common.Models;
using HUIT_RoMan.Application.Modules.Booking.DTOs;
using HUIT_RoMan.Domain;
using HUIT_RoMan.Domain.Entities;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    public class BookingApprovalSettingService : IBookingApprovalSettingService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUser;
        private readonly IRepository<SystemSetting> _settingRepo;
        private readonly IRepository<Domain.Entities.Booking> _bookingRepo;
        private readonly IRepository<Domain.Entities.Room> _roomRepo;

        public BookingApprovalSettingService(
            IUnitOfWork unitOfWork,
            ICurrentUserService currentUser)
        {
            _unitOfWork = unitOfWork;
            _currentUser = currentUser;
            _settingRepo = _unitOfWork.Repository<SystemSetting>();
            _bookingRepo = _unitOfWork.Repository<Domain.Entities.Booking>();
            _roomRepo = _unitOfWork.Repository<Domain.Entities.Room>();
        }

        public async Task<bool> IsAutoApproveEnabledAsync()
        {
            var setting = await _settingRepo.FirstOrDefaultAsync(s => s.Key == SystemSettingKeys.BookingAutoApprove);
            return setting != null && bool.TryParse(setting.Value, out var enabled) && enabled;
        }

        public async Task<string?> GetAutoApproveEnabledByNameAsync()
        {
            var setting = await _settingRepo.FirstOrDefaultAsync(
                s => s.Key == SystemSettingKeys.BookingAutoApprove, s => s.UpdatedByUser);
            return setting?.UpdatedByUser?.FullName;
        }

        public async Task<ApiResponse<AutoApprovalSettingDto>> GetAsync()
        {
            if (!_currentUser.IsStaff)
                return ApiResponse<AutoApprovalSettingDto>.ErrorResponse("Bạn không có quyền xem cấu hình duyệt đơn.");

            return ApiResponse<AutoApprovalSettingDto>.SuccessResponse(await BuildAsync());
        }

        public async Task<ApiResponse<AutoApprovalSettingDto>> UpdateAsync(UpdateAutoApprovalSettingDto request)
        {
            // Chỉ Manager và Admin được đổi chế độ duyệt của toàn hệ thống.
            if (!(_currentUser.IsAdmin || _currentUser.Role == "Manager"))
                return ApiResponse<AutoApprovalSettingDto>.ErrorResponse("Chỉ quản lý hoặc quản trị viên được đổi chế độ duyệt đơn.");

            var setting = await _settingRepo.FirstOrDefaultAsync(s => s.Key == SystemSettingKeys.BookingAutoApprove);
            if (setting == null)
            {
                setting = new SystemSetting { Key = SystemSettingKeys.BookingAutoApprove };
                await _settingRepo.AddAsync(setting);
            }
            else
            {
                _settingRepo.Update(setting);
            }

            setting.Value = request.Enabled ? "true" : "false";
            setting.UpdatedAt = DateTime.UtcNow;
            setting.UpdatedByUserId = _currentUser.UserId;

            await _unitOfWork.SaveChangesAsync();

            return ApiResponse<AutoApprovalSettingDto>.SuccessResponse(
                await BuildAsync(),
                request.Enabled ? "Đã bật chế độ tự động duyệt." : "Đã tắt chế độ tự động duyệt.");
        }

        private async Task<AutoApprovalSettingDto> BuildAsync()
        {
            var setting = await _settingRepo.FirstOrDefaultAsync(
                s => s.Key == SystemSettingKeys.BookingAutoApprove, s => s.UpdatedByUser);

            return new AutoApprovalSettingDto
            {
                Enabled = setting != null && bool.TryParse(setting.Value, out var enabled) && enabled,
                UpdatedAt = setting?.UpdatedAt,
                UpdatedByName = setting?.UpdatedByUser?.FullName,
                PendingCount = await CountPendingAsync()
            };
        }

        /// <summary>Đơn đang chờ duyệt mà người gọi có quyền xử lý (Manager bị giới hạn theo đơn vị).</summary>
        private async Task<int> CountPendingAsync()
        {
            var pending = await _bookingRepo.FindAsync(
                b => b.Status == "Chờ duyệt", b => b.BookingDetails);

            if ((_currentUser.Role == "Employee" || _currentUser.Role == "Manager") && _currentUser.DepartmentId.HasValue)
            {
                var rooms = await _roomRepo.GetAllAsync(r => r.RoomType);
                var deptRoomIds = rooms
                    .Where(r => r.RoomType?.DepartmentId == _currentUser.DepartmentId.Value)
                    .Select(r => r.Id)
                    .ToHashSet();

                return pending.Count(b => b.BookingDetails.Any(d => deptRoomIds.Contains(d.RoomId)));
            }

            return pending.Count();
        }
    }
}
