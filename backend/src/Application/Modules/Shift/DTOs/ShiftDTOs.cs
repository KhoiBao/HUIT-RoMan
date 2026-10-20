using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Shift.DTOs
{
    public class AssignedEmployeeDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Position { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
    }

    public class ShiftDto
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string DateString => Date.ToString("yyyy-MM-dd");
        public string Name { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string TimeRange => $"{StartTime:hh\\:mm} - {EndTime:hh\\:mm}";
        public string Status { get; set; } = "Lên lịch";
        public List<AssignedEmployeeDto> Employees { get; set; } = new List<AssignedEmployeeDto>();
        public int ShiftLogsCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateShiftDto
    {
        [Required(ErrorMessage = "Ngày trực là bắt buộc")]
        public DateTime Date { get; set; }

        [Required(ErrorMessage = "Tên ca trực là bắt buộc")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Giờ bắt đầu là bắt buộc")]
        public TimeSpan StartTime { get; set; }

        [Required(ErrorMessage = "Giờ kết thúc là bắt buộc")]
        public TimeSpan EndTime { get; set; }

        public string Status { get; set; } = "Lên lịch";

        public List<int> EmployeeIds { get; set; } = new List<int>();
    }

    public class UpdateShiftDto
    {
        [Required(ErrorMessage = "Ngày trực là bắt buộc")]
        public DateTime Date { get; set; }

        [Required(ErrorMessage = "Tên ca trực là bắt buộc")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Giờ bắt đầu là bắt buộc")]
        public TimeSpan StartTime { get; set; }

        [Required(ErrorMessage = "Giờ kết thúc là bắt buộc")]
        public TimeSpan EndTime { get; set; }

        public string Status { get; set; } = "Lên lịch";

        public List<int> EmployeeIds { get; set; } = new List<int>();
    }

    public class ShiftLogDto
    {
        public int Id { get; set; }
        public DateTime LogTime { get; set; }
        public string Content { get; set; } = string.Empty;
        public int Type { get; set; } // 1: Bàn giao ca, 2: Sự cố phát sinh, 3: Kiểm tra an ninh / vệ sinh
        public string TypeText { get; set; } = string.Empty;
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string? EmployeePosition { get; set; }
    }

    public class CreateShiftLogDto
    {
        [Required(ErrorMessage = "Nội dung ghi chép ca trực là bắt buộc")]
        [MinLength(5, ErrorMessage = "Nội dung ghi chép phải có ít nhất 5 ký tự")]
        public string Content { get; set; } = string.Empty;

        public int Type { get; set; } = 1; // 1: Bàn giao ca, 2: Sự cố phát sinh, 3: Kiểm tra an ninh/vệ sinh

        public int? EmployeeId { get; set; } // Nếu để trống sẽ lấy từ currentUser
    }

    public class ShiftFilterDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Status { get; set; }
        public int? EmployeeId { get; set; }
        public int? DepartmentId { get; set; }
        public string? Search { get; set; }
    }

    public class ShiftStatsDto
    {
        public int TotalShifts { get; set; }
        public int ScheduledShifts { get; set; }
        public int InProgressShifts { get; set; }
        public int CompletedShifts { get; set; }
        public int CancelledShifts { get; set; }
        public int TotalAssignedEmployees { get; set; }
        public int TotalLogs { get; set; }
    }
}
