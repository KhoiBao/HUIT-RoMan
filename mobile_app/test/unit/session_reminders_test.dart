import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/usage/application/session_reminders.dart';
import 'package:roman_mobile/features/usage/domain/usage_session.dart';

UsageSession _session({String endAt = '2026-10-31T05:00:00Z'}) =>
    UsageSession.fromJson({
      'id': 7,
      'status': 'Đang sử dụng',
      'roomId': 3,
      'roomName': 'Phòng học nhóm TV01',
      'roomCode': 'TV01',
      'startAt': '2026-10-31T03:00:00Z',
      'endAt': endAt,
    });

void main() {
  test('schedules reminders at 30 and 15 minutes before the end', () {
    final plan = SessionReminderPlan.build(
      _session(),
      DateTime.utc(2026, 10, 31, 4),
    );

    expect(plan.map((reminder) => reminder.minutes), [30, 15]);
    expect(plan.map((reminder) => reminder.id), [71, 72]);
    expect(plan.first.scheduledAt, DateTime.utc(2026, 10, 31, 4, 30));
    expect(plan.last.scheduledAt, DateTime.utc(2026, 10, 31, 4, 45));
  });

  test('skips thresholds that already passed', () {
    final plan = SessionReminderPlan.build(
      _session(),
      DateTime.utc(2026, 10, 31, 4, 40),
    );

    expect(plan.map((reminder) => reminder.minutes), [15]);
    expect(plan.single.scheduledAt, DateTime.utc(2026, 10, 31, 4, 45));
  });

  test('returns no reminder once the session ended', () {
    final plan = SessionReminderPlan.build(
      _session(),
      DateTime.utc(2026, 10, 31, 5),
    );

    expect(plan, isEmpty);
  });
}
