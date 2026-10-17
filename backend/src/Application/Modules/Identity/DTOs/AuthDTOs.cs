using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Identity.DTOs
{
    public class LoginRequest
    {
        [Required]
        public string CardCode { get; set; }

        [Required]
        public string Password { get; set; }
    }

    public class AuthResponse
    {
        public string Token { get; set; }
        public UserInfoDto User { get; set; }
    }

    public class UserInfoDto
    {
        public int Id { get; set; }
        public string CardCode { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
    }

    public class ForgotPasswordRequest
    {
        [Required]
        public string Identifier { get; set; }
    }

    public class ForgotPasswordResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string Email { get; set; }
        public string ResetToken { get; set; }
    }

    public class ResetPasswordRequest
    {
        [Required]
        public string Identifier { get; set; }

        [Required]
        public string ResetToken { get; set; }

        [Required]
        public string NewPassword { get; set; }
    }
}

