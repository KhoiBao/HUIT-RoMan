using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HUIT_RoMan.Infrastructure.Persistence
{
    public static class ApplicationDbSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            var userManager = serviceProvider.GetRequiredService<UserManager<User>>();
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
            var dbContext = serviceProvider.GetRequiredService<ApplicationDbContext>();

            // 1. Khởi tạo các Roles cơ bản
            string[] roles = { "Admin", "Employee", "Student", "Lecturer" };

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole<int>(role));
                }
            }

            // 2. Khởi tạo Departments
            var deptAdmin = await EnsureDepartmentAsync(dbContext, "Trường ĐH Công Thương TPHCM", "Management");
            var deptDaoTao = await EnsureDepartmentAsync(dbContext, "Phòng Đào tạo", "Office");
            var deptThuVien = await EnsureDepartmentAsync(dbContext, "Thư viện", "Library");
            var deptCNTT = await EnsureDepartmentAsync(dbContext, "Khoa CNTT", "Faculty");

            // 3. Khởi tạo tài khoản Admin mặc định
            var adminUser = await userManager.FindByNameAsync("admin");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    UserName = "admin",
                    CardCode = "admin",
                    FullName = "System Administrator",
                    Email = "admin@huit.edu.vn",
                    Status = "Hoạt động",
                    DepartmentId = deptAdmin.Id
                };

                var result = await userManager.CreateAsync(adminUser, "Admin@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                }
            }
            else if (adminUser.DepartmentId != deptAdmin.Id)
            {
                adminUser.DepartmentId = deptAdmin.Id;
                await userManager.UpdateAsync(adminUser);
            }

            // 4. Khởi tạo 2 Nhân viên
            await EnsureEmployeeAsync(userManager, dbContext, "NV001", "Nhân Viên Đào Tạo", deptDaoTao.Id, "Chuyên viên");
            await EnsureEmployeeAsync(userManager, dbContext, "NV002", "Nhân Viên Thư Viện", deptThuVien.Id, "Thủ thư");

            // 5. Khởi tạo Sinh viên & Giảng viên thuộc Khoa CNTT
            await EnsureUserAsync(userManager, "SV001", "Sinh Viên CNTT 01", "Student", deptCNTT.Id);
            await EnsureUserAsync(userManager, "GV001", "Giảng Viên CNTT 01", "Lecturer", deptCNTT.Id);

            // 5b. Tài khoản demo cho đồ án nội bộ (login bằng email @huit.edu.vn, pass Huit@123).
            // Nhóm người dùng: 5 SV + 3 GV; nhóm nhân sự: 3 thủ thư + 3 quản lý phòng; nhóm quản trị: +2 admin.
            const string demoPassword = "Huit@123";
            var students = new[]
            {
                ("200123456", "Nguyễn Văn An"),
                ("200123457", "Trần Thị Bình"),
                ("200123458", "Lê Văn Cường"),
                ("200123459", "Phạm Thị Dung"),
                ("200123460", "Hoàng Văn Em"),
            };
            foreach (var (code, name) in students)
                await EnsureDemoAccountAsync(userManager, dbContext, code, $"{code}@huit.edu.vn", name, "Student", deptCNTT.Id, demoPassword, null);

            var lecturers = new[]
            {
                ("10010001", "Nguyễn Văn Giảng 01"),
                ("10010002", "Trần Thị Giảng 02"),
                ("10010003", "Lê Văn Giảng 03"),
            };
            foreach (var (code, name) in lecturers)
                await EnsureDemoAccountAsync(userManager, dbContext, code, $"{code}@huit.edu.vn", name, "Lecturer", deptCNTT.Id, demoPassword, null);

            var librarians = new[]
            {
                ("TV001", "Thủ thư 01"),
                ("TV002", "Thủ thư 02"),
                ("TV003", "Thủ thư 03"),
            };
            foreach (var (code, name) in librarians)
                await EnsureDemoAccountAsync(userManager, dbContext, code, $"{code.ToLower()}@huit.edu.vn", name, "Employee", deptThuVien.Id, demoPassword, "Thủ thư");

            var managers = new[]
            {
                ("QLP001", "Quản lý phòng 01"),
                ("QLP002", "Quản lý phòng 02"),
                ("QLP003", "Quản lý phòng 03"),
            };
            foreach (var (code, name) in managers)
                await EnsureDemoAccountAsync(userManager, dbContext, code, $"{code.ToLower()}@huit.edu.vn", name, "Employee", deptDaoTao.Id, demoPassword, "Quản lý phòng");

            await EnsureDemoAccountAsync(userManager, dbContext, "ADMIN002", "admin02@huit.edu.vn", "Quản trị viên 02", "Admin", deptAdmin.Id, demoPassword, null);
            await EnsureDemoAccountAsync(userManager, dbContext, "ADMIN003", "admin03@huit.edu.vn", "Quản trị viên 03", "Admin", deptAdmin.Id, demoPassword, null);

            // 6. Apply Stored Procedures / Functions PostgreSQL
            await SeedStoredProceduresAsync(dbContext);

            // 7. Khởi tạo danh mục Tiết học (Tiết 1 -> Tiết 15)
            await EnsurePeriodsAsync(dbContext);

            // 8. Khởi tạo các phòng dùng chung của Thư viện
            await EnsureDemoRoomsAsync(dbContext, deptThuVien.Id);

            // 8b. Khởi tạo danh mục Thiết bị & Trang thiết bị mẫu
            await EnsureDemoEquipmentsAsync(dbContext);

            // 9. Khởi tạo lịch mẫu cho ngày hôm nay
            await EnsureDemoBookingsAsync(dbContext);

            // 10. Khởi tạo danh mục Loại vi phạm & Biên bản vi phạm mẫu
            await EnsureDemoViolationsAsync(dbContext, userManager);

            // 11. Khởi tạo lịch trực mẫu cho nhân viên (Shifts & ShiftLogs)
            await EnsureDemoShiftsAsync(dbContext);
        }

        /// <summary>
        /// Đọc file SQL và apply tất cả stored procedures/functions vào PostgreSQL.
        /// Dùng CREATE OR REPLACE nên hoàn toàn idempotent (an toàn khi chạy lại).
        /// </summary>
        private static async Task SeedStoredProceduresAsync(ApplicationDbContext dbContext)
        {
            try
            {
                // Tìm file SQL tương đối với assembly location
                var assemblyDir = System.IO.Path.GetDirectoryName(
                    System.Reflection.Assembly.GetExecutingAssembly().Location);

                // Thử nhiều đường dẫn (local dev vs publish)
                var candidates = new[]
                {
                    System.IO.Path.Combine(assemblyDir!, "SQL", "StoredProcedures.sql"),
                    System.IO.Path.Combine(assemblyDir!, "..", "SQL", "StoredProcedures.sql"),
                };

                string sqlPath = null;
                foreach (var candidate in candidates)
                {
                    if (System.IO.File.Exists(candidate))
                    {
                        sqlPath = candidate;
                        break;
                    }
                }

                if (sqlPath == null)
                {
                    Console.WriteLine("[Seeder] Không tìm thấy SQL/StoredProcedures.sql – bỏ qua.");
                    return;
                }

                var sql = await System.IO.File.ReadAllTextAsync(sqlPath);
                await dbContext.Database.ExecuteSqlRawAsync(sql);
                Console.WriteLine("[Seeder] Stored procedures / functions đã được apply thành công.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Seeder] Lỗi khi apply stored procedures: {ex.Message}");
            }
        }


        private static async Task<Department> EnsureDepartmentAsync(ApplicationDbContext dbContext, string name, string type)
        {
            var dept = await dbContext.Departments.FirstOrDefaultAsync(d => d.Name == name);
            if (dept == null)
            {
                dept = new Department { Name = name, Type = type, Status = "Hoạt động" };
                dbContext.Departments.Add(dept);
                await dbContext.SaveChangesAsync();
            }
            return dept;
        }

        private static async Task EnsureUserAsync(UserManager<User> userManager, string code, string fullName, string role, int departmentId)
        {
            var user = await userManager.FindByNameAsync(code);
            if (user == null)
            {
                user = new User
                {
                    UserName = code,
                    CardCode = code,
                    FullName = fullName,
                    Email = $"{code.ToLower()}@{role.ToLower()}.huit.edu.vn",
                    Status = "Hoạt động",
                    DepartmentId = departmentId
                };

                var result = await userManager.CreateAsync(user, $"{role}@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, role);
                }
            }
            else if (user.DepartmentId != departmentId)
            {
                user.DepartmentId = departmentId;
                await userManager.UpdateAsync(user);
            }
        }

        private static async Task EnsureEmployeeAsync(UserManager<User> userManager, ApplicationDbContext dbContext, string code, string fullName, int departmentId, string position)
        {
            await EnsureUserAsync(userManager, code, fullName, "Employee", departmentId);
            var user = await userManager.FindByNameAsync(code);
            if (user != null)
            {
                var employee = await dbContext.Employees.FirstOrDefaultAsync(e => e.UserId == user.Id);
                if (employee == null)
                {
                    employee = new Employee
                    {
                        Code = user.CardCode,
                        Position = position,
                        Status = "Hoạt động",
                        UserId = user.Id,
                        HireDate = DateTime.UtcNow
                    };
                    dbContext.Employees.Add(employee);
                    await dbContext.SaveChangesAsync();
                }
            }
        }

        /// <summary>
        /// Seed tài khoản demo đăng nhập bằng email @huit.edu.vn.
        /// Idempotent: tìm theo UserName (= email) trước, rồi theo CardCode.
        /// </summary>
        private static async Task EnsureDemoAccountAsync(UserManager<User> userManager, ApplicationDbContext dbContext, string cardCode, string email, string fullName, string role, int departmentId, string password, string position)
        {
            var user = await userManager.FindByNameAsync(email)
                ?? (await userManager.FindByEmailAsync(email))
                ?? dbContext.Users.FirstOrDefault(u => u.CardCode == cardCode);
            if (user == null)
            {
                user = new User
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    CardCode = cardCode,
                    FullName = fullName,
                    Status = "Hoạt động",
                    DepartmentId = departmentId
                };
                var result = await userManager.CreateAsync(user, password);
                if (!result.Succeeded) return;
            }
            if (!await userManager.IsInRoleAsync(user, role))
            {
                await userManager.AddToRoleAsync(user, role);
            }
            if (role == "Employee")
            {
                var employee = await dbContext.Employees.FirstOrDefaultAsync(e => e.UserId == user.Id);
                if (employee == null)
                {
                    dbContext.Employees.Add(new Employee
                    {
                        Code = user.CardCode,
                        Position = position ?? "Nhân viên",
                        Status = "Hoạt động",
                        UserId = user.Id,
                        HireDate = DateTime.UtcNow
                    });
                    await dbContext.SaveChangesAsync();
                }
            }
        }

        private static async Task EnsurePeriodsAsync(ApplicationDbContext dbContext)
        {
            var defaultPeriods = new (string Name, TimeSpan Start, TimeSpan End)[]
            {
                ("Tiết 1", new TimeSpan(6, 30, 0), new TimeSpan(7, 20, 0)),
                ("Tiết 2", new TimeSpan(7, 20, 0), new TimeSpan(8, 10, 0)),
                ("Tiết 3", new TimeSpan(8, 15, 0), new TimeSpan(9, 5, 0)),
                ("Tiết 4", new TimeSpan(9, 10, 0), new TimeSpan(10, 0, 0)),
                ("Tiết 5", new TimeSpan(10, 5, 0), new TimeSpan(10, 55, 0)),
                ("Tiết 6", new TimeSpan(11, 0, 0), new TimeSpan(11, 50, 0)),
                ("Tiết 7", new TimeSpan(12, 30, 0), new TimeSpan(13, 20, 0)),
                ("Tiết 8", new TimeSpan(13, 20, 0), new TimeSpan(14, 10, 0)),
                ("Tiết 9", new TimeSpan(14, 15, 0), new TimeSpan(15, 5, 0)),
                ("Tiết 10", new TimeSpan(15, 10, 0), new TimeSpan(16, 0, 0)),
                ("Tiết 11", new TimeSpan(16, 5, 0), new TimeSpan(16, 55, 0)),
                ("Tiết 12", new TimeSpan(17, 0, 0), new TimeSpan(17, 50, 0)),
                ("Tiết 13", new TimeSpan(18, 0, 0), new TimeSpan(18, 50, 0)),
                ("Tiết 14", new TimeSpan(18, 50, 0), new TimeSpan(19, 40, 0)),
                ("Tiết 15", new TimeSpan(19, 45, 0), new TimeSpan(20, 35, 0)),
            };

            foreach (var p in defaultPeriods)
            {
                var existing = await dbContext.Periods.FirstOrDefaultAsync(x => x.Name == p.Name);
                if (existing == null)
                {
                    dbContext.Periods.Add(new Period
                    {
                        Name = p.Name,
                        StartTime = p.Start,
                        EndTime = p.End,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            await dbContext.SaveChangesAsync();
        }

        private static async Task EnsureDemoRoomsAsync(ApplicationDbContext dbContext, int departmentId)
        {
            var rtHocNhom = await EnsureRoomTypeAsync(
                dbContext,
                "Phòng học nhóm",
                "Phòng học nhóm tại Thư viện, sức chứa 5–7 người",
                7,
                departmentId);

            var rtThuyetTrinh = await EnsureRoomTypeAsync(
                dbContext,
                "Phòng thuyết trình",
                "Phòng thuyết trình tại Thư viện, sức chứa 8–20 người",
                20,
                departmentId);

            var rtHoiThao = await EnsureRoomTypeAsync(
                dbContext,
                "Phòng hội thảo",
                "Phòng hội thảo tại Thư viện, sức chứa 50–90 người",
                90,
                departmentId);

            var demoRooms = new (string Name, string Code, string Building, string Floor, string RoomNumber, int Capacity, int TypeId, string Description)[]
            {
                // Thư viện - Tầng 3: 4 phòng học nhóm
                ("Phòng học nhóm TV01", "TV01", "Thư viện", "3", "01", 7, rtHocNhom.Id, "Sức chứa 5–7 người • Smart TV • Bảng trắng • WiFi"),
                ("Phòng học nhóm TV02", "TV02", "Thư viện", "3", "02", 7, rtHocNhom.Id, "Sức chứa 5–7 người • Smart TV • Bảng trắng • WiFi"),
                ("Phòng học nhóm TV03", "TV03", "Thư viện", "3", "03", 7, rtHocNhom.Id, "Sức chứa 5–7 người • Smart TV • Bảng kính • WiFi"),
                ("Phòng học nhóm TV04", "TV04", "Thư viện", "3", "04", 7, rtHocNhom.Id, "Sức chứa 5–7 người • Màn hình TV • Bảng trắng • WiFi"),

                // Thư viện - Tầng 3: phòng thuyết trình & hội thảo
                ("Phòng thuyết trình TT01", "TT01", "Thư viện", "3", "05", 20, rtThuyetTrinh.Id, "Sức chứa 8–20 người • Máy chiếu • Âm thanh • Bảng tương tác"),
                ("Phòng hội thảo HT01", "HT01", "Thư viện", "3", "06", 90, rtHoiThao.Id, "Sức chứa 50–90 người • Âm thanh hội nghị • Máy chiếu • Điều hòa"),
            };

            // Các phòng demo cũ được tái sử dụng mã để không làm mất lịch sử đặt phòng.
            var legacyCodeByNewCode = new Dictionary<string, string>
            {
                ["TV01"] = "A101",
                ["TV02"] = "A102",
                ["TV03"] = "A103",
                ["TV04"] = "A104",
                ["TT01"] = "A201",
                ["HT01"] = "B201",
            };

            foreach (var r in demoRooms)
            {
                var existing = await dbContext.Rooms
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.RoomCode == r.Code);

                if (existing == null && legacyCodeByNewCode.TryGetValue(r.Code, out var legacyCode))
                {
                    existing = await dbContext.Rooms
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(x => x.RoomCode == legacyCode);
                }

                if (existing == null)
                {
                    dbContext.Rooms.Add(new Room
                    {
                        Name = r.Name,
                        RoomCode = r.Code,
                        Building = r.Building,
                        Floor = r.Floor,
                        RoomNumber = r.RoomNumber,
                        Capacity = r.Capacity,
                        RoomTypeId = r.TypeId,
                        Status = "Available",
                        Description = r.Description,
                        CreatedAt = DateTime.UtcNow
                    });
                    continue;
                }

                existing.Name = r.Name;
                existing.RoomCode = r.Code;
                existing.Building = r.Building;
                existing.Floor = r.Floor;
                existing.RoomNumber = r.RoomNumber;
                existing.Capacity = r.Capacity;
                existing.RoomTypeId = r.TypeId;
                existing.Description = r.Description;
                existing.Status = "Available";
                existing.IsDeleted = false;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            // Phải lưu mã phòng mới trước khi dọn các mã demo cũ,
            // nếu không các phòng vừa tái sử dụng sẽ bị đánh dấu xóa nhầm.
            await dbContext.SaveChangesAsync();

            // Ẩn các phòng demo không còn thuộc danh mục phòng dùng chung của Thư viện.
            var newRoomCodes = demoRooms.Select(r => r.Code).ToHashSet();
            var legacyRoomCodes = new[]
            {
                "A101", "A102", "A103", "A104", "A201", "A202",
                "A301", "A302", "A303", "A304", "B201", "B203",
                "B204", "B301", "B302", "C101"
            };

            var staleRooms = await dbContext.Rooms
                .IgnoreQueryFilters()
                .Where(r => legacyRoomCodes.Contains(r.RoomCode) && !newRoomCodes.Contains(r.RoomCode))
                .ToListAsync();

            foreach (var room in staleRooms)
            {
                room.IsDeleted = true;
                room.Status = "Ngừng sử dụng";
                room.UpdatedAt = DateTime.UtcNow;
            }

            // Ẩn các loại phòng demo cũ; chỉ giữ 3 loại phòng của Thư viện.
            var legacyRoomTypeNames = new[]
            {
                "Hội trường", "Phòng họp", "Phòng Lý thuyết", "Phòng Thực hành"
            };

            var staleRoomTypes = await dbContext.RoomTypes
                .IgnoreQueryFilters()
                .Where(rt => legacyRoomTypeNames.Contains(rt.Name))
                .ToListAsync();

            foreach (var roomType in staleRoomTypes)
            {
                roomType.IsDeleted = true;
                roomType.Status = "Ngừng hoạt động";
                roomType.UpdatedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync();
        }

        private static async Task<RoomType> EnsureRoomTypeAsync(
            ApplicationDbContext dbContext,
            string name,
            string description,
            int defaultCapacity,
            int departmentId)
        {
            var roomType = await dbContext.RoomTypes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(rt => rt.Name == name);

            if (roomType == null)
            {
                roomType = new RoomType
                {
                    Name = name,
                    Description = description,
                    DefaultCapacity = defaultCapacity,
                    DepartmentId = departmentId,
                    IsBookingByPeriod = false,
                    Status = "Hoạt động",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.RoomTypes.Add(roomType);
                await dbContext.SaveChangesAsync();
                return roomType;
            }

            roomType.Description = description;
            roomType.DefaultCapacity = defaultCapacity;
            roomType.DepartmentId = departmentId;
            roomType.IsBookingByPeriod = false;
            roomType.Status = "Hoạt động";
            roomType.IsDeleted = false;
            roomType.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
            return roomType;
        }

        private static async Task EnsureDemoBookingsAsync(ApplicationDbContext dbContext)
        {
            // Bỏ tự động tạo booking mẫu để giữ lịch sử đặt phòng sạch
            await Task.CompletedTask;
            return;
        }

        private static async Task EnsureDemoEquipmentsAsync(ApplicationDbContext dbContext)
        {
            var catMayChieu = await dbContext.EquipmentCategories.FirstOrDefaultAsync(c => c.Name == "Máy chiếu");
            if (catMayChieu == null)
            {
                catMayChieu = new EquipmentCategory { Name = "Máy chiếu", Description = "Máy chiếu phục vụ phòng học và hội trường" };
                dbContext.EquipmentCategories.Add(catMayChieu);
            }

            var catMayTinh = await dbContext.EquipmentCategories.FirstOrDefaultAsync(c => c.Name == "Máy tính");
            if (catMayTinh == null)
            {
                catMayTinh = new EquipmentCategory { Name = "Máy tính", Description = "Dàn máy tính cho các phòng thực hành" };
                dbContext.EquipmentCategories.Add(catMayTinh);
            }

            var catAmThanh = await dbContext.EquipmentCategories.FirstOrDefaultAsync(c => c.Name == "Âm thanh");
            if (catAmThanh == null)
            {
                catAmThanh = new EquipmentCategory { Name = "Âm thanh", Description = "Micro và thiết bị âm thanh trợ giảng" };
                dbContext.EquipmentCategories.Add(catAmThanh);
            }

            await dbContext.SaveChangesAsync();

            var demoEquipments = new (string Code, string Name, string Description, int CategoryId, int TotalQuantity)[]
            {
                ("MC-HUIT-01", "Máy chiếu Sony Laser", "Máy chiếu độ phân giải cao cổng HDMI", catMayChieu.Id, 15),
                ("PC-LAB-01", "Dàn máy tính Lab CNTT", "Máy tính để bàn Core i7 16GB RAM", catMayTinh.Id, 50),
                ("MIC-01", "Micro không dây trợ giảng", "Micro kèm bộ thu phát sóng UHF", catAmThanh.Id, 30),
            };

            foreach (var eq in demoEquipments)
            {
                var existing = await dbContext.Equipments.FirstOrDefaultAsync(e => e.Code == eq.Code);
                if (existing == null)
                {
                    dbContext.Equipments.Add(new Equipment
                    {
                        Code = eq.Code,
                        Name = eq.Name,
                        Description = eq.Description,
                        EquipmentCategoryId = eq.CategoryId,
                        TotalQuantity = eq.TotalQuantity,
                        AvailableQuantity = eq.TotalQuantity,
                        Status = "Hoạt động",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await dbContext.SaveChangesAsync();
        }

        private static async Task EnsureDemoViolationsAsync(ApplicationDbContext dbContext, UserManager<User> userManager)
        {
            if (!await dbContext.ViolationTypes.AnyAsync())
            {
                var types = new List<ViolationType>
                {
                    new ViolationType
                    {
                        Code = "VT01",
                        Name = "Trả phòng trễ giờ",
                        Description = "Không bàn giao phòng đúng giờ kết thúc đã đăng ký gây ảnh hưởng ca tiếp theo",
                        Severity = 1,
                        DefaultPenalty = "Nhắc nhở / Cảnh cáo lần đầu",
                        CreatedAt = DateTime.UtcNow
                    },
                    new ViolationType
                    {
                        Code = "VT02",
                        Name = "Gây ồn ào mất trật tự",
                        Description = "La hét, mở âm thanh quá lớn ảnh hưởng các phòng xung quanh trong thư viện",
                        Severity = 1,
                        DefaultPenalty = "Yêu cầu giữ trật tự / Nhắc nhở",
                        CreatedAt = DateTime.UtcNow
                    },
                    new ViolationType
                    {
                        Code = "VT03",
                        Name = "Mang đồ ăn, thức uống có mùi",
                        Description = "Mang thức ăn nhanh, nước uống có màu/mùi vào phòng trái quy định",
                        Severity = 2,
                        DefaultPenalty = "Cảnh cáo & Vệ sinh lại phòng",
                        CreatedAt = DateTime.UtcNow
                    },
                    new ViolationType
                    {
                        Code = "VT04",
                        Name = "Không vệ sinh / Không tắt thiết bị",
                        Description = "Xả rác bừa bãi, không tắt đèn, quạt, máy lạnh khi rời phòng",
                        Severity = 2,
                        DefaultPenalty = "Cảnh cáo & Cấm mượn phòng 3 ngày",
                        CreatedAt = DateTime.UtcNow
                    },
                    new ViolationType
                    {
                        Code = "VT05",
                        Name = "Làm hư hỏng hoặc thất thoát trang thiết bị",
                        Description = "Làm rơi vỡ micro, đứt dây HDMI, vẽ bậy lên bàn ghế, hư bảng viết",
                        Severity = 3,
                        DefaultPenalty = "Bồi thường chi phí sửa chữa & Cấm mượn phòng 14 ngày",
                        CreatedAt = DateTime.UtcNow
                    },
                    new ViolationType
                    {
                        Code = "VT06",
                        Name = "Sử dụng phòng sai mục đích / Chuyển nhượng",
                        Description = "Đăng ký học nhóm nhưng tổ chức kinh doanh hoặc cho người ngoài thuê lại",
                        Severity = 4,
                        DefaultPenalty = "Cấm mượn phòng 30 ngày & Trừ điểm rèn luyện",
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await dbContext.ViolationTypes.AddRangeAsync(types);
                await dbContext.SaveChangesAsync();
            }

            // Seed demo records if not exist
            if (!await dbContext.ViolationRecords.AnyAsync())
            {
                var allTypes = await dbContext.ViolationTypes.ToListAsync();
                var vtDamage = allTypes.FirstOrDefault(t => t.Code == "VT05") ?? allTypes.First();
                var vtLate = allTypes.FirstOrDefault(t => t.Code == "VT01") ?? allTypes.First();

                var studentEm = await dbContext.Users.FirstOrDefaultAsync(u => u.CardCode == "200123460" || u.UserName == "200123460" || u.Email.Contains("hoangvanem"))
                    ?? await dbContext.Users.FirstOrDefaultAsync(u => !u.IsDeleted);
                var studentCuong = await dbContext.Users.FirstOrDefaultAsync(u => u.CardCode == "200123458" || u.UserName == "200123458" || u.Email.Contains("cuong"))
                    ?? await dbContext.Users.Skip(1).FirstOrDefaultAsync(u => !u.IsDeleted);

                if (studentEm != null)
                {
                    var vr1 = new ViolationRecord
                    {
                        Code = $"VP-{DateTime.UtcNow:yyyyMMdd}-001",
                        UserId = studentEm.Id,
                        ViolationTypeId = vtDamage.Id,
                        IncidentTime = DateTime.UtcNow.AddDays(-2),
                        Description = "Làm gãy chân giá đỡ máy chiếu và làm trầy xước màn hình tivi phòng A102",
                        Severity = 3,
                        PenaltyApplied = "Bồi thường chi phí sửa chữa & Cấm mượn phòng 14 ngày",
                        Status = "Chờ xử lý",
                        CreatedAt = DateTime.UtcNow.AddDays(-2)
                    };
                    dbContext.ViolationRecords.Add(vr1);

                    // Add active restriction
                    dbContext.UserRestrictions.Add(new UserRestriction
                    {
                        UserId = studentEm.Id,
                        RestrictionType = "Cấm mượn phòng",
                        Reason = $"[Biên bản #{vr1.Code}] Bồi thường chi phí sửa chữa & Cấm mượn phòng 14 ngày",
                        StartAt = DateTime.UtcNow.AddDays(-2),
                        EndAt = DateTime.UtcNow.AddDays(12),
                        Status = "Hoạt động",
                        CreatedAt = DateTime.UtcNow.AddDays(-2)
                    });
                }

                if (studentCuong != null)
                {
                    var vr2 = new ViolationRecord
                    {
                        Code = $"VP-{DateTime.UtcNow:yyyyMMdd}-002",
                        UserId = studentCuong.Id,
                        ViolationTypeId = vtLate.Id,
                        IncidentTime = DateTime.UtcNow.AddDays(-1),
                        Description = "Quá giờ ca mượn 25 phút chưa trả phòng B201 khiến ca tiếp theo phải chờ",
                        Severity = 1,
                        PenaltyApplied = "Nhắc nhở và ghi nhận biên bản vi phạm lần 1",
                        Status = "Đã xử lý",
                        CreatedAt = DateTime.UtcNow.AddDays(-1)
                    };
                    dbContext.ViolationRecords.Add(vr2);
                }

                await dbContext.SaveChangesAsync();
            }
        }

        private static async Task EnsureDemoShiftsAsync(ApplicationDbContext dbContext)
        {
            if (await dbContext.Shifts.AnyAsync()) return;

            var employees = await dbContext.Employees
                .Include(e => e.User)
                .Where(e => e.Status == "Hoạt động")
                .ToListAsync();

            if (!employees.Any()) return;

            var empTV1 = employees.FirstOrDefault(e => e.User?.UserName?.Contains("tv001") == true || e.Code.Contains("TV001")) ?? employees[0];
            var empTV2 = employees.FirstOrDefault(e => e.User?.UserName?.Contains("tv002") == true || e.Code.Contains("TV002")) ?? employees[Math.Min(1, employees.Count - 1)];
            var empTV3 = employees.FirstOrDefault(e => e.User?.UserName?.Contains("tv003") == true || e.Code.Contains("TV003")) ?? employees[Math.Min(2, employees.Count - 1)];
            var empQLP1 = employees.FirstOrDefault(e => e.User?.UserName?.Contains("qlp001") == true || e.Code.Contains("QLP001")) ?? employees[Math.Min(3, employees.Count - 1)];
            var empQLP2 = employees.FirstOrDefault(e => e.User?.UserName?.Contains("qlp002") == true || e.Code.Contains("QLP002")) ?? employees[Math.Min(4, employees.Count - 1)];

            var today = DateTime.UtcNow.Date;

            // Shift schedule templates across 7 days (-2 to +4)
            var shiftPlan = new List<(int dayOffset, string name, TimeSpan start, TimeSpan end, string status, Employee[] assigned)>
            {
                // Day -2
                (-2, "Ca Sáng - Quản lý phòng & Tiếp nhận mượn", new TimeSpan(7, 0, 0), new TimeSpan(11, 30, 0), "Hoàn thành", new[] { empTV1, empQLP1 }),
                (-2, "Ca Chiều - Hỗ trợ thiết bị phòng hội thảo", new TimeSpan(12, 30, 0), new TimeSpan(17, 0, 0), "Hoàn thành", new[] { empTV2 }),
                // Day -1
                (-1, "Ca Sáng - Kiểm tra thiết bị & Tiếp đón", new TimeSpan(7, 0, 0), new TimeSpan(11, 30, 0), "Hoàn thành", new[] { empTV3, empQLP2 }),
                (-1, "Ca Chiều - Giám sát phòng tự học & Hội thảo", new TimeSpan(12, 30, 0), new TimeSpan(17, 0, 0), "Hoàn thành", new[] { empTV1, empQLP1 }),
                (-1, "Ca Tối - Trực phòng học nhóm & Thu hồi chìa khóa", new TimeSpan(17, 30, 0), new TimeSpan(21, 0, 0), "Hoàn thành", new[] { empTV2 }),
                // Today (0)
                (0, "Ca Sáng - Điều phối ca mượn & Bàn giao thiết bị", new TimeSpan(7, 0, 0), new TimeSpan(11, 30, 0), "Hoàn thành", new[] { empTV1, empQLP1 }),
                (0, "Ca Chiều - Giám sát thời gian thực & Tiếp nhận trả phòng", new TimeSpan(12, 30, 0), new TimeSpan(17, 0, 0), "Đang trực", new[] { empTV2, empQLP2 }),
                (0, "Ca Tối - Khóa phòng & Kiểm kê trang thiết bị cuối ngày", new TimeSpan(17, 30, 0), new TimeSpan(21, 0, 0), "Lên lịch", new[] { empTV3 }),
                // Tomorrow (+1)
                (1, "Ca Sáng - Phục vụ phòng học chuyên đề & Lab", new TimeSpan(7, 0, 0), new TimeSpan(11, 30, 0), "Lên lịch", new[] { empTV1, empQLP2 }),
                (1, "Ca Chiều - Kiểm tra vệ sinh & Trả phòng", new TimeSpan(12, 30, 0), new TimeSpan(17, 0, 0), "Lên lịch", new[] { empTV3 }),
                // Day +2
                (2, "Ca Sáng - Hỗ trợ hội thảo Khoa CNTT", new TimeSpan(7, 0, 0), new TimeSpan(11, 30, 0), "Lên lịch", new[] { empTV2, empQLP1 }),
                (2, "Ca Chiều - Phục vụ phòng tự học thông minh", new TimeSpan(12, 30, 0), new TimeSpan(17, 0, 0), "Lên lịch", new[] { empTV1 }),
                // Day +3
                (3, "Ca Sáng - Điều phối phòng Lab thực hành", new TimeSpan(7, 0, 0), new TimeSpan(11, 30, 0), "Lên lịch", new[] { empTV3, empQLP2 }),
                (3, "Ca Chiều - Giám sát an ninh & Thiết bị", new TimeSpan(12, 30, 0), new TimeSpan(17, 0, 0), "Lên lịch", new[] { empTV2 })
            };

            foreach (var item in shiftPlan)
            {
                var s = new Domain.Entities.Shift
                {
                    Date = DateTime.SpecifyKind(today.AddDays(item.dayOffset), DateTimeKind.Utc),
                    Name = item.name,
                    StartTime = item.start,
                    EndTime = item.end,
                    Status = item.status,
                    CreatedAt = DateTime.UtcNow.AddDays(item.dayOffset)
                };

                foreach (var emp in item.assigned)
                {
                    s.Employees.Add(emp);
                }

                dbContext.Shifts.Add(s);
            }

            // Seed sample ShiftLogs
            dbContext.ShiftLogs.AddRange(
                new ShiftLog
                {
                    LogTime = DateTime.UtcNow.AddDays(-1).Date.AddHours(11).AddMinutes(35),
                    Content = "Bàn giao ca sáng ngày hôm qua: Đã bàn giao 12 chìa khóa phòng, hệ thống điều hòa và máy chiếu phòng A101-A103 hoạt động tốt.",
                    Type = 1, // Bàn giao
                    EmployeeId = empTV1.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new ShiftLog
                {
                    LogTime = DateTime.UtcNow.AddDays(-1).Date.AddHours(16).AddMinutes(40),
                    Content = "Sự cố phát sinh: Cáp HDMI tại phòng thảo luận B201 bị chập chờn khi kết nối với máy tính xách tay. Đã ghi nhận chuyển bộ phận kỹ thuật.",
                    Type = 2, // Sự cố
                    EmployeeId = empTV2.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new ShiftLog
                {
                    LogTime = DateTime.UtcNow.Date.AddHours(11).AddMinutes(30),
                    Content = "Bàn giao ca sáng hôm nay: Đã tiếp nhận và hỗ trợ 8 lượt mượn phòng. Phòng họp A102 đã được bàn giao sạch sẽ sau giờ mượn.",
                    Type = 1, // Bàn giao
                    EmployeeId = empTV1.Id,
                    CreatedAt = DateTime.UtcNow
                },
                new ShiftLog
                {
                    LogTime = DateTime.UtcNow.Date.AddHours(14).AddMinutes(15),
                    Content = "Kiểm tra an ninh & vệ sinh: Tất cả các phòng tầng 2 và tầng 3 khu tự học đều tuân thủ quy định giữ trật tự và không mang thức ăn vào phòng.",
                    Type = 3, // Kiểm tra an ninh / vệ sinh
                    EmployeeId = empTV2.Id,
                    CreatedAt = DateTime.UtcNow
                }
            );

            await dbContext.SaveChangesAsync();
        }
    }
}
