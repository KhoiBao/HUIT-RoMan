namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Mã luật từ chối gắn trên ApiResponse.Code: client hiển thị lời nhắn dễ đọc
    /// và vẫn tra được luật nào bị vi phạm (R01..R13).
    /// </summary>
    public static class BookingReasonCodes
    {
        public const string ScheduleConflict = "R01_TRUNG_LICH";
        public const string QuotaExceeded = "R02_VUOT_HAN_MUC";
        public const string InvalidStudentWindow = "R03_QUA_THOI_GIAN";
        public const string Restricted = "R04_BI_CAM";
        public const string Maintenance = "R05_BAO_TRI";
        public const string Capacity = "R06_SUC_CHUA";
        public const string RoleRoomMismatch = "R07_SAI_VAI_TRO_PHONG";
        public const string OutOfDepartmentScope = "R08_NGOAI_PHAM_VI_DONVI";
        public const string InvalidPeriod = "R09_SAI_TIET";
        public const string InvalidTimeRange = "R10_THOI_GIAN_KHONG_HOP_LE";
        public const string OutsideLibraryHours = "R11_NGOAI_GIO_THU_VIEN";
        public const string InvalidRequest = "R12_THIEU_THONG_TIN";
        public const string ExtensionQuotaExceeded = "R13_VUOT_HAN_MUC_GIA_HAN";
    }
}
