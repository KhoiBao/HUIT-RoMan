import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/utils/date_time_x.dart';

void main() {
  test('formats a UTC instant as Vietnam date', () {
    final utc = DateTime.utc(2026, 10, 31, 18, 30);
    expect(DateTimeX.toVietnamDate(utc), '2026-11-01');
  });

  test('parses ISO strings as UTC', () {
    expect(DateTimeX.parseUtc('2026-10-31T10:00:00Z')!.isUtc, isTrue);
    expect(DateTimeX.parseUtc(null), isNull);
    expect(DateTimeX.parseUtc('not-a-date'), isNull);
  });

  test('converts Vietnam wall clock to UTC instant', () {
    final utc = DateTimeX.fromVietnamWallClock(DateTime(2026, 11, 1, 8, 0));
    expect(utc, DateTime.utc(2026, 11, 1, 1, 0));
  });

  test('detects today in Vietnam time', () {
    final now = DateTime.now().toUtc();
    expect(DateTimeX.isTodayVn(now), isTrue);
  });
}
