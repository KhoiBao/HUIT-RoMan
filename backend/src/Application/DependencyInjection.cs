using Microsoft.Extensions.DependencyInjection;
using HUIT_RoMan.Application.Modules.Identity.Services;
using HUIT_RoMan.Application.Modules.Room.Services;
using HUIT_RoMan.Application.Modules.Department.Services;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Usage.Services;
using HUIT_RoMan.Application.Modules.Violation.Services;
using HUIT_RoMan.Application.Modules.Shift.Services;
using HUIT_RoMan.Application.Modules.Report.Services;
using HUIT_RoMan.Application.Modules.Chat.Services;
using HUIT_RoMan.Application.Modules.Notification.Services;
using HUIT_RoMan.Application.Modules.Feedback.Services;

namespace HUIT_RoMan.Application;

// Nơi đăng ký các Service của Business layer.
// Controller chỉ gọi Service ở đây, không gọi DbContext trực tiếp.
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Identity Module
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IEmployeeService, EmployeeService>();

        // Department Services
        services.AddScoped<IDepartmentService, DepartmentService>();

        // Room Services
        services.AddScoped<IRoomTypeService, RoomTypeService>();
        services.AddScoped<IRoomService, RoomService>();
        services.AddScoped<IEquipmentCategoryService, EquipmentCategoryService>();
        services.AddScoped<IEquipmentService, EquipmentService>();
        services.AddScoped<IRoomEquipmentService, RoomEquipmentService>();

        // Booking Services
        services.AddScoped<IBookingService, BookingService>();
        // Tác vụ nền tự động hủy đơn không nhận phòng đúng hạn (no-show)
        services.AddScoped<IBookingNoShowService, BookingNoShowService>();
        // Tác vụ nền nhắc lịch sắp đến / sắp kết thúc
        services.AddScoped<IBookingReminderService, BookingReminderService>();

        // Usage Module (Quản lý phiên sử dụng & Trả phòng)
        services.AddScoped<IUsageService, UsageService>();

        // Violation Module (Quản lý & xử lý vi phạm, cấm mượn phòng)
        services.AddScoped<IViolationService, ViolationService>();

        // Shift Module (Quản lý lịch trực nhân sự & Nhật ký trực)
        services.AddScoped<IShiftService, ShiftService>();

        // Report Module (Thống kê báo cáo tình trạng sử dụng phòng, lượt mượn, vi phạm)
        services.AddScoped<IReportService, ReportService>();

        // Chat Module (Chat realtime SignalR với nhân viên trực)
        services.AddScoped<IChatService, ChatService>();

        // Notification Module (Notification Center)
        services.AddScoped<INotificationService, NotificationService>();

        // Feedback Module (Đánh giá sau khi sử dụng phòng)
        services.AddScoped<IFeedbackService, FeedbackService>();

        return services;
    }
}
