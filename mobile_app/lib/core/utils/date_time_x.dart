import 'package:intl/intl.dart';

abstract final class DateTimeX {
  static const _vnOffset = Duration(hours: 7);
  static final _dateFmt = DateFormat('yyyy-MM-dd');
  static final _timeFmt = DateFormat('HH:mm');
  static final _dayFmt = DateFormat('dd/MM/yyyy');
  static final _dayTimeFmt = DateFormat('dd/MM/yyyy HH:mm');
  static final _weekdayFmt = DateFormat('EEEE', 'vi');

  /// Shifts a UTC instant onto Vietnam wall-clock fields (kept as UTC kind).
  static DateTime toVietnam(DateTime value) =>
      value.toUtc().add(_vnOffset);

  /// Converts a Vietnam wall-clock time into the UTC instant the API expects.
  static DateTime fromVietnamWallClock(DateTime value) => DateTime.utc(
        value.year,
        value.month,
        value.day,
        value.hour,
        value.minute,
      ).subtract(_vnOffset);

  static DateTime? parseUtc(String? raw) {
    if (raw == null || raw.trim().isEmpty) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return null;
    return parsed.isUtc
        ? parsed
        : DateTime.utc(parsed.year, parsed.month, parsed.day, parsed.hour,
            parsed.minute, parsed.second);
  }

  static String toVietnamDate(DateTime value) => _dateFmt.format(toVietnam(value));
  static String dateOf(DateTime value) => _dateFmt.format(value);
  static String timeOf(DateTime value) => _timeFmt.format(toVietnam(value));
  static String dayOf(DateTime value) => _dayFmt.format(toVietnam(value));
  static String dayTimeOf(DateTime value) => _dayTimeFmt.format(toVietnam(value));
  static String weekdayOf(DateTime value) => _weekdayFmt.format(value);

  static String range(DateTime start, DateTime end) =>
      '${timeOf(start)} – ${timeOf(end)}';

  static bool isTodayVn(DateTime utc) {
    final now = toVietnam(DateTime.now().toUtc());
    final local = toVietnam(utc);
    return now.year == local.year &&
        now.month == local.month &&
        now.day == local.day;
  }

  static String relative(DateTime utc) {
    final diff = utc.difference(DateTime.now().toUtc());
    if (diff.inMinutes.abs() < 1) return 'Vừa xong';
    if (diff.isNegative) {
      final d = -diff;
      if (d.inMinutes < 60) return '${d.inMinutes} phút trước';
      if (d.inHours < 24) return '${d.inHours} giờ trước';
      return '${d.inDays} ngày trước';
    }
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút nữa';
    if (diff.inHours < 24) return '${diff.inHours} giờ nữa';
    return '${diff.inDays} ngày nữa';
  }

  static String durationLabel(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).abs();
    if (h <= 0) return '$m phút';
    if (m == 0) return '$h giờ';
    return '$h giờ $m phút';
  }
}
