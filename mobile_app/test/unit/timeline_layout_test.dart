import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/schedule/domain/schedule_entry.dart';

void main() {
  const hourHeight = 40.0;

  test('places a Vietnam 07:00 entry at the top', () {
    final slot = TimelineLayout.offset(
      DateTime.utc(2026, 11, 1, 0, 0),
      DateTime.utc(2026, 11, 1, 2, 0),
      hourHeight,
    );
    expect(slot.top, 0);
    expect(slot.height, 80);
  });

  test('clips entries outside the 07:00-20:00 window', () {
    final slot = TimelineLayout.offset(
      DateTime.utc(2026, 11, 1, 0, 0),
      DateTime.utc(2026, 11, 1, 15, 0),
      hourHeight,
    );
    expect(slot.top, 0);
    expect(slot.height, TimelineLayout.hours * hourHeight);
  });

  test('keeps a minimum height for very short entries', () {
    final slot = TimelineLayout.offset(
      DateTime.utc(2026, 11, 1, 1, 0),
      DateTime.utc(2026, 11, 1, 1, 5),
      hourHeight,
    );
    expect(slot.height, greaterThanOrEqualTo(20));
  });
}
