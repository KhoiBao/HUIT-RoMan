namespace HUIT_RoMan.Application.Common.Models
{
    // Thứ bậc vai trò dùng chung cho các thao tác quản lý người dùng.
    // Quy tắc: chỉ Admin được tác động lên tài khoản nhân sự (Manager/Employee);
    // cấp thấp không được sửa thông tin của cấp bằng hoặc cao hơn.
    public static class RoleHierarchy
    {
        private static readonly System.Collections.Generic.Dictionary<string, int> Ranks =
            new(System.StringComparer.OrdinalIgnoreCase)
            {
                ["Admin"] = 4,
                ["Manager"] = 3,
                ["Employee"] = 2,
                ["Lecturer"] = 1,
                ["Student"] = 1
            };

        public static int Rank(string? role) =>
            role != null && Ranks.TryGetValue(role, out var rank) ? rank : 0;

        public static bool IsStaffRole(string? role) => Rank(role) >= 2;

        // Caller được chỉnh sửa / đặt lại mật khẩu của tài khoản đích hay không.
        public static bool CanManage(string? callerRole, string? targetRole)
        {
            if (string.Equals(callerRole, "Admin", System.StringComparison.OrdinalIgnoreCase))
                return true;

            var callerRank = Rank(callerRole);
            if (callerRank < 2)
                return false; // người dùng thường không quản lý ai

            // Staff chỉ được tác động lên tài khoản cấp người dùng cuối (Student/Lecturer).
            return Rank(targetRole) < 2;
        }
    }
}
