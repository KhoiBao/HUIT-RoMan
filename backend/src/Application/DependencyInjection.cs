using Microsoft.Extensions.DependencyInjection;

namespace HUIT_RoMan.Application;

// Nơi đăng ký các Service của Business layer.
// Controller chỉ gọi Service ở đây, không gọi DbContext trực tiếp.
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // TODO: services.AddScoped<IBookingService, BookingService>();
        return services;
    }
}
