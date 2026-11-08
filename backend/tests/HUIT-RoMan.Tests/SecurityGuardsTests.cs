using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Application.Modules.Identity.Services;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using HUIT_RoMan.Infrastructure.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace HUIT_RoMan.Tests
{
    // Test hồi quy cho các guard bảo mật đã sửa: khóa tài khoản khi đăng nhập,
    // phân cấp quyền sửa thông tin (RoleHierarchy), reset mật khẩu admin,
    // và thông điệp forgot-password thống nhất chống dò tài khoản.
    public class SecurityGuardsTests : IDisposable
    {
        private readonly SqliteTestBed _bed;
        private readonly ApplicationDbContext _db;
        private readonly UserManager<User> _userManager;
        private readonly FakeRecordingEmailService _email = new();
        private readonly AuthService _authService;

        public SecurityGuardsTests()
        {
            _bed = new SqliteTestBed();
            _db = _bed.CreateContext();

            var store = new UserStore<User, IdentityRole<int>, ApplicationDbContext, int>(_db);
            _userManager = new UserManager<User>(
                store,
                Options.Create(new IdentityOptions()),
                new PasswordHasher<User>(),
                Array.Empty<IUserValidator<User>>(),
                Array.Empty<IPasswordValidator<User>>(),
                new UpperInvariantLookupNormalizer(),
                new IdentityErrorDescriber(),
                null!,
                NullLogger<UserManager<User>>.Instance);

            var roleStore = new RoleStore<IdentityRole<int>, ApplicationDbContext, int>(_db);
            var roleManager = new RoleManager<IdentityRole<int>>(
                roleStore,
                Array.Empty<IRoleValidator<IdentityRole<int>>>(),
                new UpperInvariantLookupNormalizer(),
                new IdentityErrorDescriber(),
                NullLogger<RoleManager<IdentityRole<int>>>.Instance);

            foreach (var role in new[] { "Student", "Lecturer", "Employee", "Manager", "Admin" })
                roleManager.CreateAsync(new IdentityRole<int>(role)).GetAwaiter().GetResult();

            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:Secret"] = "unit_test_secret_key_0123456789abcdef_0123456789abcdef",
                ["JwtSettings:Issuer"] = "HUIT-RoMan-API",
                ["JwtSettings:Audience"] = "HUIT-RoMan-Client"
            }).Build();

            _authService = new AuthService(
                _userManager,
                config,
                new UnitOfWork(_db),
                _email);
        }

        public void Dispose()
        {
            _db.Dispose();
            _bed.Dispose();
        }

        private User CreateUser(string cardCode, string role, string status = "Hoạt động")
        {
            var user = new User
            {
                UserName = cardCode,
                CardCode = cardCode,
                Email = $"{cardCode.ToLowerInvariant()}@huit.edu.vn",
                FullName = $"Người dùng {cardCode}",
                Status = status
            };
            _userManager.CreateAsync(user, "OldPass@123").GetAwaiter().GetResult();
            _userManager.AddToRoleAsync(user, role).GetAwaiter().GetResult();
            return user;
        }

        private static UserService NewUserService(UserManager<User> userManager, ApplicationDbContext db, ICurrentUserService? currentUser)
            => new(userManager, new UnitOfWork(db), currentUser);

        private static ICurrentUserService CurrentUser(int userId, string role)
        {
            var mock = new Mock<ICurrentUserService>();
            mock.SetupGet(c => c.UserId).Returns(userId);
            mock.SetupGet(c => c.Role).Returns(role);
            mock.SetupGet(c => c.DepartmentId).Returns((int?)null);
            mock.SetupGet(c => c.IsAdmin).Returns(role == "Admin");
            mock.SetupGet(c => c.IsManager).Returns(role == "Manager");
            mock.SetupGet(c => c.IsStaff).Returns(role is "Admin" or "Manager" or "Employee");
            return mock.Object;
        }

        // ── Authentication ─────────────────────────────────────────────

        [Fact]
        public async Task LoginAsync_SuspendedAccount_ThrowsEvenWithCorrectPassword()
        {
            CreateUser("SV901", "Student", "Đình chỉ");

            var ex = await Assert.ThrowsAsync<Exception>(() => _authService.LoginAsync(new LoginRequest
            {
                CardCode = "SV901",
                Password = "OldPass@123"
            }));
            Assert.Contains("ngưng hoạt động", ex.Message);
        }

        [Fact]
        public async Task LoginAsync_ActiveAccount_ReturnsToken()
        {
            CreateUser("SV902", "Student");

            var response = await _authService.LoginAsync(new LoginRequest
            {
                CardCode = "SV902",
                Password = "OldPass@123"
            });

            Assert.False(string.IsNullOrWhiteSpace(response.Token));
        }

        [Fact]
        public async Task LoginAsync_MissingJwtSecret_Throws()
        {
            CreateUser("SV907", "Student");
            var noSecretAuth = new AuthService(
                _userManager,
                new ConfigurationBuilder().Build(),
                new UnitOfWork(_db),
                _email);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => noSecretAuth.LoginAsync(new LoginRequest
            {
                CardCode = "SV907",
                Password = "OldPass@123"
            }));
            Assert.Contains("JwtSettings:Secret", ex.Message);
        }

        [Fact]
        public async Task ForgotPasswordAsync_UnknownIdentifier_ReturnsGenericMessageWithoutEmail()
        {
            var response = await _authService.ForgotPasswordAsync(new ForgotPasswordRequest
            {
                Identifier = "khongtontai@huit.edu.vn"
            });

            Assert.True(response.Success);
            Assert.Contains("Nếu tài khoản của bạn tồn tại", response.Message);
            Assert.Empty(_email.Sent);
        }

        // ── Authorization: phân cấp quyền sửa thông tin ────────────────

        [Fact]
        public async Task UpdateAsync_EmployeeEditingAnotherEmployee_Rejected()
        {
            var caller = CreateUser("NV901", "Employee");
            var target = CreateUser("NV902", "Employee");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Employee"));

            var result = await service.UpdateAsync(target.Id, new UpdateUserDto { FullName = "Đổi Tên" });

            Assert.False(result.Success);
            Assert.Contains("không có quyền", result.Message);
        }

        [Fact]
        public async Task UpdateAsync_EmployeeEditingAdmin_Rejected()
        {
            var caller = CreateUser("NV903", "Employee");
            var target = CreateUser("AD901", "Admin");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Employee"));

            var result = await service.UpdateAsync(target.Id, new UpdateUserDto { FullName = "Đổi Tên" });

            Assert.False(result.Success);
        }

        [Fact]
        public async Task UpdateAsync_ManagerEditingEmployee_Rejected()
        {
            var caller = CreateUser("MG901", "Manager");
            var target = CreateUser("NV907", "Employee");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Manager"));

            var result = await service.UpdateAsync(target.Id, new UpdateUserDto { FullName = "Đổi Tên" });

            Assert.False(result.Success);
        }

        [Fact]
        public async Task UpdateAsync_EmployeeEditingStudent_Allowed()
        {
            var caller = CreateUser("NV904", "Employee");
            var target = CreateUser("SV903", "Student");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Employee"));

            var result = await service.UpdateAsync(target.Id, new UpdateUserDto { FullName = "Tên Sinh Viên Mới" });

            Assert.True(result.Success, result.Message);
        }

        [Fact]
        public async Task UpdateAsync_AdminEditingEmployee_Allowed()
        {
            var caller = CreateUser("AD902", "Admin");
            var target = CreateUser("NV905", "Employee");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Admin"));

            var result = await service.UpdateAsync(target.Id, new UpdateUserDto { FullName = "Nhân Viên Đã Sửa" });

            Assert.True(result.Success, result.Message);
        }

        [Fact]
        public async Task UpdateAsync_WithoutCallerContext_FailsClosed()
        {
            var target = CreateUser("SV904", "Student");
            var service = NewUserService(_userManager, _db, null);

            var result = await service.UpdateAsync(target.Id, new UpdateUserDto { FullName = "X" });

            Assert.False(result.Success);
            Assert.Contains("Không xác định được người thực hiện", result.Message);
        }

        // ── AdminResetPassword ─────────────────────────────────────────

        [Fact]
        public async Task AdminResetPasswordAsync_EmptyPassword_Rejected()
        {
            var caller = CreateUser("AD903", "Admin");
            var target = CreateUser("SV905", "Student");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Admin"));

            var result = await service.AdminResetPasswordAsync(target.Id, "  ");

            Assert.False(result.Success);
            Assert.Contains("Vui lòng nhập mật khẩu mới", result.Message);
        }

        [Fact]
        public async Task AdminResetPasswordAsync_EmployeeResettingAdmin_Rejected()
        {
            var caller = CreateUser("NV906", "Employee");
            var target = CreateUser("AD904", "Admin");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Employee"));

            var result = await service.AdminResetPasswordAsync(target.Id, "NewPass@123");

            Assert.False(result.Success);
            Assert.Contains("không có quyền đặt lại mật khẩu", result.Message);

            var admin = await _userManager.FindByIdAsync(target.Id.ToString());
            Assert.True(await _userManager.CheckPasswordAsync(admin!, "OldPass@123"));
        }

        [Fact]
        public async Task AdminResetPasswordAsync_AdminResettingStudent_ChangesPasswordAndNeverReturnsIt()
        {
            var caller = CreateUser("AD905", "Admin");
            var target = CreateUser("SV906", "Student");
            var service = NewUserService(_userManager, _db, CurrentUser(caller.Id, "Admin"));

            var result = await service.AdminResetPasswordAsync(target.Id, "NewPass@789");

            Assert.True(result.Success, result.Message);
            var user = await _userManager.FindByIdAsync(target.Id.ToString());
            Assert.True(await _userManager.CheckPasswordAsync(user!, "NewPass@789"));
            Assert.DoesNotContain("NewPass@789", result.Message);
        }
    }
}
