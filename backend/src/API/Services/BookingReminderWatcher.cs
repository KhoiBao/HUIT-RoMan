using System;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Booking.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.API.Services
{
    /// <summary>
    /// Watcher chạy nền định kỳ: tự động quét các đơn đặt phòng sắp đến giờ bắt đầu (trước 30 phút)
    /// và sắp hết thời gian sử dụng (trước 15 phút) để gửi thông báo nhắc lịch cho người dùng.
    /// Tần suất lấy từ cấu hình "ReminderWatcher:IntervalSeconds" (mặc định 60 giây).
    /// </summary>
    public class BookingReminderWatcher : BackgroundService
    {
        private static readonly TimeSpan DefaultInterval = TimeSpan.FromSeconds(60);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingReminderWatcher> _logger;
        private readonly TimeSpan _interval;

        public BookingReminderWatcher(
            IServiceScopeFactory scopeFactory,
            ILogger<BookingReminderWatcher> logger,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;

            var configured = configuration.GetValue<int?>("ReminderWatcher:IntervalSeconds");
            _interval = configured is > 0 ? TimeSpan.FromSeconds(configured.Value) : DefaultInterval;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BookingReminderWatcher started. Interval: {Interval}s", _interval.TotalSeconds);

            using var timer = new PeriodicTimer(_interval);
            try
            {
                await RunOnceAsync(stoppingToken);

                while (await timer.WaitForNextTickAsync(stoppingToken))
                {
                    await RunOnceAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                // Shutdown bình thường
            }

            _logger.LogInformation("BookingReminderWatcher stopped.");
        }

        private async Task RunOnceAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var reminderService = scope.ServiceProvider.GetRequiredService<IBookingReminderService>();
                var reminded = await reminderService.SendRemindersAsync(cancellationToken: stoppingToken);
                if (reminded > 0)
                {
                    _logger.LogInformation("BookingReminderWatcher sent {Count} reminder notification(s).", reminded);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BookingReminderWatcher iteration failed.");
            }
        }
    }
}

