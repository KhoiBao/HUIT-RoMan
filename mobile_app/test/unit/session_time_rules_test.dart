import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/usage/domain/session_time_rules.dart';

void main() {
  test('countdown keeps two digits and never goes negative', () {
    expect(
      SessionTimeRules.countdownLabel(
          const Duration(hours: 2, minutes: 3, seconds: 4)),
      '02:03:04',
    );
    expect(SessionTimeRules.countdownLabel(const Duration(seconds: 59)),
        '00:00:59');
    expect(SessionTimeRules.countdownLabel(const Duration(seconds: -5)),
        '00:00:00');
  });

  test('rating unlocks exactly 30 minutes before the end', () {
    final endAt = DateTime.utc(2026, 10, 31, 10);

    expect(SessionTimeRules.ratingOpensAt(endAt), DateTime.utc(2026, 10, 31, 9, 30));
    expect(
      SessionTimeRules.canRate(endAt, endAt.subtract(const Duration(minutes: 31))),
      isFalse,
    );
    expect(
      SessionTimeRules.canRate(endAt, endAt.subtract(const Duration(minutes: 30))),
      isTrue,
    );
    expect(SessionTimeRules.ratingUnlockLabel(endAt), '16:30');
  });
}
