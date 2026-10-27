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
    /// Watcher chạy nền định kỳ: tự động hủy các đơn đặt phòng đã duyệt nhưng sinh viên
    /// không nhận phòng đúng hạn (quá thời điểm bắt đầu T mà chưa check-in).
    /// Hoạt động độc lập với trình duyệt/website — không phụ thuộc vào frontend.
    /// Tần suất lấy từ cấu hình "NoShowWatcher:IntervalSeconds" (mặc định 30 giây).
    /// An toàn khi chạy đồng thời trên nhiều instance backend (atomic claim trong service).
    /// </summary>
    public class BookingNoShowWatcher : BackgroundService
    {
        private static readonly TimeSpan DefaultInterval = TimeSpan.FromSeconds(30);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BookingNoShowWatcher> _logger;
        private readonly TimeSpan _interval;

        public BookingNoShowWatcher(
            IServiceScopeFactory scopeFactory,
            ILogger<BookingNoShowWatcher> logger,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;

            var configured = configuration.GetValue<int?>("NoShowWatcher:IntervalSeconds");
            _interval = configured is > 0 ? TimeSpan.FromSeconds(configured.Value) : DefaultInterval;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BookingNoShowWatcher started. Interval: {Interval}s", _interval.TotalSeconds);

            using var timer = new PeriodicTimer(_interval);
            try
            {
                // Chạy ngay một lượt khi khởi động để xử lý các đơn quá hạn còn tồn đọng.
                await RunOnceAsync(stoppingToken);

                while (await timer.WaitForNextTickAsync(stoppingToken))
                {
                    await RunOnceAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                // Shutdown bình thường.
            }

            _logger.LogInformation("BookingNoShowWatcher stopped.");
        }

        private async Task RunOnceAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var noShowService = scope.ServiceProvider.GetRequiredService<IBookingNoShowService>();
                var cancelled = await noShowService.CancelExpiredBookingsAsync(cancellationToken: stoppingToken);
                if (cancelled > 0)
                {
                    _logger.LogInformation("BookingNoShowWatcher auto-cancelled {Count} no-show booking(s).", cancelled);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Shutdown.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BookingNoShowWatcher iteration failed.");
            }
        }
    }
}
