using System;

namespace HUIT_RoMan.Application.Modules.Identity.DTOs
{
    public class UserDto
    {
        public int Id { get; set; }
        public string CardCode { get; set; }
        public string FullName { get; set; }
        public string Status { get; set; }
        public int? DepartmentId { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
    }

    public class EmployeeDto
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Position { get; set; }
        public DateTime? HireDate { get; set; }
        public string Status { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; }
        public int? DepartmentId { get; set; }
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
