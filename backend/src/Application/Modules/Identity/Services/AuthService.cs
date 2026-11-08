using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using HUIT_RoMan.Application.Modules.Identity.DTOs;
using HUIT_RoMan.Application.Common.Interfaces;
using HUIT_RoMan.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace HUIT_RoMan.Application.Modules.Identity.Services
{
    public class AuthService : IAuthService
    {
        private const int OtpMaxAttempts = 5;

        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IEmailService _emailService;

        public AuthService(UserManager<User> userManager, IConfiguration configuration, IUnitOfWork unitOfWork, IEmailService emailService)
        {
            _userManager = userManager;
            _configuration = configuration;
            _unitOfWork = unitOfWork;
            _emailService = emailService;
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {       
            // Chấp nhận mssv.
            var loginKey = request.CardCode?.Trim();
            var user = await _unitOfWork.Repository<User>().FirstOrDefaultAsync(
                u => u.CardCode == loginKey,
                u => u.Department);
            
            if (user == null)
            {
                throw new Exception("Thông tin đăng nhập không hợp lệ.");
            }

            if (!await _userManager.CheckPasswordAsync(user, request.Password))
            {
                 throw new Exception("Thông tin đăng nhập không hợp lệ.");
            }

            // Kiểm tra sau khi xác thực mật khẩu để không lộ trạng thái tài khoản cho người lạ.
            if (!string.Equals(user.Status, "Hoạt động", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                throw new Exception("Tài khoản đã bị khóa hoặc ngưng hoạt động. Vui lòng liên hệ Thư viện HUIT.");
            }

            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow)
            {
                throw new Exception("Tài khoản đã bị khóa. Vui lòng liên hệ Thư viện HUIT.");
            }

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault();

            var tokenHandler = new JwtSecurityTokenHandler();
            var secret = _configuration["JwtSettings:Secret"];
            if (string.IsNullOrWhiteSpace(secret))
            {
                throw new InvalidOperationException(
                    "Chưa cấu hình JwtSettings:Secret (đặt qua biến môi trường JwtSettings__Secret trong file .env).");
            }
            var key = Encoding.ASCII.GetBytes(secret);
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName ?? user.UserName ?? user.CardCode),
                new Claim("CardCode", user.CardCode)
            };

            if (!string.IsNullOrEmpty(role))
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            if (user.DepartmentId.HasValue)
            {
                claims.Add(new Claim("DepartmentId", user.DepartmentId.Value.ToString()));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = _configuration["JwtSettings:Issuer"],
                Audience = _configuration["JwtSettings:Audience"]
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return new AuthResponse
            {
                Token = tokenHandler.WriteToken(token),
                User = new UserInfoDto
                {
                    Id = user.Id,
                    CardCode = user.CardCode,
                    FullName = user.FullName,
                    Role = role,
                    DepartmentId = user.DepartmentId,
                    DepartmentName = user.Department?.Name
                }
            };
        }

        public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var key = request.Identifier?.Trim();
            if (string.IsNullOrEmpty(key))
                throw new Exception("Vui lòng nhập MSSV, Mã cán bộ hoặc Email HUIT.");

            var user = await _unitOfWork.Repository<User>().FirstOrDefaultAsync(u =>
                u.CardCode == key || u.Email == key || u.UserName == key);

            // Trả về thông điệp thống nhất để không lộ tài khoản nào tồn tại / bị khóa.
            var genericMessage =
                "Nếu tài khoản của bạn tồn tại và đang hoạt động, mã OTP đặt lại mật khẩu đã được gửi tới email liên kết. " +
                "Mã có hiệu lực trong 10 phút. Vui lòng kiểm tra cả thư mục Spam.";

            if (user == null || user.IsDeleted ||
                (!string.Equals(user.Status, "Hoạt động", StringComparison.OrdinalIgnoreCase) &&
                 !string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase)))
            {
                return new ForgotPasswordResponse { Success = true, Message = genericMessage };
            }

            // Tạo mã OTP 6 số bằng CSPRNG, chỉ lưu hash và gửi qua email
            var randomOtp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

            user.OtpHash = HashOtp(randomOtp);
            user.OtpExpiresAt = DateTime.UtcNow.AddMinutes(10);
            user.OtpFailedAttempts = 0;
            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.SaveChangesAsync();

            var email = user.Email ?? $"{user.CardCode}@huit.edu.vn";
            var maskedEmail = email;
            var atIndex = email.IndexOf('@');
            if (atIndex > 3)
            {
                maskedEmail = email.Substring(0, 3) + "***" + email.Substring(atIndex);
            }

            if (string.IsNullOrWhiteSpace(user.Email))
            {
                // Không có email liên kết nên không gửi được OTP; trả thông điệp chung để không lộ thông tin.
                return new ForgotPasswordResponse { Success = true, Message = genericMessage };
            }

            var htmlBody = $@"
<div style=""font-family:Arial,sans-serif;max-width:520px;margin:0 auto"">
  <h2 style=""color:#1a365d"">Yêu cầu đặt lại mật khẩu</h2>
  <p>Xin chào <b>{System.Net.WebUtility.HtmlEncode(user.FullName)}</b>,</p>
  <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản <b>{System.Net.WebUtility.HtmlEncode(user.CardCode)}</b> trên Hệ thống quản lý phòng họp thư viện HUIT.</p>
  <p style=""font-size:15px"">Mã OTP của bạn (hiệu lực <b>10 phút</b>):</p>
  <p style=""font-size:30px;font-weight:bold;letter-spacing:6px;color:#1a365d;margin:16px 0"">{randomOtp}</p>
  <p style=""color:#718096;font-size:13px"">Nếu bạn không yêu cầu, hãy bỏ qua email này. Không chia sẻ mã OTP cho bất kỳ ai, kể cả nhân viên hỗ trợ.</p>
</div>";
            await _emailService.SendEmailAsync(user.Email, "Hệ thống quản lý phòng họp thư viện HUIT — Mã OTP đặt lại mật khẩu", htmlBody);

            return new ForgotPasswordResponse
            {
                Success = true,
                Message = $"Mã OTP xác thực đặt lại mật khẩu đã được gửi đến hộp thư {maskedEmail}. Mã có hiệu lực trong 10 phút.",
                Email = maskedEmail
            };
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var key = request.Identifier?.Trim();
            if (string.IsNullOrEmpty(key))
                throw new Exception("Vui lòng cung cấp thông tin tài khoản.");

            if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length < 6)
                throw new Exception("Mật khẩu mới phải có ít nhất 6 ký tự.");

            if (string.IsNullOrEmpty(request.ResetToken))
                throw new Exception("Vui lòng nhập mã OTP xác thực.");

            var user = await _unitOfWork.Repository<User>().FirstOrDefaultAsync(u =>
                u.CardCode == key || u.Email == key || u.UserName == key);

            if (user == null)
                throw new Exception("Không tìm thấy tài khoản.");

            if (string.IsNullOrWhiteSpace(user.OtpHash) || user.OtpExpiresAt == null)
                throw new Exception("Bạn chưa yêu cầu mã OTP. Vui lòng thực hiện bước quên mật khẩu trước.");

            if (user.OtpExpiresAt < DateTime.UtcNow)
                throw new Exception("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới và thử lại.");

            if (user.OtpFailedAttempts >= OtpMaxAttempts)
                throw new Exception("Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng yêu cầu mã mới để tiếp tục.");

            if (HashOtp(request.ResetToken.Trim()) != user.OtpHash)
            {
                user.OtpFailedAttempts++;
                _unitOfWork.Repository<User>().Update(user);
                await _unitOfWork.SaveChangesAsync();
                throw new Exception($"Mã OTP không đúng. Bạn còn {OtpMaxAttempts - user.OtpFailedAttempts} lần thử.");
            }

            var removeResult = await _userManager.RemovePasswordAsync(user);
            if (!removeResult.Succeeded)
            {
                var error = string.Join("; ", removeResult.Errors.Select(e => e.Description));
                throw new Exception($"Không thể đặt lại mật khẩu: {error}");
            }

            var addResult = await _userManager.AddPasswordAsync(user, request.NewPassword);
            if (!addResult.Succeeded)
            {
                var error = string.Join("; ", addResult.Errors.Select(e => e.Description));
                throw new Exception($"Không thể đặt lại mật khẩu: {error}");
            }

            user.OtpHash = null;
            user.OtpExpiresAt = null;
            user.OtpFailedAttempts = 0;
            _unitOfWork.Repository<User>().Update(user);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                throw new Exception("Không tìm thấy tài khoản.");

            if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length < 6)
                throw new Exception("Mật khẩu mới phải có ít nhất 6 ký tự.");

            var currentValid = await _userManager.CheckPasswordAsync(user, request.CurrentPassword ?? string.Empty);
            if (!currentValid)
                throw new Exception("Mật khẩu hiện tại không đúng.");

            var removeResult = await _userManager.RemovePasswordAsync(user);
            if (!removeResult.Succeeded)
            {
                var error = string.Join("; ", removeResult.Errors.Select(e => e.Description));
                throw new Exception($"Không thể đổi mật khẩu: {error}");
            }

            var addResult = await _userManager.AddPasswordAsync(user, request.NewPassword);
            if (!addResult.Succeeded)
            {
                var error = string.Join("; ", addResult.Errors.Select(e => e.Description));
                throw new Exception($"Không thể đổi mật khẩu: {error}");
            }

            return true;
        }

        private static string HashOtp(string otp)
            => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(otp)));
    }
}

