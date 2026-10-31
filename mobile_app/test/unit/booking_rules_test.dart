import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/booking/domain/booking_rules.dart';
import 'package:roman_mobile/features/booking/domain/booking_status.dart';
import 'package:roman_mobile/features/booking/domain/clock_time.dart';

void main() {
  test('students must stay inside 07:00-20:00, max 2h, no Sunday', () {
    final monday = DateTime(2026, 11, 2);
    expect(
      BookingRules.validateStudentWindow(monday,
          const ClockTime(7, 0), const ClockTime(9, 0)),
      isNull,
    );
    expect(
      BookingRules.validateStudentWindow(monday,
          const ClockTime(6, 30), const ClockTime(8, 0)),
      isNotNull,
    );
    expect(
      BookingRules.validateStudentWindow(monday,
          const ClockTime(8, 0), const ClockTime(11, 0)),
      contains('2 giờ'),
    );
    final sunday = DateTime(2026, 11, 8);
    expect(
      BookingRules.validateStudentWindow(sunday,
          const ClockTime(8, 0), const ClockTime(9, 0)),
      contains('Chủ Nhật'),
    );
  });

  test('advance window capped at 14 days', () {
    final now = DateTime(2026, 10, 31);
    expect(BookingRules.validateAdvance(DateTime(2026, 11, 14), nowUtc: now),
        isNull);
    expect(BookingRules.validateAdvance(DateTime(2026, 11, 15), nowUtc: now),
        contains('2 tuần'));
    expect(BookingRules.validateAdvance(DateTime(2026, 10, 30), nowUtc: now),
        contains('quá khứ'));
  });

  test('cancel blocked within 3 hours or after check-in', () {
    final start = DateTime.now().toUtc().add(const Duration(hours: 2));
    expect(
      BookingRules.canCancel(
          status: BookingStatus.approved, startAt: start, checkedIn: false),
      isFalse,
    );
    final later = DateTime.now().toUtc().add(const Duration(hours: 5));
    expect(
      BookingRules.canCancel(
          status: BookingStatus.approved, startAt: later, checkedIn: false),
      isTrue,
    );
    expect(
      BookingRules.canCancel(
          status: BookingStatus.inUse, startAt: later, checkedIn: true),
      isFalse,
    );
    expect(
      BookingRules.canCancel(
          status: BookingStatus.pending, startAt: later, checkedIn: false),
      isFalse,
    );
  });

  test('check-in window opens 15 minutes before start', () {
    final start = DateTime.now().toUtc().add(const Duration(minutes: 10));
    expect(BookingRules.checkInWindow(start), CheckInWindow.open);
    expect(
      BookingRules.checkInWindow(
          DateTime.now().toUtc().add(const Duration(hours: 3))),
      CheckInWindow.tooEarly,
    );
    expect(
      BookingRules.checkInWindow(
          DateTime.now().toUtc().subtract(const Duration(minutes: 40))),
      CheckInWindow.expired,
    );
  });
}
