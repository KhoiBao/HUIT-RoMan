using System;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Infrastructure.Persistence;
using HUIT_RoMan.Infrastructure.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace HUIT_RoMan.Tests
{
    /// <summary>
    /// Nền tảng kiểm thử dùng SQLite in-memory (provider relational → hỗ trợ ExecuteUpdateAsync,
    /// đúng cơ chế atomic claim đang chạy trên PostgreSQL production).
    /// Mỗi test dùng một connection giữ mở riêng nên database sống đúng trong phạm vi test.
    /// </summary>
    public sealed class SqliteTestBed : IDisposable
    {
        private readonly SqliteConnection _connection;

        public SqliteTestBed()
        {
            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();

            Options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .Options;

            using var context = new ApplicationDbContext(Options);
            context.Database.EnsureCreated();
        }

        public DbContextOptions<ApplicationDbContext> Options { get; }

        public ApplicationDbContext CreateContext() => new ApplicationDbContext(Options);

        public IUnitOfWork CreateUnitOfWork(out ApplicationDbContext context)
        {
            context = CreateContext();
            return new UnitOfWork(context);
        }

        public void Dispose()
        {
            _connection.Dispose();
        }
    }

    /// <summary>CurrentUserService giả lập quyền cho từng test.</summary>
    public class FakeCurrentUser : ICurrentUserService
    {
        public int? UserId { get; set; }
        public string? Role { get; set; }
        public int? DepartmentId { get; set; }
        public bool IsAdmin { get; set; }
        public bool IsManager => Role == "Manager";
        public bool IsStaff => IsAdmin || IsManager || Role == "Employee";
    }
}
