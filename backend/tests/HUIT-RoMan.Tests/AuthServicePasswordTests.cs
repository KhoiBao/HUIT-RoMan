using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
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
using Xunit;

namespace HUIT_RoMan.Tests
{
    public class FakeRecordingEmailService : IEmailService
    {
        public List<(string To, string Subject, string Body)> Sent = new();

        public Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
        {
            Sent.Add((toEmail, subject, htmlBody));
            return Task.FromResult(true);
        }

        public Task<bool> SendBookingApprovalEmailAsync(string toEmail, string recipientName, int bookingId,
            string activityName, string decision, string? reason = null, string? roomSummary = null,
            DateTime? startAt = null, DateTime? endAt = null, string? checkInCode = null,
            CancellationToken cancellationToken = default)
            => Task.FromResult(true);

        public Task<bool> SendViolationNotificationEmailAsync(string toEmail, string recipientName,
            string violationCode, string violationTypeName, string description, string severityText,
            string penaltyApplied, string? roomName = null, DateTime? incidentTimeUtc = null,
            bool autoRecorded = false, CancellationToken cancellationToken = default)
            => Task.FromResult(true);
    }

    public class AuthServicePasswordTests : IDisposable
    {
        private readonly SqliteTestBed _bed;
        private readonly ApplicationDbContext _db;
        private readonly UserManager<User> _userManager;
        private readonly FakeRecordingEmailService _email = new();
        private readonly AuthService _service;

        public AuthServicePasswordTests()
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

            _service = new AuthService(
                _userManager,
                new ConfigurationBuilder().Build(),
                new UnitOfWork(_db),
                _email);

            _userManager.CreateAsync(new User
            {
                UserName = "SV900",
                CardCode = "SV900",
                Email = "sv900@huit.edu.vn",
                FullName = "Sinh Viên Kiểm Thử",
                Status = "Hoạt động"
            }, "OldPass@123").GetAwaiter().GetResult();
        }

        public void Dispose()
        {
            _db.Dispose();
            _bed.Dispose();
        }

        private static string ExtractOtp(string body)
        {
            var match = Regex.Match(body, @"\b(\d{6})\b");
            Assert.True(match.Success, "Email OTP phải chứa mã 6 chữ số.");
            return match.Groups[1].Value;
        }

        private ForgotPasswordResponse RequestOtp()
        {
            var response = _service.ForgotPasswordAsync(new ForgotPasswordRequest
            {
                Identifier = "sv900@huit.edu.vn"
            }).GetAwaiter().GetResult();
            return response;
        }

        [Fact]
        public async Task ForgotPasswordAsync_SendsOtpByEmail_StoresHashAndExpiry_DoesNotReturnToken()
        {
            var response = RequestOtp();

            Assert.True(response.Success, response.Message);

            var email = Assert.Single(_email.Sent);
            Assert.Equal("sv900@huit.edu.vn", email.To);
            var otp = ExtractOtp(email.Body);

            var saved = await _userManager.FindByNameAsync("SV900");
            Assert.NotNull(saved);
            Assert.False(string.IsNullOrWhiteSpace(saved!.OtpHash));
            Assert.NotEqual(otp, saved.OtpHash);
            Assert.NotNull(saved.OtpExpiresAt);
            var minutesLeft = (saved.OtpExpiresAt!.Value - DateTime.UtcNow).TotalMinutes;
            Assert.InRange(minutesLeft, 9, 11);
            Assert.Equal(0, saved.OtpFailedAttempts);
        }

        [Fact]
        public async Task ResetPasswordAsync_WithCorrectOtp_ChangesPasswordAndClearsOtp()
        {
            var response = RequestOtp();
            var otp = ExtractOtp(_email.Sent.Single().Body);

            var result = await _service.ResetPasswordAsync(new ResetPasswordRequest
            {
                Identifier = "SV900",
                ResetToken = otp,
                NewPassword = "NewPass@456"
            });

            Assert.True(result);
            var user = await _userManager.FindByNameAsync("SV900");
            Assert.True(await _userManager.CheckPasswordAsync(user!, "NewPass@456"));
            Assert.False(await _userManager.CheckPasswordAsync(user!, "OldPass@123"));
            Assert.True(string.IsNullOrWhiteSpace(user!.OtpHash));
            Assert.Null(user.OtpExpiresAt);
        }

        [Fact]
        public async Task ResetPasswordAsync_WithWrongOtp_RejectsAndKeepsOldPassword()
        {
            RequestOtp();

            await Assert.ThrowsAsync<Exception>(() => _service.ResetPasswordAsync(new ResetPasswordRequest
            {
                Identifier = "SV900",
                ResetToken = "000000",
                NewPassword = "NewPass@456"
            }));

            var user = await _userManager.FindByNameAsync("SV900");
            Assert.True(await _userManager.CheckPasswordAsync(user!, "OldPass@123"));
            Assert.Equal(1, user!.OtpFailedAttempts);
        }

        [Fact]
        public async Task ResetPasswordAsync_WithExpiredOtp_Rejects()
        {
            RequestOtp();
            var user = await _userManager.FindByNameAsync("SV900");
            user!.OtpExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await _db.SaveChangesAsync();

            await Assert.ThrowsAsync<Exception>(() => _service.ResetPasswordAsync(new ResetPasswordRequest
            {
                Identifier = "SV900",
                ResetToken = "000000",
                NewPassword = "NewPass@456"
            }));
        }

        [Fact]
        public async Task ResetPasswordAsync_AfterFiveWrongAttempts_LocksUntilNewOtpRequested()
        {
            RequestOtp();
            var otp = ExtractOtp(_email.Sent.Single().Body);

            for (var i = 0; i < 5; i++)
            {
                await Assert.ThrowsAsync<Exception>(() => _service.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Identifier = "SV900",
                    ResetToken = "000000",
                    NewPassword = "NewPass@456"
                }));
            }

            await Assert.ThrowsAsync<Exception>(() => _service.ResetPasswordAsync(new ResetPasswordRequest
            {
                Identifier = "SV900",
                ResetToken = otp,
                NewPassword = "NewPass@456"
            }));

            RequestOtp();
            var newOtp = ExtractOtp(_email.Sent.Last().Body);
            var result = await _service.ResetPasswordAsync(new ResetPasswordRequest
            {
                Identifier = "SV900",
                ResetToken = newOtp,
                NewPassword = "NewPass@456"
            });
            Assert.True(result);
        }

        [Fact]
        public async Task ChangePasswordAsync_WithWrongCurrentPassword_Throws()
        {
            await Assert.ThrowsAsync<Exception>(() => _service.ChangePasswordAsync(1, new ChangePasswordRequest
            {
                CurrentPassword = "Wrong@123",
                NewPassword = "NewPass@456"
            }));

            var user = await _userManager.FindByNameAsync("SV900");
            Assert.True(await _userManager.CheckPasswordAsync(user!, "OldPass@123"));
        }

        [Fact]
        public async Task ChangePasswordAsync_WithCorrectCurrentPassword_ChangesPassword()
        {
            var result = await _service.ChangePasswordAsync(1, new ChangePasswordRequest
            {
                CurrentPassword = "OldPass@123",
                NewPassword = "NewPass@456"
            });

            Assert.True(result);
            var user = await _userManager.FindByNameAsync("SV900");
            Assert.True(await _userManager.CheckPasswordAsync(user!, "NewPass@456"));
        }
    }
}
