using System;

namespace HUIT_RoMan.Application.Modules.Booking.Services
{
    /// <summary>
    /// Ma trận quyền đặt phòng theo vai trò (được xác minh ở backend):
    /// - Sinh viên: chỉ phòng học nhóm và phòng thuyết trình của Thư viện.
    /// - Giảng viên: thư viện, phòng lý thuyết, phòng thực hành và hội trường/hội thảo.
    /// - Các vai trò khác (Admin/Employee) giữ nguyên quyền hiện có.
    /// </summary>
    public static class BookingRoomPermissionPolicy
    {
        public static bool IsLecturer(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return false;
            var normalized = role.Trim().ToLowerInvariant();
            return normalized == "lecturer"
                || normalized == "giảng viên"
                || normalized == "giang vien";
        }

        public static bool CanBookRoomType(string? role, string? roomTypeName)
        {
            if (StudentBookingPolicy.IsStudent(role))
                return StudentBookingPolicy.IsBookableRoomType(roomTypeName);

            if (IsLecturer(role))
            {
                if (string.IsNullOrWhiteSpace(roomTypeName)) return false;
                var normalized = roomTypeName.Trim().ToLowerInvariant();
                return normalized.Contains("nhóm")
                    || normalized.Contains("nhom")
                    || normalized.Contains("thuyết trình")
                    || normalized.Contains("thuyet trinh")
                    || normalized.Contains("lý thuyết")
                    || normalized.Contains("ly thuyet")
                    || normalized.Contains("thực hành")
                    || normalized.Contains("thuc hanh")
                    || normalized.Contains("hội thảo")
                    || normalized.Contains("hoi thao")
                    || normalized.Contains("hội trường")
                    || normalized.Contains("hoi truong");
            }

            // Admin/Employee: giữ nguyên hành vi hiện tại.
            return true;
        }

        public static string? ValidateRoleRoomType(string? role, string? roomTypeName)
        {
            if (CanBookRoomType(role, roomTypeName)) return null;

            if (StudentBookingPolicy.IsStudent(role))
                return "Sinh viên chỉ được đặt phòng học nhóm và phòng thuyết trình của Thư viện.";

            if (IsLecturer(role))
                return $"Giảng viên không được đặt loại phòng '{roomTypeName}'.";

            return null;
        }
    }
}
