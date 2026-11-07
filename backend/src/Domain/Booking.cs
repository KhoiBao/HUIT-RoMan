using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    //Đơn đặt phòng tổng thể.
    [Table("Bookings")]
    public class Booking : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [StringLength(255)]
        public string ActivityName { get; set; } = string.Empty; // Tên hoạt động

        public string Purpose { get; set; } = string.Empty; // Mục đích mượn
        
        public int GuestCount { get; set; } // Số lượng khách dự kiến

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        
        public string Status { get; set; } = string.Empty; // Trạng thái đơn (Chờ duyệt, Đã duyệt, Đã hủy,...)
        
        public string RejectionReason { get; set; } = string.Empty;
        
        public string Note { get; set; } = string.Empty;

        // Nhận phòng (Check-in)
        //Thời điểm sinh viên nhận phòng (UTC). NULL = chưa nhận phòng.
        public DateTime? CheckedInAt { get; set; }

        // Lý do hủy đơn 
        [StringLength(50)]
        public string? CancelReason { get; set; }

        // Nội dung bổ sung khi CancelReason = OTHER. NULL nếu không phải OTHER.</summary>
        [StringLength(1000)]
        public string? CancelReasonDetail { get; set; }

        // Nguồn hủy: STUDENT (sinh viên tự hủy) | AUTO (tự động hết hạn không nhận phòng) | STAFF (quản trị/nhân sự)
        [StringLength(20)]
        public string? CancelSource { get; set; }

        // Người quyết định đơn
        public int? ApprovedByUserId { get; set; }

        [ForeignKey(nameof(ApprovedByUserId))]
        public virtual User? ApprovedByUser { get; set; }

        public DateTime? ApprovedAt { get; set; }

        // MANUAL (người thật duyệt) | AUTO (chế độ tự động duyệt)
        [StringLength(10)]
        public string? ApprovalMode { get; set; }

        // Mã định danh yêu cầu chống gửi trùng (header X-Idempotency-Key). NULL = client không gửi.
        [StringLength(64)]
        public string? IdempotencyKey { get; set; }


        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }

        // Navigation properties
        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
    }
}
