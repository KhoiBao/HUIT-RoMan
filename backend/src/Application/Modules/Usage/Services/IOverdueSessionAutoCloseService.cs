using System.Threading;
using System.Threading.Tasks;

namespace HUIT_RoMan.Application.Modules.Usage.Services
{
    /// <summary>
    /// Tự động đóng các phiên "Đang sử dụng" đã quá giờ kết thúc mà người dùng không trả phòng.
    /// </summary>
    public interface IOverdueSessionAutoCloseService
    {
        Task<int> CloseOverdueSessionsAsync(int graceMinutes = 15, CancellationToken cancellationToken = default);
    }
}
