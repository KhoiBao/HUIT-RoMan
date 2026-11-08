using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Identity.DTOs
{
    
    // user
    public class UserDto
    {
        public int Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string CardCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsEmployee { get; set; }
    }

    public class UpdateUserDto
    {
        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string? FullName { get; set; }

        [System.ComponentModel.DataAnnotations.EmailAddress]
        [System.ComponentModel.DataAnnotations.MaxLength(255)]
        public string? Email { get; set; }

        public string? PhoneNumber { get; set; }

        [System.ComponentModel.DataAnnotations.MaxLength(50)]
        public string? Status { get; set; }

        public int? DepartmentId { get; set; }
    }


    public class ChangeUserRoleDto
    {
        public string Role { get; set; } = string.Empty; // Student | Lecturer | Employee | Admin
    }

    public class AdminResetPasswordDto
    {
        public string? NewPassword { get; set; }
    }

    public class CreateUserDto
    {
        public string CardCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = string.Empty; // Student | Lecturer | Employee | Manager | Admin
        public int? DepartmentId { get; set; }
        public string? Password { get; set; }
    }

    public class CreatedUserDto
    {
        public UserDto User { get; set; }
        public string Password { get; set; } = string.Empty;
    }

    // nhan vien

    public class EmployeeDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty; 
        public DateTime? HireDate { get; set; }
        public string Status { get; set; } = string.Empty;
        // User info
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string CardCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public string? Role { get; set; }
    }

    public class CreateEmployeeDto
    {
        public int UserId { get; set; }
        public string Position { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string? Role { get; set; }
    }

    public class UpdateEmployeeDto
    {
        public string Position { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string? Role { get; set; }
    }
}
