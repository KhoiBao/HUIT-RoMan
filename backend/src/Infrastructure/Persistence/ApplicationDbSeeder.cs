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

            // 6. Apply Stored Procedures / Functions PostgreSQL
            await SeedStoredProceduresAsync(dbContext);
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
    }
}
