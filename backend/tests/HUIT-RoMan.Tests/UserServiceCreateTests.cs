using System;
using System.Linq;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Application.Modules.Identity.Services;
using HUIT_RoMan.Domain.Entities;
using HUIT_RoMan.Infrastructure.Persistence;
using HUIT_RoMan.Infrastructure.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace HUIT_RoMan.Tests
{
    public class UserServiceCreateTests : IDisposable
    {
        private readonly SqliteTestBed _bed;
        private readonly ApplicationDbContext _db;
        private readonly UserManager<User> _userManager;
        private readonly UserService _service;

        public UserServiceCreateTests()
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

            _service = new UserService(_userManager, new UnitOfWork(_db));
        }

        public void Dispose()
        {
            _db.Dispose();
            _bed.Dispose();
        }

        private static CreateUserDto NewStudent(string cardCode = "SV900") => new()
        {
            CardCode = cardCode,
            FullName = "Sinh Viên Mới",
            Email = $"{cardCode.ToLowerInvariant()}@huit.edu.vn",
            Role = "Student"
        };

        [Fact]
        public async Task CreateAsync_Student_UsesDefaultPasswordAndAssignsRole()
        {
            var result = await _service.CreateAsync(NewStudent());

            Assert.True(result.Success, result.Message);
            Assert.Equal("Huit@123", result.Data!.Password);
            Assert.Equal("Student", result.Data.User.Role);

            var saved = await _userManager.FindByNameAsync("SV900");
            Assert.NotNull(saved);
            Assert.Equal("SV900", saved!.CardCode);
            Assert.Equal("Hoạt động", saved.Status);
            Assert.True(await _userManager.CheckPasswordAsync(saved, "Huit@123"));
            Assert.Contains("Student", await _userManager.GetRolesAsync(saved));
        }

        [Fact]
        public async Task CreateAsync_DuplicateCardCode_ReturnsError()
        {
            await _service.CreateAsync(NewStudent("SV901"));

            var result = await _service.CreateAsync(NewStudent("SV901"));

            Assert.False(result.Success);
            Assert.Contains("đã tồn tại", result.Message);
        }

        [Fact]
        public async Task CreateAsync_DuplicateEmail_ReturnsError()
        {
            await _service.CreateAsync(NewStudent("SV902"));

            var duplicate = NewStudent("SV903");
            duplicate.Email = "sv902@huit.edu.vn";

            var result = await _service.CreateAsync(duplicate);

            Assert.False(result.Success);
            Assert.Contains("Email", result.Message);
        }

        [Fact]
        public async Task CreateAsync_InvalidRole_ReturnsError()
        {
            var request = NewStudent("SV904");
            request.Role = "SuperUser";

            var result = await _service.CreateAsync(request);

            Assert.False(result.Success);
            Assert.Contains("Vai trò không hợp lệ", result.Message);
        }

        [Fact]
        public async Task CreateAsync_InvalidPhone_ReturnsError()
        {
            var request = NewStudent("SV905");
            request.PhoneNumber = "abcdef";

            var result = await _service.CreateAsync(request);

            Assert.False(result.Success);
            Assert.Contains("Số điện thoại", result.Message);
        }

        [Fact]
        public async Task CreateAsync_Manager_CreatesEmployeeProfile()
        {
            var request = new CreateUserDto
            {
                CardCode = "NV900",
                FullName = "Quản Lý Mới",
                Email = "nv900@huit.edu.vn",
                Role = "Manager"
            };

            var result = await _service.CreateAsync(request);

            Assert.True(result.Success, result.Message);

            var employee = _db.Employees.Single(e => e.Code == "NV900");
            Assert.Equal("Quản lý đơn vị", employee.Position);
            Assert.Equal("Hoạt động", employee.Status);
        }

        [Fact]
        public async Task CreateAsync_Student_DoesNotCreateEmployeeProfile()
        {
            var created = await _service.CreateAsync(NewStudent("SV906"));
            Assert.True(created.Success, created.Message);

            Assert.DoesNotContain(_db.Employees, e => e.UserId == created.Data!.User.Id);
        }
    }
}
