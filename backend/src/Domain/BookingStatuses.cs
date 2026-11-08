namespace HUIT_RoMan.Domain;

// Các ttrang thái của booking, phòng và phiên sử dụng.
public static class BookingStatuses
{
    public const string Pending = "Chờ duyệt";
    public const string Approved = "Đã duyệt";
    public const string PartiallyApproved = "Duyệt một phần";
    public const string PendingSecondApproval = "Chờ duyệt cấp 2";
    public const string Rejected = "Từ chối";
    public const string Cancelled = "Đã hủy";
    public const string InUse = "Đang sử dụng";
    public const string Completed = "Hoàn thành";
}

// các trạng thái của phòng
public static class RoomStatuses
{
    public const string Available = "Trống";
    public const string InUse = "Đang sử dụng";
    public const string Maintenance = "Bảo trì";

    public static readonly string[] All = { Available, InUse, Maintenance };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && Array.IndexOf(All, status) >= 0;
}

// các trâng thái của phiên sử dụng
public static class UsageSessionStatuses
{
    public const string PendingCheckIn = "Chờ nhận phòng";
    public const string InUse = "Đang sử dụng";
    public const string Completed = "Hoàn thành";
    public const string Cancelled = "Đã hủy";
}
