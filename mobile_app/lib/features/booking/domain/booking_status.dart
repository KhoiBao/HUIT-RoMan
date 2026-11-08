enum BookingStatus {
  pending,
  pendingSecondApproval,
  approved,
  partiallyApproved,
  rejected,
  cancelled,
  inUse,
  completed,
  unknown;

  static BookingStatus fromApi(String? raw) {
    final v = (raw ?? '').trim().toLowerCase();
    if (v.isEmpty) return BookingStatus.unknown;
    if (v.contains('cấp 2')) return BookingStatus.pendingSecondApproval;
    if (v.contains('một phần') || v.contains('partial')) {
      return BookingStatus.partiallyApproved;
    }
    if (v.contains('chờ') || v == 'pending') return BookingStatus.pending;
    if (v.contains('đã duyệt') || v == 'approved') return BookingStatus.approved;
    if (v.contains('từ chối') || v == 'rejected') return BookingStatus.rejected;
    if (v.contains('đã hủy') ||
        v.contains('hủy') ||
        v == 'cancelled' ||
        v == 'canceled') {
      return BookingStatus.cancelled;
    }
    if (v.contains('đang sử dụng') || v == 'inuse' || v == 'in use') {
      return BookingStatus.inUse;
    }
    if (v.contains('hoàn thành') || v == 'completed') {
      return BookingStatus.completed;
    }
    return BookingStatus.unknown;
  }

  String get label => switch (this) {
        BookingStatus.pending => 'Chờ duyệt',
        BookingStatus.pendingSecondApproval => 'Chờ duyệt cấp 2',
        BookingStatus.approved => 'Đã duyệt',
        BookingStatus.partiallyApproved => 'Duyệt một phần',
        BookingStatus.rejected => 'Từ chối',
        BookingStatus.cancelled => 'Đã hủy',
        BookingStatus.inUse => 'Đang sử dụng',
        BookingStatus.completed => 'Hoàn thành',
        BookingStatus.unknown => 'Không xác định',
      };

  bool get isApproved =>
      this == BookingStatus.approved || this == BookingStatus.partiallyApproved;

  bool get isAwaitingDecision =>
      this == BookingStatus.pending ||
      this == BookingStatus.pendingSecondApproval;

  bool get isClosed =>
      this == BookingStatus.rejected ||
      this == BookingStatus.cancelled ||
      this == BookingStatus.completed;
}
