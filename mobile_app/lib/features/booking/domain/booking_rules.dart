import 'booking_status.dart';
import 'clock_time.dart';

enum CheckInWindow {
  tooEarly,
  open,
  expired;

  static CheckInWindow fromApi(String? raw) {
    final v = (raw ?? '').trim().toLowerCase();
    if (v == 'open' || v.contains('mở')) return CheckInWindow.open;
    if (v == 'expired' || v.contains('hết')) return CheckInWindow.expired;
    return CheckInWindow.tooEarly;
  }
}

abstract final class BookingRules {
  static const openTime = ClockTime(7, 0);
  static const closeTime = ClockTime(20, 0);
  static const maxDuration = Duration(hours: 2);
  static const maxAdvanceDays = 14;
  static const cancelLeadTime = Duration(hours: 3);
  static const checkInLeadTime = Duration(minutes: 15);

  static final _vnOffset = Duration(hours: 7);

  static DateTime _vietnamNow(DateTime? nowUtc) =>
      (nowUtc ?? DateTime.now().toUtc()).toUtc().add(_vnOffset);

  /// Vietnam wall-clock fields stored as UTC so comparisons are timezone-free.
  static DateTime _wallClock(DateTime date, ClockTime time) => DateTime.utc(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );

  static String? validateStudentWindow(
    DateTime date,
    ClockTime start,
    ClockTime end, {
    DateTime? nowUtc,
  }) {
    final startAt = _wallClock(date, start);
    final endAt = _wallClock(date, end);

    if (!endAt.isAfter(startAt)) {
      return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    }
    if (date.weekday == DateTime.sunday) {
      return 'Thư viện không phục vụ mượn phòng vào Chủ Nhật.';
    }
    final now = _vietnamNow(nowUtc);
    if (!startAt.isAfter(now)) {
      return 'Không thể đặt thời gian đã qua trong ngày.';
    }
    if (start < openTime) {
      return 'Sinh viên chỉ có thể đặt phòng từ 07:00.';
    }
    if (end > closeTime) {
      return 'Sinh viên phải trả phòng trước 20:00.';
    }
    if (endAt.difference(startAt) > maxDuration) {
      return 'Sinh viên chỉ được đặt tối đa 2 giờ mỗi lượt.';
    }
    return null;
  }

  static String? validateLecturerWindow(
    DateTime date,
    ClockTime start,
    ClockTime end, {
    DateTime? nowUtc,
  }) {
    final startAt = _wallClock(date, start);
    final endAt = _wallClock(date, end);

    if (!endAt.isAfter(startAt)) {
      return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    }
    final now = _vietnamNow(nowUtc);
    if (!startAt.isAfter(now)) {
      return 'Không thể đặt thời gian đã qua trong ngày.';
    }
    if (start < openTime || end > closeTime) {
      return 'Thời gian đặt phòng nằm ngoài giờ phục vụ 07:00 – 20:00.';
    }
    return null;
  }

  static String? validateAdvance(DateTime date, {DateTime? nowUtc}) {
    final today = _dateOnly(_vietnamNow(nowUtc));
    final day = _dateOnly(date);
    if (day.isBefore(today)) {
      return 'Không thể đặt phòng cho ngày trong quá khứ.';
    }
    if (day.isAfter(today.add(const Duration(days: maxAdvanceDays)))) {
      return 'Chỉ được đặt phòng trước tối đa 2 tuần.';
    }
    return null;
  }

  static DateTime _dateOnly(DateTime value) =>
      DateTime.utc(value.year, value.month, value.day);

  static bool canCancel({
    required BookingStatus status,
    required DateTime startAt,
    required bool checkedIn,
    DateTime? nowUtc,
  }) {
    if (!status.isApproved) return false;
    if (checkedIn) return false;
    final now = nowUtc ?? DateTime.now().toUtc();
    return !now.isAfter(startAt.toUtc().subtract(cancelLeadTime));
  }

  static CheckInWindow checkInWindow(DateTime startAtUtc, {DateTime? nowUtc}) {
    final now = nowUtc ?? DateTime.now().toUtc();
    final start = startAtUtc.toUtc();
    if (now.isBefore(start.subtract(checkInLeadTime))) {
      return CheckInWindow.tooEarly;
    }
    if (now.isBefore(start)) return CheckInWindow.open;
    return CheckInWindow.expired;
  }

  static String checkInHint(DateTime startAtUtc) {
    final openAt =
        startAtUtc.toUtc().subtract(checkInLeadTime).add(_vnOffset);
    final hh = openAt.hour.toString().padLeft(2, '0');
    final mm = openAt.minute.toString().padLeft(2, '0');
    return 'Chỉ có thể nhận phòng từ $hh:$mm (trước giờ bắt đầu 15 phút).';
  }
}
