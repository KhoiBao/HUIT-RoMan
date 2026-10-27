using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Đơn đặt phòng tổng thể.
    /// </summary>
    [Table("Bookings")]
    public class Booking : Common.BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [StringLength(255)]
        public string ActivityName { get; set; } // Tên hoạt động

        public string Purpose { get; set; } // Mục đích mượn
        
        public int GuestCount { get; set; } // Số lượng khách dự kiến

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        
        public string Status { get; set; } // Trạng thái đơn (Chờ duyệt, Đã duyệt, Đã hủy,...)
        
        public string RejectionReason { get; set; }
        
        public string Note { get; set; }

        // ── Nhận phòng (Check-in) ─────────────────────────────────────
        /// <summary>Thời điểm sinh viên nhận phòng (UTC). NULL = chưa nhận phòng.</summary>
        public DateTime? CheckedInAt { get; set; }

        // ── Lý do hủy đơn (không dùng chung với RejectionReason) ──────
        /// <summary>Mã lý do hủy: CHANGE_PLAN | NO_LONGER_NEEDED | OTHER | NO_SHOW. NULL = đơn cũ chưa có dữ liệu.</summary>
        [StringLength(50)]
        public string? CancelReason { get; set; }

        /// <summary>Nội dung bổ sung khi CancelReason = OTHER. NULL nếu không phải OTHER.</summary>
        [StringLength(1000)]
        public string? CancelReasonDetail { get; set; }

        /// <summary>Nguồn hủy: STUDENT (sinh viên tự hủy) | AUTO (tự động hết hạn không nhận phòng) | STAFF (quản trị/nhân sự).</summary>
        [StringLength(20)]
        public string? CancelSource { get; set; }


        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual User User { get; set; }

        // Navigation properties
        public virtual ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
    }
}
