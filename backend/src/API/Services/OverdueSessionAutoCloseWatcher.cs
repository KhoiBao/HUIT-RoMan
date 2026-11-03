using System;
using System.Threading;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Usage.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HUIT_RoMan.API.Services
{
    /// <summary>
    /// Watcher chạy nền định kỳ: tự đóng các phiên "Đang sử dụng" quá giờ kết thúc
    /// mà người dùng không trả phòng (sau thời gian chờ GraceMinutes).
    /// Tần suất: "OverdueCloseWatcher:IntervalSeconds" (mặc định 60s),
    /// thời gian chờ: "OverdueCloseWatcher:GraceMinutes" (mặc định 15 phút).
    /// </summary>
    public class OverdueSessionAutoCloseWatcher : BackgroundService
    {
        private static readonly TimeSpan DefaultInterval = TimeSpan.FromSeconds(60);
        private const int DefaultGraceMinutes = 15;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OverdueSessionAutoCloseWatcher> _logger;
        private readonly TimeSpan _interval;
        private readonly int _graceMinutes;

        public OverdueSessionAutoCloseWatcher(
            IServiceScopeFactory scopeFactory,
            ILogger<OverdueSessionAutoCloseWatcher> logger,
            IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;

            var configured = configuration.GetValue<int?>("OverdueCloseWatcher:IntervalSeconds");
            _interval = configured is > 0 ? TimeSpan.FromSeconds(configured.Value) : DefaultInterval;

            var grace = configuration.GetValue<int?>("OverdueCloseWatcher:GraceMinutes");
            _graceMinutes = grace is >= 0 ? grace.Value : DefaultGraceMinutes;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "OverdueSessionAutoCloseWatcher started. Interval: {Interval}s, Grace: {Grace}min",
                _interval.TotalSeconds, _graceMinutes);

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
                // Shutdown bình thường.
            }

            _logger.LogInformation("OverdueSessionAutoCloseWatcher stopped.");
        }

        private async Task RunOnceAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IOverdueSessionAutoCloseService>();
                var closed = await service.CloseOverdueSessionsAsync(_graceMinutes, stoppingToken);
                if (closed > 0)
                {
                    _logger.LogInformation("OverdueSessionAutoCloseWatcher auto-closed {Count} overdue session(s).", closed);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Shutdown.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OverdueSessionAutoCloseWatcher iteration failed.");
            }
        }
    }
}
