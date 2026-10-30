namespace HUIT_RoMan.Domain;

/// <summary>
/// Cách một đơn / chi tiết đặt phòng được quyết định: bởi người thật (MANUAL)
/// hay bởi chế độ tự động duyệt (AUTO). Giá trị được ghi thẳng vào DB và
/// ràng buộc bởi CHECK constraint nên không được đổi tuỳ ý.
/// </summary>
public static class ApprovalModes
{
    public const string Manual = "MANUAL";
    public const string Auto = "AUTO";
}

/// <summary>
/// Tài khoản hệ thống đóng vai chủ thể "tự động duyệt". Tài khoản này được seed
/// không mật khẩu và không giữ role nào, nên không thể đăng nhập hay gọi API.
/// </summary>
public static class SystemAccounts
{
    public const string AutoApproveUserName = "system.auto-approve";
    public const string AutoApproveEmployeeCode = "SYS-AUTO";
    public const string AutoApproveDisplayName = "Hệ thống (tự động duyệt)";
}

/// <summary>Khoá cấu hình trong bảng SystemSettings.</summary>
public static class SystemSettingKeys
{
    public const string BookingAutoApprove = "booking.autoApprove";
}
