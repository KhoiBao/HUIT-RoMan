using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    // Cấu hình điều kiện sử dụng cho từng loại phòng.
    [Table("RoomTypeConditions")]
    public class RoomTypeCondition : Common.BaseEntity
    {
        [Key, Column(Order = 0)]
        [ForeignKey("RoomType")]
        public int RoomTypeId { get; set; }
        public virtual RoomType RoomType { get; set; }

        [Key, Column(Order = 1)]
        [ForeignKey("UsageCondition")]
        public int UsageConditionId { get; set; }
        public virtual UsageCondition UsageCondition { get; set; }

        public string Value { get; set; } = string.Empty; // Giá trị cấu hình thêm nếu có
        public bool IsRequired { get; set; } // Bắt buộc hay không
    }
}
