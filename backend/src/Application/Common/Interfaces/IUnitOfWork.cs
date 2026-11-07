using System;
using System.Threading.Tasks;

namespace HUIT_RoMan.Application.Common.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IRepository<TEntity> Repository<TEntity>() where TEntity : class;
        Task<int> SaveChangesAsync();

        /// <summary>Mở transaction (nếu chưa có). Dùng kèm Commit/Rollback cho luồng cần nguyên tố.</summary>
        Task BeginTransactionAsync();

        /// <summary>Commit transaction hiện tại (bỏ qua nếu không có).</summary>
        Task CommitTransactionAsync();

        /// <summary>Rollback transaction hiện tại (bỏ qua nếu không có — an toàn khi đã commit).</summary>
        Task RollbackTransactionAsync();

        /// <summary>
        /// Khóa tư vấn theo transaction cho hạn mức tuần của một user
        /// (pg_advisory_xact_lock trên PostgreSQL; provider khác bỏ qua).
        /// </summary>
        Task AcquireBookingQuotaLockAsync(int userId);
    }
}
