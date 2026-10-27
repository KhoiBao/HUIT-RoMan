using System;
using HUIT_RoMan.Application.Modules.Booking.Services;
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

        public BookingHarness()
        {
            UoW = Bed.CreateUnitOfWork(out var context);
            Db = context;
            BookingTestSeed.EnsureBaseData(Db);

            var spMock = new Mock<IStoredProcedureService>();
            var loggerMock = new Mock<Microsoft.Extensions.Logging.ILogger<BookingNoShowService>>();

            UsageService = new UsageService(UoW, CurrentUser, spMock.Object);
            BookingService = new BookingService(UoW, CurrentUser, UsageService);
            NoShowService = new BookingNoShowService(UoW, loggerMock.Object);
        }

        public ReportService CreateReportService()
        {
            var spMock = new Mock<IStoredProcedureService>();
            // UserManager<User> có ctor 10 tham số; Moq không proxy được khi truyền null
            // → tự dựng instance thật (các service phía sau không được dùng trong test này).
            var userStoreMock = new Mock<IUserStore<User>>();
            var userManager = new UserManager<User>(
                userStoreMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);
            return new ReportService(UoW, userManager, spMock.Object, CurrentUser);
        }

        public void Dispose()
        {
            Db.Dispose();
            Bed.Dispose();
        }
    }
}
