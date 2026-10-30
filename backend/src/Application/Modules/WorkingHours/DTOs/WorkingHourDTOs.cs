using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.WorkingHours.DTOs
{
    public class WorkingHourDto
    {
        /// <summary>0 = Chủ Nhật, 1 = Thứ Hai … 6 = Thứ Bảy.</summary>
        public int DayOfWeek { get; set; }
        public string OpenTime { get; set; } = "07:00";
        public string CloseTime { get; set; } = "20:00";
        public bool IsClosed { get; set; }
    }

    public class UpdateWorkingHoursDto
    {
        public List<WorkingHourDto> Days { get; set; } = new();
    }
}
