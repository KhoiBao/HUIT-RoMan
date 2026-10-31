import '../../../core/utils/date_time_x.dart';

abstract final class SessionTimeRules {
  static const ratingLeadTime = Duration(minutes: 30);
  static const reminderMinutes = [30, 15];

  static DateTime ratingOpensAt(DateTime endAt) =>
      endAt.toUtc().subtract(ratingLeadTime);

  static bool canRate(DateTime endAt, DateTime now) =>
      !now.toUtc().isBefore(ratingOpensAt(endAt));

  static String ratingUnlockLabel(DateTime endAt) =>
      DateTimeX.timeOf(ratingOpensAt(endAt));

  static String countdownLabel(Duration remaining) {
    final safe = remaining.isNegative ? Duration.zero : remaining;
    final hours = safe.inHours;
    final minutes = safe.inMinutes.remainder(60);
    final seconds = safe.inSeconds.remainder(60);
    String two(int value) => value.toString().padLeft(2, '0');
    return '${two(hours)}:${two(minutes)}:${two(seconds)}';
  }
}
