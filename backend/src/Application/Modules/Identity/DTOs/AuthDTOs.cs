using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Identity.DTOs
{
    public class LoginRequest
    {
        [Required]
        public string CardCode { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public UserInfoDto User { get; set; }
    }

    public class UserInfoDto
    {
        public int Id { get; set; }
        public string CardCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequest
    {
        [Required]
        public string Identifier { get; set; } = string.Empty; // CardCode or Email
    }

    public class ForgotPasswordResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        [Required]
        public string Identifier { get; set; } = string.Empty;

        [Required]
        public string ResetToken { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ChangePasswordRequest
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }
}

