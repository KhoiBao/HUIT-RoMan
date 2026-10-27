using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace HUIT_RoMan.Application.Common.Interfaces
{
    public interface IRepository<T> where T : class
    {
        Task<IEnumerable<T>> GetAllAsync(params Expression<Func<T, object>>[] includes);
        Task<T> GetByIdAsync(int id, params Expression<Func<T, object>>[] includes);
        Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes);
        Task<T> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes);
        /// <summary>
        /// Cập nhật có điều kiện (atomic claim): chỉ UPDATE các dòng thỏa predicate.
        /// Trả về số dòng được cập nhật (0 = thua cuộc tranh chấp, ví dụ bị check-in/hủy đồng thời).
        /// </summary>
        Task<int> UpdateIfAsync(Expression<Func<T, bool>> predicate, Expression<Func<Microsoft.EntityFrameworkCore.Query.SetPropertyCalls<T>, Microsoft.EntityFrameworkCore.Query.SetPropertyCalls<T>>> setPropertyCalls);
        Task AddAsync(T entity);
        void Update(T entity);
        void Remove(T entity);
        void HardRemove(T entity);
    }
}
