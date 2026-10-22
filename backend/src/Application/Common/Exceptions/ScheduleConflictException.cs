using System;

namespace HUIT_RoMan.Application.Common.Exceptions
{
    /// <summary>
    /// Xảy ra khi dữ liệu ghi xuống vi phạm ràng buộc chống trùng lịch ở tầng DB
    /// (ví dụ hai người đặt cùng phòng trong cùng khung giờ tại cùng một thời điểm).
    /// </summary>
    public class ScheduleConflictException : Exception
    {
        public ScheduleConflictException(string message, Exception? innerException = null)
            : base(message, innerException)
        {
        }
    }
}
