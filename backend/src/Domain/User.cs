using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities
{
    /// <summary>
    /// Đại diện cho người dùng hệ thống (Sinh viên, Giảng viên, v.v.).
    /// </summary>
    [Table("Users")]
    public class User : IdentityUser<int>
    {

        [Required]
        [StringLength(50)]
        public string CardCode { get; set; } // Mã thẻ (VD: MSSV)

        [Required]
        [StringLength(255)]
        public string FullName { get; set; }

        public string Status { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey("Department")]
        public int? DepartmentId { get; set; }
        public virtual Department Department { get; set; }

        // Navigation properties
        public virtual Employee EmployeeProfile { get; set; }
        public virtual ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
        public virtual ICollection<ChatConversation> ChatConversations { get; set; } = new List<ChatConversation>();
        public virtual ICollection<UserRestriction> UserRestrictions { get; set; } = new List<UserRestriction>();
        public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public virtual ICollection<UsageSession> UsageSessions { get; set; } = new List<UsageSession>();
        public virtual ICollection<ViolationRecord> ViolationRecords { get; set; } = new List<ViolationRecord>();
        public virtual ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }
}
