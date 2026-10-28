using System;
using HUIT_RoMan.Application.Modules.Booking.Services;
using HUIT_RoMan.Application.Modules.Feedback.Services;
using HUIT_RoMan.Application.Modules.Notification.Services;
using HUIT_RoMan.Application.Modules.Report.Services;
using HUIT_RoMan.Application.Modules.Usage.Services;
using HUIT_RoMan.Infrastructure.Persistence;
using HUIT_RoMan.Application.Common.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Moq;
using HUIT_RoMan.Domain.Entities;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Harness dùng chung: một SQLite in-memory, một UnitOfWork, các service thật,
    /// ICurrentUserService giả lập và IStoredProcedureService mock.
    /// </summary>
    internal sealed class BookingHarness : IDisposable
    {
        public SqliteTestBed Bed { get; } = new();
        public ApplicationDbContext Db { get; }
        public IUnitOfWork UoW { get; }
        public FakeCurrentUser CurrentUser { get; } = new() { UserId = BookingTestSeed.StudentAId, Role = "student" };
        public UsageService UsageService { get; }
        public BookingService BookingService { get; }
        public BookingNoShowService NoShowService { get; }
        public Mock<IEmailService> EmailMock { get; } = new();

        public BookingHarness()
        {
            UoW = Bed.CreateUnitOfWork(out var context);
            Db = context;
            BookingTestSeed.EnsureBaseData(Db);

            var spMock = new Mock<IStoredProcedureService>();
            var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<BookingNoShowService>>();

            UsageService = new UsageService(UoW, CurrentUser, spMock.Object);
            BookingService = new BookingService(UoW, CurrentUser, UsageService, EmailMock.Object);
            NoShowService = new BookingNoShowService(UoW, loggerMock.Object);
        }

        public ReportService CreateReportService()
        {
            var spMock = new Mock<IStoredProcedureService>();
            var userStoreMock = new Mock<IUserStore<User>>();
            var userManager = new UserManager<User>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);
            return new ReportService(UoW, userManager, spMock.Object, CurrentUser);
        }

        public NotificationService CreateNotificationService()
        {
            var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<NotificationService>>();
            return new NotificationService(UoW, CurrentUser, loggerMock.Object);
        }

        public BookingReminderService CreateReminderService()
        {
            var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<BookingReminderService>>();
            return new BookingReminderService(UoW, loggerMock.Object);
        }

        public FeedbackService CreateFeedbackService()
        {
            var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<FeedbackService>>();
            return new FeedbackService(UoW, CurrentUser, loggerMock.Object);
        }

        public void Dispose()
        {
            Db.Dispose();
            Bed.Dispose();
        }
    }
}
