import 'package:flutter/material.dart';
import 'app_colors.dart';

class StatusTone {
  const StatusTone(this.background, this.foreground);
  final Color background;
  final Color foreground;
}

abstract final class StatusPalette {
  static const pending = StatusTone(Color(0xFFFFF8E1), Color(0xFFB78103));
  static const approved = StatusTone(Color(0xFFE8F5E9), Color(0xFF2E7D32));
  static const partial = StatusTone(Color(0xFFE3F2FD), Color(0xFF1565C0));
  static const rejected = StatusTone(Color(0xFFFFEBEE), Color(0xFFC62828));
  static const cancelled = StatusTone(Color(0xFFF5F5F5), Color(0xFF757575));
  static const inUse = StatusTone(Color(0xFFECFDF5), Color(0xFF059669));
  static const completed = StatusTone(Color(0xFFF0F9FF), Color(0xFF0284C7));
  static const maintenance = StatusTone(Color(0xFFFFF3E0), Color(0xFF8E4302));
  static const neutral = StatusTone(Color(0xFFEEF2F7), AppColors.muted);

  static StatusTone forLabel(String label) {
    final v = label.trim().toLowerCase();
    if (v.contains('chờ duyệt') || v == 'pending') return pending;
    if (v.contains('duyệt một phần') || v.contains('partial')) return partial;
    if (v.contains('đã duyệt') || v == 'approved') return approved;
    if (v.contains('từ chối') || v == 'rejected') return rejected;
    if (v.contains('đã hủy') || v == 'cancelled' || v == 'canceled') return cancelled;
    if (v.contains('đang sử dụng') || v == 'inuse' || v == 'in use') return inUse;
    if (v.contains('hoàn thành') || v == 'completed') return completed;
    if (v.contains('bảo trì') || v == 'maintenance') return maintenance;
    if (v.contains('chờ nhận phòng') || v.contains('notopen')) return pending;
    return neutral;
  }
}
