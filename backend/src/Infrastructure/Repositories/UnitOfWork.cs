using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Exceptions;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HUIT_RoMan.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;
        private readonly System.Collections.Generic.Dictionary<System.Type, object> _repositories;

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;
            _repositories = new System.Collections.Generic.Dictionary<System.Type, object>();
        }

        public IRepository<TEntity> Repository<TEntity>() where TEntity : class
        {
            var type = typeof(TEntity);

            if (!_repositories.ContainsKey(type))
            {
                var repositoryInstance = new Repository<TEntity>(_context);
                _repositories.Add(type, repositoryInstance);
            }

            return (IRepository<TEntity>)_repositories[type];
        }

        public async Task<int> SaveChangesAsync()
        {
            try
            {
                return await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is PostgresException pg
                      && pg.SqlState == PostgresErrorCodes.ExclusionViolation
                      && pg.ConstraintName == "EX_BookingDetails_Room_NoOverlap")
            {
                // Ràng buộc EX_BookingDetails_Room_NoOverlap ở DB đã chặn một lịch trùng
                // (thường do 2 request đặt phòng chạy đồng thời). Chuyển thành exception
                // nghiệp vụ để tầng Application trả về thông báo thân thiện thay vì lỗi 500.
                throw new ScheduleConflictException(
                    "Khung giờ đặt phòng vừa bị trùng bởi một yêu cầu khác.", ex);
            }
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
