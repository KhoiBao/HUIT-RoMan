using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Domain;
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
            string[] roles = { "Admin", "Manager", "Employee", "Student", "Lecturer" };

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
            await EnsureLibraryWorkingHoursAsync(dbContext, deptThuVien.Id);
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
            await EnsureEmployeeAsync(userManager, dbContext, "200123001", "Nhân Viên Đào Tạo", deptDaoTao.Id, "Chuyên viên");
            await EnsureEmployeeAsync(userManager, dbContext, "200123002", "Nhân Viên Thư Viện", deptThuVien.Id, "Thủ thư");

            // 4b. Tài khoản hệ thống cho chế độ tự động duyệt + cấu hình mặc định
            await EnsureAutoApproveSystemAccountAsync(userManager, dbContext, deptAdmin.Id);

            // 5. Khởi tạo Sinh viên & Giảng viên thuộc Khoa CNTT
            await EnsureUserAsync(userManager, "300123001", "Sinh Viên CNTT 01", "Student", deptCNTT.Id);
            await EnsureUserAsync(userManager, "300123002", "Giảng Viên CNTT 01", "Lecturer", deptCNTT.Id);

            // 5b. Tài khoản demo cho đồ án nội bộ (login bằng email @huit.edu.vn, pass Huit@123).
            // Nhóm người dùng: 5 SV + 3 GV; nhóm nhân sự: 3 thủ thư + 3 quản lý phòng; nhóm quản trị: +2 admin.
            const string demoPassword = "Huit@123";
            var students = new[]
            {
                ("2001230399", "NLDK"),
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
                ("400123001", "Trưởng Đơn vị Thư viện", "Manager", "Quản lý Thư viện"),
                ("400123002", "Thủ thư 02", "Employee", "Thủ thư"),
                ("400123003", "Thủ thư 03", "Employee", "Thủ thư"),
            };
            foreach (var (code, name, role, pos) in librarians)
                await EnsureDemoAccountAsync(userManager, dbContext, code, $"{code.ToLower()}@huit.edu.vn", name, role, deptThuVien.Id, demoPassword, pos);

            var managers = new[]
            {
                ("500123001", "Trưởng Phòng Đào tạo", "Manager", "Quản lý Phòng Đào tạo"),
                ("500123002", "Quản lý phòng 02", "Employee", "Nhân viên phòng đào tạo"),
                ("500123003", "Quản lý phòng 03", "Employee", "Nhân viên phòng đào tạo"),
            };
            foreach (var (code, name, role, pos) in managers)
                await EnsureDemoAccountAsync(userManager, dbContext, code, $"{code.ToLower()}@huit.edu.vn", name, role, deptDaoTao.Id, demoPassword, pos);

            // 6. Apply Stored Procedures / Functions PostgreSQL
            await SeedStoredProceduresAsync(dbContext);

            // 6b. Dọn phiên nhận phòng mồ côi của các chi tiết đã hủy/từ chối
            await EnsureUsageSessionConsistencyAsync(dbContext);

            // 7. Khởi tạo danh mục Tiết học cho phòng lý thuyết và phòng thực hành
            await EnsurePeriodsAsync(dbContext, deptDaoTao.Id);

            // 8. Khởi tạo các phòng dùng chung của Thư viện và phòng học theo tiết
            await EnsureDemoRoomsAsync(dbContext, deptThuVien.Id, deptDaoTao.Id);

            // 9. Khởi tạo danh mục Loại vi phạm (ViolationTypes)
            await EnsureViolationTypesAsync(dbContext);
        }

        /// <summary>
        /// Đồng bộ trạng thái phiên nhận phòng với chi tiết đơn: các phiên còn
        /// "Chờ nhận phòng" nhưng chi tiết đã hủy/từ chối là dữ liệu cũ do luồng
        /// hủy đơn trước đây không cập nhật phiên. Idempotent, chạy mỗi lần khởi động.
        /// </summary>
        private static async Task EnsureUsageSessionConsistencyAsync(ApplicationDbContext dbContext)
        {
            var sql = """
                UPDATE "UsageSessions" us
                SET "Status" = 'Đã hủy', "UpdatedAt" = NOW()
                FROM "BookingDetails" bd
                WHERE bd."Id" = us."BookingDetailId"
                  AND us."IsDeleted" = FALSE
                  AND us."Status" = 'Chờ nhận phòng'
                  AND bd."IsDeleted" = FALSE
                  AND bd."Status" IN ('Đã hủy', 'Từ chối');
                """;
            await dbContext.Database.ExecuteSqlRawAsync(sql);

            // Đồng bộ tin nhắn của các phiên chat đã kết thúc: tự động coi là đã đọc
            var chatSql = """
                UPDATE "ChatMessages" cm
                SET "IsRead" = TRUE
                FROM "ChatConversations" cc
                WHERE cc."Id" = cm."ChatConversationId"
                  AND cc."Status" IN ('Closed', 'Ended', 'Đã đóng')
                  AND cm."IsRead" = FALSE;
                """;
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(chatSql);
            }
            catch { }
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


        /// <summary>
        /// Bổ sung giờ phục vụ mặc định cho Thư viện nếu chưa có.
        /// Không ghi đè cấu hình do quản trị viên đã thay đổi.
        /// </summary>
        private static async Task EnsureLibraryWorkingHoursAsync(
            ApplicationDbContext dbContext, int departmentId)
        {
            var existingDays = await dbContext.WorkingHours
                .IgnoreQueryFilters()
                .Where(w => w.DepartmentId == departmentId)
                .Select(w => w.DayOfWeek)
                .ToListAsync();

            for (var day = 0; day <= 6; day++)
            {
                if (existingDays.Contains(day)) continue;

                dbContext.WorkingHours.Add(new WorkingHour
                {
                    DepartmentId = departmentId,
                    DayOfWeek = day,
                    OpenTime = new TimeSpan(7, 0, 0),
                    CloseTime = new TimeSpan(20, 0, 0),
                    IsClosed = day == (int)DayOfWeek.Sunday,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await dbContext.SaveChangesAsync();
        }

        private static async Task<Department> EnsureDepartmentAsync(
            ApplicationDbContext dbContext, string name, string type)
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

        /// <summary>
        /// Tạo tài khoản "hệ thống tự động duyệt" một lần duy nhất: không mật khẩu,
        /// không role, email không tồn tại nên không thể đăng nhập hay đặt lại mật khẩu.
        /// Tài khoản chỉ tồn tại để làm chủ thể FK cho các bản ghi duyệt tự động.
        /// </summary>
        private static async Task EnsureAutoApproveSystemAccountAsync(
            UserManager<User> userManager, ApplicationDbContext dbContext, int departmentId)
        {
            var user = await userManager.FindByNameAsync(SystemAccounts.AutoApproveUserName)
                ?? await dbContext.Users.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.CardCode == SystemAccounts.AutoApproveEmployeeCode);

            if (user == null)
            {
                user = new User
                {
                    UserName = SystemAccounts.AutoApproveUserName,
                    CardCode = SystemAccounts.AutoApproveEmployeeCode,
                    FullName = SystemAccounts.AutoApproveDisplayName,
                    Email = "system.auto-approve@huit.invalid",
                    EmailConfirmed = false,
                    Status = "Hoạt động",
                    DepartmentId = departmentId
                };

                // CreateAsync không kèm mật khẩu => PasswordHash = NULL => không thể đăng nhập.
                var created = await userManager.CreateAsync(user);
                if (!created.Succeeded) return;
            }

            if (user.PasswordHash != null || user.EmailConfirmed)
            {
                user.PasswordHash = null;
                user.EmailConfirmed = false;
                await userManager.UpdateAsync(user);
            }

            var roles = await userManager.GetRolesAsync(user);
            if (roles.Count > 0)
                await userManager.RemoveFromRolesAsync(user, roles);

            if (!await dbContext.Employees.IgnoreQueryFilters().AnyAsync(e => e.UserId == user.Id))
            {
                dbContext.Employees.Add(new Employee
                {
                    Code = SystemAccounts.AutoApproveEmployeeCode,
                    Position = "Tự động duyệt",
                    Status = "Hoạt động",
                    UserId = user.Id
                });
                await dbContext.SaveChangesAsync();
            }

            if (!await dbContext.SystemSettings.AnyAsync(s => s.Key == SystemSettingKeys.BookingAutoApprove))
            {
                dbContext.SystemSettings.Add(new SystemSetting
                {
                    Key = SystemSettingKeys.BookingAutoApprove,
                    Value = "false",
                    UpdatedAt = DateTime.UtcNow
                });
                await dbContext.SaveChangesAsync();
            }
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
            if (role == "Employee" || role == "Manager")
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

        private static async Task EnsurePeriodsAsync(ApplicationDbContext dbContext, int departmentId)
        {
            var theoryType = await EnsureRoomTypeAsync(
                dbContext,
                RoomCatalogSeed.TheoryRoomTypeName,
                "Phòng lý thuyết, đăng ký theo 16 tiết học cố định.",
                RoomCatalogSeed.TheoryRoomCapacity,
                departmentId,
                isBookingByPeriod: true);

            var practiceType = await EnsureRoomTypeAsync(
                dbContext,
                RoomCatalogSeed.PracticeRoomTypeName,
                "Phòng máy thực hành, đăng ký theo 16 tiết học cố định.",
                RoomCatalogSeed.PracticeRoomCapacity,
                departmentId,
                isBookingByPeriod: true);

            await EnsurePeriodSetAsync(dbContext, theoryType.Id, RoomCatalogSeed.TheoryPeriods, adoptUnassigned: true);
            await EnsurePeriodSetAsync(dbContext, practiceType.Id, RoomCatalogSeed.PracticePeriods, adoptUnassigned: false);

            await dbContext.SaveChangesAsync();
        }

        /// <summary>
        /// Seed một bộ 16 tiết cho một loại phòng.
        /// Bộ tiết cũ chưa gán RoomTypeId được nhận về loại phòng lý thuyết để giữ
        /// nguyên Id đang được BookingDetails tham chiếu.
        /// </summary>
        private static async Task EnsurePeriodSetAsync(
            ApplicationDbContext dbContext,
            int roomTypeId,
            IReadOnlyList<RoomCatalogSeed.PeriodSeed> periods,
            bool adoptUnassigned)
        {
            foreach (var seed in periods)
            {
                var existing = await dbContext.Periods
                    .IgnoreQueryFilters()
                    .Where(p => p.Name == seed.Name
                             && (p.RoomTypeId == roomTypeId
                                 || (adoptUnassigned && p.RoomTypeId == null)))
                    .OrderBy(p => p.Id)
                    .FirstOrDefaultAsync();

                if (existing == null)
                {
                    dbContext.Periods.Add(new Period
                    {
                        Name = seed.Name,
                        StartTime = seed.Start,
                        EndTime = seed.End,
                        RoomTypeId = roomTypeId,
                        CreatedAt = DateTime.UtcNow
                    });
                    continue;
                }

                existing.StartTime = seed.Start;
                existing.EndTime = seed.End;
                existing.RoomTypeId = roomTypeId;
                existing.IsDeleted = false;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        private static async Task EnsureDemoRoomsAsync(ApplicationDbContext dbContext, int departmentId, int academicDepartmentId)
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

            foreach (var r in demoRooms)
            {
                var existing = await dbContext.Rooms
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.RoomCode == r.Code);

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
                        Status = RoomStatuses.Available,
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
                // Giữ nguyên trạng thái do quản trị viên thiết lập (vd. Bảo trì);
                // chỉ chuẩn hoá lại giá trị cũ không còn hợp lệ.
                if (!RoomStatuses.IsValid(existing.Status))
                    existing.Status = RoomStatuses.Available;
                existing.IsDeleted = false;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            // Phải lưu mã phòng mới trước khi dọn các mã demo cũ,
            // nếu không các phòng vừa tái sử dụng sẽ bị đánh dấu xóa nhầm.
            await dbContext.SaveChangesAsync();

            // Ẩn các phòng demo cũ không còn thuộc danh mục sử dụng.
            // Các mã A101–A511/B201–B511 được seed lại ở bước phòng học theo tiết.
            var newRoomCodes = demoRooms.Select(r => r.Code).ToHashSet();
            var legacyRoomCodes = new[] { "C101" };

            var staleRooms = await dbContext.Rooms
                .IgnoreQueryFilters()
                .Where(r => legacyRoomCodes.Contains(r.RoomCode) && !newRoomCodes.Contains(r.RoomCode))
                .ToListAsync();

            foreach (var room in staleRooms)
            {
                room.IsDeleted = true;
                room.Status = RoomStatuses.Maintenance;
                room.UpdatedAt = DateTime.UtcNow;
            }

            // Ẩn các loại phòng demo cũ không còn sử dụng; giữ lại loại phòng
            // lý thuyết/thực hành cho phòng học theo tiết.
            var legacyRoomTypeNames = new[]
            {
                "Hội trường", "Phòng họp"
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

            await EnsureAcademicRoomsAsync(dbContext, academicDepartmentId);

            await dbContext.SaveChangesAsync();
        }

        /// <summary>
        /// Seed 11 phòng thực hành A101–A111 và 88 phòng lý thuyết A201–A511/B201–B511.
        /// Mỗi mã phòng được tìm kể cả bản ghi đã xóa mềm để tái sử dụng Id cũ,
        /// tránh nhân đôi phòng hoặc làm mất lịch sử đặt phòng.
        /// </summary>
        private static async Task EnsureAcademicRoomsAsync(ApplicationDbContext dbContext, int departmentId)
        {
            var theoryType = await EnsureRoomTypeAsync(
                dbContext,
                RoomCatalogSeed.TheoryRoomTypeName,
                "Phòng lý thuyết, đăng ký theo 16 tiết học cố định.",
                RoomCatalogSeed.TheoryRoomCapacity,
                departmentId,
                isBookingByPeriod: true);

            var practiceType = await EnsureRoomTypeAsync(
                dbContext,
                RoomCatalogSeed.PracticeRoomTypeName,
                "Phòng máy thực hành, đăng ký theo 16 tiết học cố định.",
                RoomCatalogSeed.PracticeRoomCapacity,
                departmentId,
                isBookingByPeriod: true);

            await EnsureRoomSetAsync(dbContext, RoomCatalogSeed.TheoryRooms, theoryType.Id);
            await EnsureRoomSetAsync(dbContext, RoomCatalogSeed.PracticeRooms, practiceType.Id);
        }

        private static async Task EnsureRoomSetAsync(
            ApplicationDbContext dbContext,
            IReadOnlyList<RoomCatalogSeed.RoomSeed> rooms,
            int roomTypeId)
        {
            var codes = rooms.Select(r => r.Code).ToList();
            var existingRooms = await dbContext.Rooms
                .IgnoreQueryFilters()
                .Where(r => codes.Contains(r.RoomCode))
                .ToDictionaryAsync(r => r.RoomCode);

            foreach (var seed in rooms)
            {
                if (existingRooms.TryGetValue(seed.Code, out var room))
                {
                    var reclassified = room.RoomTypeId != roomTypeId;
                    room.Name = seed.Name;
                    room.Building = seed.Building;
                    room.Floor = seed.Floor;
                    room.RoomNumber = seed.RoomNumber;
                    room.Capacity = seed.Capacity;
                    room.RoomTypeId = roomTypeId;
                    room.IsDeleted = false;
                    room.UpdatedAt = DateTime.UtcNow;
                    // Chỉ đặt lại trạng thái khi phòng được tái sử dụng; giữ
                    // nguyên trạng thái bảo trì do quản trị viên thiết lập.
                    if (reclassified || !RoomStatuses.IsValid(room.Status))
                        room.Status = RoomStatuses.Available;
                    if (reclassified || string.IsNullOrWhiteSpace(room.Description))
                        room.Description = seed.Description;
                    continue;
                }

                dbContext.Rooms.Add(new Room
                {
                    Name = seed.Name,
                    RoomCode = seed.Code,
                    Building = seed.Building,
                    Floor = seed.Floor,
                    RoomNumber = seed.RoomNumber,
                    Capacity = seed.Capacity,
                    RoomTypeId = roomTypeId,
                    Status = RoomStatuses.Available,
                    Description = seed.Description,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        private static async Task<RoomType> EnsureRoomTypeAsync(
            ApplicationDbContext dbContext,
            string name,
            string description,
            int defaultCapacity,
            int departmentId,
            bool isBookingByPeriod = false)
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
                    IsBookingByPeriod = isBookingByPeriod,
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
            roomType.IsBookingByPeriod = isBookingByPeriod;
            roomType.Status = "Hoạt động";
            roomType.IsDeleted = false;
            roomType.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
            return roomType;
        }

        private static async Task EnsureViolationTypesAsync(ApplicationDbContext dbContext)
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
        }
    }
}
