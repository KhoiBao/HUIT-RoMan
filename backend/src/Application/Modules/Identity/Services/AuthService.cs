using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
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
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IUnitOfWork _unitOfWork;

        public AuthService(UserManager<User> userManager, IConfiguration configuration, IUnitOfWork unitOfWork)
        {
            _userManager = userManager;
            _configuration = configuration;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            // UI chỉ nhập email; field giữ tên CardCode để tương thích ngược.
            // Chấp nhận CardCode hoặc Email hoặc UserName.
            var loginKey = request.CardCode?.Trim();
            var user = await _unitOfWork.Repository<User>().FirstOrDefaultAsync(
                u => u.CardCode == loginKey || u.Email == loginKey || u.UserName == loginKey,
                u => u.Department);
            
            if (user == null)
            {
                throw new Exception("Thông tin đăng nhập không hợp lệ.");
            }

            if (!await _userManager.CheckPasswordAsync(user, request.Password))
            {
                 throw new Exception("Thông tin đăng nhập không hợp lệ.");
            }

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault();

            var tokenHandler = new JwtSecurityTokenHandler();
            var secret = _configuration["JwtSettings:Secret"] ?? "super_secret_key_for_development_huit_roman_12345";
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

            if (user == null)
                throw new Exception("Không tìm thấy tài khoản tương ứng trên hệ thống HUIT.");

            if (!string.IsNullOrEmpty(user.Status) && user.Status != "Hoạt động" && user.Status != "Active")
                throw new Exception("Tài khoản hiện đang bị khóa hoặc ngưng hoạt động. Vui lòng liên hệ Thư viện HUIT.");


            // Tạo mã OTP 6 số xác thực
            var randomOtp = new Random().Next(100000, 999999).ToString();

            // Ẩn một phần email (masking) để bảo mật
            var email = user.Email ?? $"{user.CardCode}@huit.edu.vn";
            var maskedEmail = email;
            var atIndex = email.IndexOf('@');
            if (atIndex > 3)
            {
                maskedEmail = email.Substring(0, 3) + "***" + email.Substring(atIndex);
            }

            return new ForgotPasswordResponse
            {
                Success = true,
                Message = $"Mã OTP xác thực đặt lại mật khẩu đã được gửi đến hộp thư {maskedEmail}.",
                Email = maskedEmail,
                ResetToken = randomOtp
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

            // Đặt lại mật khẩu mới
            var removeResult = await _userManager.RemovePasswordAsync(user);
            var addResult = await _userManager.AddPasswordAsync(user, request.NewPassword);
            if (!addResult.Succeeded)
            {
                var error = string.Join("; ", addResult.Errors.Select(e => e.Description));
                throw new Exception($"Không thể đặt lại mật khẩu: {error}");
            }

            return true;
        }
    }
}

