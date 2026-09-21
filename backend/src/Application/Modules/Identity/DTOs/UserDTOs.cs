using System;
using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Identity.DTOs
{
    // ─────────────────────────────────────────────────────────────────
    // USER
    // ─────────────────────────────────────────────────────────────────

    public class UserDto
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        public string CardCode { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Status { get; set; }
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public string Role { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsEmployee { get; set; }
    }

    public class UpdateUserDto
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Status { get; set; }
        public int? DepartmentId { get; set; }
    }

    public class ChangeUserRoleDto
    {
        public string Role { get; set; } // Student | Lecturer | Employee | Admin
    }

    // ─────────────────────────────────────────────────────────────────
    // EMPLOYEE
    // ─────────────────────────────────────────────────────────────────

    public class EmployeeDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Position { get; set; }
        public DateTime? HireDate { get; set; }
        public string Status { get; set; }
        // User info
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string CardCode { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; }
    }

    public class CreateEmployeeDto
    {
        public int UserId { get; set; }
        public string Position { get; set; }
    }

    public class UpdateEmployeeDto
    {
        public string Position { get; set; }
        public string Status { get; set; }
        public int? DepartmentId { get; set; }
    }
}
