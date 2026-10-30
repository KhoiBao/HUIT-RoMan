using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities;

/// <summary>
/// Khung giờ phục vụ đặt phòng theo từng ngày trong tuần của một cơ sở.
/// Hiện chỉ Thư viện HUIT được cấu hình và áp dụng (phòng học chính quy
/// vẫn đặt theo tiết học cố định).
/// </summary>
[Table("WorkingHours")]
public class WorkingHour : Common.BaseEntity
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Department))]
    public int DepartmentId { get; set; }
    public virtual Department Department { get; set; }

    /// <summary>0 = Chủ Nhật, 1 = Thứ Hai … 6 = Thứ Bảy (System.DayOfWeek).</summary>
    public int DayOfWeek { get; set; }

    public TimeSpan OpenTime { get; set; }
    public TimeSpan CloseTime { get; set; }

    /// <summary>Ngày nghỉ (ví dụ Chủ Nhật) — bỏ qua OpenTime/CloseTime.</summary>
    public bool IsClosed { get; set; }
}
