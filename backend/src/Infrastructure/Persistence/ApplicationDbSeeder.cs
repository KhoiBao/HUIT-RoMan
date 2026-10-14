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

            // 8. Khởi tạo các phòng demo (theo tiết & theo giờ)
            await EnsureDemoRoomsAsync(dbContext, deptDaoTao.Id);

            // 9. Khởi tạo lịch mẫu cho ngày hôm nay
            await EnsureDemoBookingsAsync(dbContext);
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
            var rtHocNhom = await dbContext.RoomTypes.FirstOrDefaultAsync(r => r.Name == "Phòng học nhóm");
            if (rtHocNhom == null)
            {
                rtHocNhom = new RoomType
                {
                    Name = "Phòng học nhóm",
                    Description = "Phòng học nhóm 5-7 chỗ (Học thuật)",
                    DefaultCapacity = 7,
                    DepartmentId = departmentId,
                    IsBookingByPeriod = false,
                    Status = "Hoạt động",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.RoomTypes.Add(rtHocNhom);
                await dbContext.SaveChangesAsync();
            }

            var rtHoiTruong = await dbContext.RoomTypes.FirstOrDefaultAsync(r => r.Name == "Hội trường");
            if (rtHoiTruong == null)
            {
                rtHoiTruong = new RoomType
                {
                    Name = "Hội trường",
                    Description = "Hội trường tổ chức sự kiện, hội nghị",
                    DefaultCapacity = 200,
                    DepartmentId = departmentId,
                    IsBookingByPeriod = false,
                    Status = "Hoạt động",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.RoomTypes.Add(rtHoiTruong);
                await dbContext.SaveChangesAsync();
            }

            var rtPhongHop = await dbContext.RoomTypes.FirstOrDefaultAsync(r => r.Name == "Phòng họp");
            if (rtPhongHop == null)
            {
                rtPhongHop = new RoomType
                {
                    Name = "Phòng họp",
                    Description = "Phòng họp, hội thảo quy mô vừa và nhỏ",
                    DefaultCapacity = 30,
                    DepartmentId = departmentId,
                    IsBookingByPeriod = false,
                    Status = "Hoạt động",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.RoomTypes.Add(rtPhongHop);
                await dbContext.SaveChangesAsync();
            }

            var demoRooms = new (string Name, string Code, string Building, string Floor, string RoomNumber, int Capacity, int TypeId, string Description)[]
            {
                ("Phòng A101", "A101", "A", "Khu Tầng 3 (Học thuật)", "101", 7, rtHocNhom.Id, "Màn chiếu TV • 6 Ổ cắm"),
                ("Phòng A102", "A102", "A", "Khu Tầng 3 (Học thuật)", "102", 7, rtHocNhom.Id, "Smart TV 55\" • Bảng trắng"),
                ("Phòng A103", "A103", "A", "Khu Tầng 3 (Học thuật)", "103", 5, rtHocNhom.Id, "WiFi Riêng • Bảng kính"),
                ("Phòng A104", "A104", "A", "Khu Tầng 3 (Học thuật)", "104", 7, rtHocNhom.Id, "Màn hình TV • Micro hội họp"),
                ("Phòng B201", "B201", "B", "Khu Tầng 3 (Học thuật)", "201", 60, rtHoiTruong.Id, "Âm thanh / Máy chiếu"),
            };

            foreach (var r in demoRooms)
            {
                var existing = await dbContext.Rooms.FirstOrDefaultAsync(x => x.RoomCode == r.Code);
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
                        Status = r.Code == "A104" ? "Đang sử dụng" : "Available",
                        Description = r.Description,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    existing.Description = r.Description;
                    existing.Floor = r.Floor;
                    if (r.Code == "A104") existing.Status = "Đang sử dụng";
                }
            }
            await dbContext.SaveChangesAsync();
        }

        private static async Task EnsureDemoBookingsAsync(ApplicationDbContext dbContext)
        {
            var admin = await dbContext.Users.FirstOrDefaultAsync(u => u.UserName == "admin" || u.Email == "admin@huit.edu.vn");
            if (admin == null) return;

            var rA101 = await dbContext.Rooms.FirstOrDefaultAsync(r => r.RoomCode == "A101");
            var rA102 = await dbContext.Rooms.FirstOrDefaultAsync(r => r.RoomCode == "A102");
            var rA104 = await dbContext.Rooms.FirstOrDefaultAsync(r => r.RoomCode == "A104");
            var rB201 = await dbContext.Rooms.FirstOrDefaultAsync(r => r.RoomCode == "B201");

            var today = DateTime.UtcNow.Date;

            // Check if demo booking exists for today
            var existingBooking = await dbContext.Bookings.FirstOrDefaultAsync(b => b.ActivityName == "Học nhóm Giải tích 2" && b.CreatedAt.Date == today);
            if (existingBooking != null) return;

            // Booking 1: A101 (08:00 - 10:00)
            if (rA101 != null)
            {
                var b1 = new Booking
                {
                    ActivityName = "Học nhóm Giải tích 2",
                    Purpose = "SV: 200121092 (Nhóm 4)",
                    GuestCount = 5,
                    Status = "Đã duyệt",
                    UserId = admin.Id,
                    RequestedAt = DateTime.UtcNow,
                    RejectionReason = "",
                    Note = "",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.Bookings.Add(b1);
                await dbContext.SaveChangesAsync();

                dbContext.BookingDetails.Add(new BookingDetail
                {
                    BookingId = b1.Id,
                    RoomId = rA101.Id,
                    StartAt = today.AddHours(1), // 08:00 UTC+7 is 01:00 UTC
                    EndAt = today.AddHours(3),   // 10:00 UTC+7 is 03:00 UTC
                    GuestCount = 5,
                    Purpose = "SV: 200121092 (Nhóm 4)",
                    Status = "Đã duyệt",
                    RejectionReason = "",
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Booking 2: A102 (10:30 - 12:00)
            if (rA102 != null)
            {
                var b2 = new Booking
                {
                    ActivityName = "Thảo luận đề tài",
                    Purpose = "K. Môi trường",
                    GuestCount = 6,
                    Status = "Đã duyệt",
                    UserId = admin.Id,
                    RequestedAt = DateTime.UtcNow,
                    RejectionReason = "",
                    Note = "",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.Bookings.Add(b2);
                await dbContext.SaveChangesAsync();

                dbContext.BookingDetails.Add(new BookingDetail
                {
                    BookingId = b2.Id,
                    RoomId = rA102.Id,
                    StartAt = today.AddHours(3).AddMinutes(30), // 10:30 UTC+7 is 03:30 UTC
                    EndAt = today.AddHours(5),                 // 12:00 UTC+7 is 05:00 UTC
                    GuestCount = 6,
                    Purpose = "K. Môi trường",
                    Status = "Đã duyệt",
                    RejectionReason = "",
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Booking 3: A104 (09:00 - 11:00) Đang diễn ra
            if (rA104 != null)
            {
                var b3 = new Booking
                {
                    ActivityName = "Nghiên cứu khoa học",
                    Purpose = "Nghiên cứu khoa học - Giảng viên...",
                    GuestCount = 7,
                    Status = "Đang sử dụng",
                    UserId = admin.Id,
                    RequestedAt = DateTime.UtcNow,
                    RejectionReason = "",
                    Note = "",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.Bookings.Add(b3);
                await dbContext.SaveChangesAsync();

                dbContext.BookingDetails.Add(new BookingDetail
                {
                    BookingId = b3.Id,
                    RoomId = rA104.Id,
                    StartAt = today.AddHours(2), // 09:00 UTC+7 is 02:00 UTC
                    EndAt = today.AddHours(4),   // 11:00 UTC+7 is 04:00 UTC
                    GuestCount = 7,
                    Purpose = "Nghiên cứu khoa học - Giảng viên...",
                    Status = "Đang sử dụng",
                    RejectionReason = "",
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Booking 4: B201 (08:30 - 11:30)
            if (rB201 != null)
            {
                var b4 = new Booking
                {
                    ActivityName = "Workshop CNTT & Trí tuệ nhân tạo",
                    Purpose = "Khoa CNTT ( Báo cáo viên Khách mời )",
                    GuestCount = 50,
                    Status = "Đã duyệt",
                    UserId = admin.Id,
                    RequestedAt = DateTime.UtcNow,
                    RejectionReason = "",
                    Note = "",
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.Bookings.Add(b4);
                await dbContext.SaveChangesAsync();

                dbContext.BookingDetails.Add(new BookingDetail
                {
                    BookingId = b4.Id,
                    RoomId = rB201.Id,
                    StartAt = today.AddHours(1).AddMinutes(30), // 08:30 UTC+7 is 01:30 UTC
                    EndAt = today.AddHours(4).AddMinutes(30),   // 11:30 UTC+7 is 04:30 UTC
                    GuestCount = 50,
                    Purpose = "Khoa CNTT ( Báo cáo viên Khách mời )",
                    Status = "Đã duyệt",
                    RejectionReason = "",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await dbContext.SaveChangesAsync();
        }
    }
}
