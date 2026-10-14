namespace HUIT_RoMan.Domain.Common;

// Đánh dấu entity áp dụng xóa mềm (Developing_rules: cấm hard-delete).
// Mọi query EF tự loại bản ghi IsDeleted qua global filter trong ApplicationDbContext.
public interface ISoftDelete
{
    bool IsDeleted { get; set; }
    DateTime? UpdatedAt { get; set; }
}
