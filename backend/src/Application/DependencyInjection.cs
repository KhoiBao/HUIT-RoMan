using Microsoft.Extensions.DependencyInjection;
using HUIT_RoMan.Application.Modules.Identity.Services;
using HUIT_RoMan.Application.Modules.Room.Services;
using HUIT_RoMan.Application.Modules.Department.Services;

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
        services.AddScoped<IEquipmentService, EquipmentService>();
        services.AddScoped<IRoomEquipmentService, RoomEquipmentService>();

        return services;
    }
}
