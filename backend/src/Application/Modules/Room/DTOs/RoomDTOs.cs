using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Room.DTOs
{
    public class RoomTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int DefaultCapacity { get; set; }
        public int? DepartmentId { get; set; }
        /// <summary>true = mượn theo tiết học cố định; false = mượn theo khung giờ tự do</summary>
        public bool IsBookingByPeriod { get; set; }
        /// <summary>true = phòng đặc biệt, đơn đặt phải qua thêm cấp duyệt 2</summary>
        public bool RequiresSecondApproval { get; set; }
    }

    public class CreateRoomTypeDto
    {
        [Required(ErrorMessage = "Tên loại phòng là bắt buộc.")]
        [MaxLength(255, ErrorMessage = "Tên loại phòng tối đa 255 ký tự.")]
        public string Name { get; set; }

        [MaxLength(1000, ErrorMessage = "Mô tả tối đa 1000 ký tự.")]
        public string Description { get; set; }
        public int DefaultCapacity { get; set; }
        public int? DepartmentId { get; set; }
        /// <summary>true = mượn theo tiết học cố định; false = mượn theo khung giờ tự do</summary>
        public bool IsBookingByPeriod { get; set; }
        /// <summary>true = phòng đặc biệt, đơn đặt phải qua thêm cấp duyệt 2</summary>
        public bool RequiresSecondApproval { get; set; }
    }

    public class RoomDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string RoomCode { get; set; }
        public string Building { get; set; }
        public string Floor { get; set; }
        public string RoomNumber { get; set; }
        public int Capacity { get; set; }
        public string Status { get; set; }
        public string Description { get; set; }
        public int RoomTypeId { get; set; }
        public string RoomTypeName { get; set; }
        /// <summary>true = loại phòng mượn theo tiết học cố định</summary>
        public bool IsBookingByPeriod { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public bool HasMaintenanceEquipment { get; set; }
        public List<string> MaintenanceEquipments { get; set; } = new();
    }

    /// <summary>Bộ lọc + phân trang danh mục phòng cho trang lịch sử dụng phòng.</summary>
    public class PagedRoomQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Keyword { get; set; }
        public string? RoomType { get; set; }
        public string? Building { get; set; }
        public string? Floor { get; set; }
        /// <summary>free | in-use | maintenance | all</summary>
        public string? Status { get; set; }
        public int? MinCapacity { get; set; }
        /// <summary>Ngày (giờ Việt Nam) dùng để xác định trạng thái phòng theo lịch đặt.</summary>
        public System.DateTime? Date { get; set; }
    }

    public class PagedRoomResultDto
    {
        public System.Collections.Generic.IReadOnlyList<RoomDto> Items { get; set; }
            = new System.Collections.Generic.List<RoomDto>();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    public class CreateRoomDto
    {
        [Required(ErrorMessage = "Tên phòng là bắt buộc.")]
        [MaxLength(255, ErrorMessage = "Tên phòng tối đa 255 ký tự.")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Mã tòa là bắt buộc.")]
        [MaxLength(100, ErrorMessage = "Tòa tối đa 100 ký tự.")]
        public string Building { get; set; }

        [Required(ErrorMessage = "Tầng là bắt buộc.")]
        [MaxLength(50, ErrorMessage = "Tầng tối đa 50 ký tự.")]
        public string Floor { get; set; }

        [Required(ErrorMessage = "Số phòng là bắt buộc.")]
        [MaxLength(50, ErrorMessage = "Số phòng tối đa 50 ký tự.")]
        public string RoomNumber { get; set; }

        [Range(1, 10000, ErrorMessage = "Sức chứa phòng phải lớn hơn 0.")]
        public int Capacity { get; set; }

        [MaxLength(1000, ErrorMessage = "Mô tả tối đa 1000 ký tự.")]
        public string Description { get; set; }
        public int RoomTypeId { get; set; }
    }

    public class UpdateRoomDto
    {
        [Required(ErrorMessage = "Tên phòng là bắt buộc.")]
        [MaxLength(255, ErrorMessage = "Tên phòng tối đa 255 ký tự.")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Mã tòa là bắt buộc.")]
        [MaxLength(100, ErrorMessage = "Tòa tối đa 100 ký tự.")]
        public string Building { get; set; }

        [Required(ErrorMessage = "Tầng là bắt buộc.")]
        [MaxLength(50, ErrorMessage = "Tầng tối đa 50 ký tự.")]
        public string Floor { get; set; }

        [Required(ErrorMessage = "Số phòng là bắt buộc.")]
        [MaxLength(50, ErrorMessage = "Số phòng tối đa 50 ký tự.")]
        public string RoomNumber { get; set; }

        [Range(1, 10000, ErrorMessage = "Sức chứa phòng phải lớn hơn 0.")]
        public int Capacity { get; set; }

        [MaxLength(50, ErrorMessage = "Trạng thái tối đa 50 ký tự.")]
        public string Status { get; set; }

        [MaxLength(1000, ErrorMessage = "Mô tả tối đa 1000 ký tự.")]
        public string Description { get; set; }
        public int RoomTypeId { get; set; }
    }

    public class EquipmentDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public int EquipmentCategoryId { get; set; }
        public int TotalQuantity { get; set; }
        public int AvailableQuantity { get; set; }
        public int AllocatedQuantity { get; set; }
    }

    public class CreateEquipmentDto
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string? Status { get; set; }
        public int EquipmentCategoryId { get; set; }
        public int TotalQuantity { get; set; }
    }

    public class UpdateEquipmentStatusDto
    {
        public string Status { get; set; }
    }

    public class RoomEquipmentDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; }
        public int EquipmentId { get; set; }
        public string EquipmentName { get; set; }
        public int Quantity { get; set; }
        public string Status { get; set; }
    }

    public class AddRoomEquipmentDto
    {
        public int EquipmentId { get; set; }
        public int Quantity { get; set; }
        public string Status { get; set; }
    }

    public class EquipmentCategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }

    public class CreateEquipmentCategoryDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
    }
}
