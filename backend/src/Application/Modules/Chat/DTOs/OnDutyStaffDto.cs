using System;

namespace HUIT_RoMan.Application.Modules.Chat.DTOs
{
    public class OnDutyStaffDto
    {
        public int EmployeeId { get; set; }
        public int UserId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string ShiftName { get; set; } = string.Empty;
        public string ShiftTimeRange { get; set; } = string.Empty;
        public bool IsActiveShift { get; set; }
        public bool IsOnline { get; set; } = true;
    }
}
