using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities;

/// <summary>
/// Cấu hình hệ thống dạng khoá/giá trị. Mỗi thay đổi đều lưu người thực hiện
/// để truy vết ai đã bật/tắt một chế độ toàn hệ thống.
/// </summary>
[Table("SystemSettings")]
public class SystemSetting
{
    [Key]
    [StringLength(100)]
    public string Key { get; set; }

    [StringLength(255)]
    public string Value { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UpdatedByUser))]
    public int? UpdatedByUserId { get; set; }
    public virtual User UpdatedByUser { get; set; }
}
