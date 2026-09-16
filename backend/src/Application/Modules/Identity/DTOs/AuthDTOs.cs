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
    }
}
