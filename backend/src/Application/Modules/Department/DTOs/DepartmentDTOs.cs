using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Department.DTOs
{
    public class DepartmentDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string Status { get; set; }
    }

    public class CreateDepartmentDto
    {
        [Required(ErrorMessage = "Tên đơn vị là bắt buộc")]
        [StringLength(255, ErrorMessage = "Tên đơn vị không được vượt quá 255 ký tự")]
        public string Name { get; set; }

        [StringLength(100)]
        public string Type { get; set; }

        public string Status { get; set; } = "Active";
    }

    public class UpdateDepartmentDto
    {
        [Required(ErrorMessage = "Tên đơn vị là bắt buộc")]
        [StringLength(255, ErrorMessage = "Tên đơn vị không được vượt quá 255 ký tự")]
        public string Name { get; set; }

        [StringLength(100)]
        public string Type { get; set; }

        public string Status { get; set; }
    }
}
