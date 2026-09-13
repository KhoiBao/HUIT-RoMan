namespace HUIT_RoMan.Domain.Common;

// Base cho soft-delete theo Developing_rules: không hard-delete, chỉ set IsDeleted = true.
public abstract class BaseEntity
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
