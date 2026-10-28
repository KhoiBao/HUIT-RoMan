using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Infrastructure.Persistence
{
    /// <summary>
    /// Danh mục phòng và lịch tiết dùng chung cho seed + kiểm thử.
    /// Tập trung toàn bộ mã phòng và giờ tiết tại đây để không rải hằng số
    /// trong nhiều component.
    /// </summary>
    public static class RoomCatalogSeed
    {
        public const string TheoryRoomTypeName = "Phòng Lý thuyết";
        public const string PracticeRoomTypeName = "Phòng Thực hành";

        public const int TheoryRoomCapacity = 60;
        public const int PracticeRoomCapacity = 40;

        /// <summary>A101–A111: 11 phòng máy thực hành.</summary>
        public static readonly IReadOnlyList<RoomSeed> PracticeRooms = BuildPracticeRooms();

        /// <summary>A201–A511 và B201–B511: 88 phòng lý thuyết.</summary>
        public static readonly IReadOnlyList<RoomSeed> TheoryRooms = BuildTheoryRooms();

        public static readonly IReadOnlyList<PeriodSeed> TheoryPeriods = new[]
        {
            new PeriodSeed("Tiết 1",  "06:30", "07:20"),
            new PeriodSeed("Tiết 2",  "07:20", "08:10"),
            new PeriodSeed("Tiết 3",  "08:10", "09:00"),
            new PeriodSeed("Tiết 4",  "09:30", "10:20"),
            new PeriodSeed("Tiết 5",  "10:20", "11:10"),
            new PeriodSeed("Tiết 6",  "11:10", "12:00"),
            new PeriodSeed("Tiết 7",  "12:30", "13:20"),
            new PeriodSeed("Tiết 8",  "13:20", "14:10"),
            new PeriodSeed("Tiết 9",  "14:10", "15:00"),
            new PeriodSeed("Tiết 10", "15:30", "16:20"),
            new PeriodSeed("Tiết 11", "16:20", "17:10"),
            new PeriodSeed("Tiết 12", "17:10", "18:00"),
            new PeriodSeed("Tiết 13", "18:10", "19:00"),
            new PeriodSeed("Tiết 14", "19:00", "19:50"),
            new PeriodSeed("Tiết 15", "19:50", "20:40"),
            new PeriodSeed("Tiết 16", "20:40", "21:30"),
        };

        public static readonly IReadOnlyList<PeriodSeed> PracticePeriods = new[]
        {
            new PeriodSeed("Tiết 1",  "07:00", "07:50"),
            new PeriodSeed("Tiết 2",  "07:50", "08:40"),
            new PeriodSeed("Tiết 3",  "08:40", "09:30"),
            new PeriodSeed("Tiết 4",  "09:30", "10:20"),
            new PeriodSeed("Tiết 5",  "10:20", "11:10"),
            new PeriodSeed("Tiết 6",  "11:10", "12:00"),
            new PeriodSeed("Tiết 7",  "12:30", "13:20"),
            new PeriodSeed("Tiết 8",  "13:20", "14:10"),
            new PeriodSeed("Tiết 9",  "14:10", "15:00"),
            new PeriodSeed("Tiết 10", "15:00", "15:50"),
            new PeriodSeed("Tiết 11", "15:50", "16:40"),
            new PeriodSeed("Tiết 12", "16:40", "17:30"),
            new PeriodSeed("Tiết 13", "18:00", "18:50"),
            new PeriodSeed("Tiết 14", "18:50", "19:40"),
            new PeriodSeed("Tiết 15", "19:40", "20:30"),
            new PeriodSeed("Tiết 16", "20:30", "21:20"),
        };

        private static IReadOnlyList<RoomSeed> BuildPracticeRooms()
        {
            var rooms = new List<RoomSeed>();
            for (var number = 1; number <= 11; number++)
            {
                var suffix = number.ToString("00");
                rooms.Add(new RoomSeed(
                    $"A1{suffix}",
                    $"Phòng Thực hành A1{suffix}",
                    "A",
                    "1",
                    suffix,
                    PracticeRoomCapacity,
                    "Phòng máy thực hành, đăng ký theo tiết học."));
            }
            return rooms;
        }

        private static IReadOnlyList<RoomSeed> BuildTheoryRooms()
        {
            var rooms = new List<RoomSeed>();
            foreach (var building in new[] { "A", "B" })
            {
                for (var floor = 2; floor <= 5; floor++)
                {
                    for (var number = 1; number <= 11; number++)
                    {
                        var suffix = number.ToString("00");
                        var code = $"{building}{floor}{suffix}";
                        rooms.Add(new RoomSeed(
                            code,
                            $"Phòng Lý thuyết {code}",
                            building,
                            floor.ToString(),
                            suffix,
                            TheoryRoomCapacity,
                            "Phòng lý thuyết, đăng ký theo tiết học."));
                    }
                }
            }
            return rooms;
        }

        public static TimeSpan ParseTime(string value) => TimeSpan.Parse(value);

        public sealed class RoomSeed
        {
            public RoomSeed(string code, string name, string building, string floor, string roomNumber, int capacity, string description)
            {
                Code = code;
                Name = name;
                Building = building;
                Floor = floor;
                RoomNumber = roomNumber;
                Capacity = capacity;
                Description = description;
            }

            public string Code { get; }
            public string Name { get; }
            public string Building { get; }
            public string Floor { get; }
            public string RoomNumber { get; }
            public int Capacity { get; }
            public string Description { get; }
        }

        public sealed class PeriodSeed
        {
            public PeriodSeed(string name, string start, string end)
            {
                Name = name;
                Start = TimeSpan.Parse(start);
                End = TimeSpan.Parse(end);
            }

            public string Name { get; }
            public TimeSpan Start { get; }
            public TimeSpan End { get; }
        }
    }
}
