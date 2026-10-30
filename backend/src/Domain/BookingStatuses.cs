namespace HUIT_RoMan.Domain;

/// <summary>Canonical values persisted for the shared-room booking workflow.</summary>
public static class BookingStatuses
{
    public const string Pending = "Chờ duyệt";
    public const string Approved = "Đã duyệt";
    public const string PartiallyApproved = "Duyệt một phần";
    public const string Rejected = "Từ chối";
    public const string Cancelled = "Đã hủy";
    public const string InUse = "Đang sử dụng";
    public const string Completed = "Hoàn thành";
}

public static class RoomStatuses
{
    public const string Available = "Trống";
    public const string InUse = "Đang sử dụng";
    public const string Maintenance = "Bảo trì";

    public static readonly string[] All = { Available, InUse, Maintenance };

    public static bool IsValid(string? status) =>
        !string.IsNullOrWhiteSpace(status) && Array.IndexOf(All, status) >= 0;
}

public static class UsageSessionStatuses
{
    public const string PendingCheckIn = "Chờ nhận phòng";
    public const string InUse = "Đang sử dụng";
    public const string Completed = "Hoàn thành";
    public const string Cancelled = "Đã hủy";
}
