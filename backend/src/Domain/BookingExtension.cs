using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HUIT_RoMan.Domain.Entities;

/// <summary>
/// Immutable audit record for one successful room-extension transaction.
/// BookingDetail keeps the currently effective end time; this entity preserves every change.
/// </summary>
[Table("BookingExtensions")]
public class BookingExtension : Common.BaseEntity
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(BookingDetail))]
    public int BookingDetailId { get; set; }
    public virtual BookingDetail BookingDetail { get; set; } = null!;

    [ForeignKey(nameof(UsageSession))]
    public int UsageSessionId { get; set; }
    public virtual UsageSession UsageSession { get; set; } = null!;

    public DateTime PreviousEndAt { get; set; }
    public DateTime NewEndAt { get; set; }
    public int? PreviousEndPeriodId { get; set; }
    public int? NewEndPeriodId { get; set; }

    [Required, StringLength(30)]
    public string Status { get; set; } = "Đã áp dụng";

    [StringLength(2000)]
    public string? Note { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(RequestedByUser))]
    public int RequestedByUserId { get; set; }
    public virtual User RequestedByUser { get; set; } = null!;
}
