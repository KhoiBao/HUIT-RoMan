using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Domain.Entities;
using DepartmentEntity = HUIT_RoMan.Domain.Entities.Department;

namespace HUIT_RoMan.Application.Modules.WorkingHours.Services
{
    public sealed class WorkingDayConfig
    {
        public TimeSpan OpenTime { get; init; }
        public TimeSpan CloseTime { get; init; }
        public bool IsClosed { get; init; }
    }

    public interface ILibraryWorkingHoursProvider
    {
        /// <summary>Khung giờ phục vụ của Thư viện theo System.DayOfWeek.</summary>
        Task<IReadOnlyDictionary<int, WorkingDayConfig>> GetWeekAsync();

        /// <summary>Trả về thông báo lỗi khi lượt đặt nằm ngoài giờ phục vụ, hoặc null nếu hợp lệ.</summary>
        string? Validate(IReadOnlyDictionary<int, WorkingDayConfig> week, DateTime startUtc, DateTime endUtc);
    }

    public class LibraryWorkingHoursProvider : ILibraryWorkingHoursProvider
    {
        private const string LibraryDepartmentType = "Library";

        private readonly IRepository<DepartmentEntity> _departmentRepo;
        private readonly IRepository<WorkingHour> _workingHourRepo;

        public LibraryWorkingHoursProvider(IUnitOfWork unitOfWork)
        {
            _departmentRepo = unitOfWork.Repository<DepartmentEntity>();
            _workingHourRepo = unitOfWork.Repository<WorkingHour>();
        }

        public async Task<IReadOnlyDictionary<int, WorkingDayConfig>> GetWeekAsync()
        {
            var week = DefaultWeek();

            var department = (await _departmentRepo.FindAsync(d => d.Type == LibraryDepartmentType))
                .FirstOrDefault();
            if (department == null) return week;

            var rows = await _workingHourRepo.FindAsync(w => w.DepartmentId == department.Id);
            foreach (var row in rows)
            {
                if (row.DayOfWeek < 0 || row.DayOfWeek > 6) continue;
                week[row.DayOfWeek] = new WorkingDayConfig
                {
                    OpenTime = row.OpenTime,
                    CloseTime = row.CloseTime,
                    IsClosed = row.IsClosed
                };
            }
            return week;
        }

        public string? Validate(
            IReadOnlyDictionary<int, WorkingDayConfig> week,
            DateTime startUtc,
            DateTime endUtc)
        {
            var localStart = DateTime.SpecifyKind(startUtc, DateTimeKind.Utc).AddHours(7);
            var localEnd = DateTime.SpecifyKind(endUtc, DateTimeKind.Utc).AddHours(7);

            if (localEnd <= localStart)
                return "Thời gian kết thúc phải sau thời gian bắt đầu.";

            if (localStart.Date != localEnd.Date)
                return "Mỗi lượt đặt phòng phải nằm trong cùng một ngày.";

            if (!week.TryGetValue((int)localStart.DayOfWeek, out var config) || config.IsClosed)
                return $"Thư viện không phục vụ đặt phòng vào {WeekdayName(localStart.DayOfWeek)}.";

            if (localStart.TimeOfDay < config.OpenTime || localEnd.TimeOfDay > config.CloseTime)
                return $"Thư viện chỉ phục vụ đặt phòng trong khung giờ {Format(config.OpenTime)} – {Format(config.CloseTime)}.";

            return null;
        }

        private static Dictionary<int, WorkingDayConfig> DefaultWeek()
        {
            var week = new Dictionary<int, WorkingDayConfig>();
            for (var day = 0; day <= 6; day++)
            {
                week[day] = new WorkingDayConfig
                {
                    OpenTime = new TimeSpan(7, 0, 0),
                    CloseTime = new TimeSpan(20, 0, 0),
                    IsClosed = day == (int)DayOfWeek.Sunday
                };
            }
            return week;
        }

        private static string Format(TimeSpan time) => time.ToString(@"hh\:mm");

        private static string WeekdayName(DayOfWeek day) => day switch
        {
            DayOfWeek.Monday => "Thứ Hai",
            DayOfWeek.Tuesday => "Thứ Ba",
            DayOfWeek.Wednesday => "Thứ Tư",
            DayOfWeek.Thursday => "Thứ Năm",
            DayOfWeek.Friday => "Thứ Sáu",
            DayOfWeek.Saturday => "Thứ Bảy",
            _ => "Chủ Nhật"
        };
    }
}
