import '../../../../core/utils/date_time_x.dart';

class ScheduleEntry {
  const ScheduleEntry({
    required this.bookingId,
    required this.bookingDetailId,
    required this.roomId,
    required this.roomName,
    required this.roomCode,
    required this.activityName,
    required this.startAt,
    required this.endAt,
    required this.status,
    this.purpose = '',
    this.bookedByName = '',
    this.startPeriodName,
    this.endPeriodName,
  });

  final int bookingId;
  final int bookingDetailId;
  final int roomId;
  final String roomName;
  final String roomCode;
  final String activityName;
  final String purpose;
  final DateTime startAt;
  final DateTime endAt;
  final String status;
  final String bookedByName;
  final String? startPeriodName;
  final String? endPeriodName;

  String get timeRange => DateTimeX.range(startAt, endAt);

  factory ScheduleEntry.fromJson(Map<String, dynamic> json) => ScheduleEntry(
        bookingId: (json['bookingId'] ?? 0) as int,
        bookingDetailId: (json['bookingDetailId'] ?? 0) as int,
        roomId: (json['roomId'] ?? 0) as int,
        roomName: (json['roomName'] ?? '').toString(),
        roomCode: (json['roomCode'] ?? '').toString(),
        activityName: (json['activityName'] ?? '').toString(),
        purpose: (json['purpose'] ?? '').toString(),
        startAt: DateTimeX.parseUtc(json['startAt']?.toString()) ?? DateTime.now().toUtc(),
        endAt: DateTimeX.parseUtc(json['endAt']?.toString()) ?? DateTime.now().toUtc(),
        status: (json['status'] ?? '').toString(),
        bookedByName: (json['bookedByName'] ?? '').toString(),
        startPeriodName: json['startPeriodName'] as String?,
        endPeriodName: json['endPeriodName'] as String?,
      );
}

class TimelineSlot {
  const TimelineSlot(this.top, this.height);
  final double top;
  final double height;
}

class TimelineLayout {
  static const startHour = 7;
  static const endHour = 20;
  static const hours = endHour - startHour;

  static TimelineSlot offset(
    DateTime startAt,
    DateTime endAt,
    double hourHeight,
  ) {
    final start = DateTimeX.toVietnam(startAt);
    final end = DateTimeX.toVietnam(endAt);
    final startMinutes = (start.hour - startHour) * 60 + start.minute;
    final endMinutes = (end.hour - startHour) * 60 + end.minute;
    final clampedStart = startMinutes.clamp(0, hours * 60).toDouble();
    final clampedEnd = endMinutes.clamp(0, hours * 60).toDouble();
    final height = ((clampedEnd - clampedStart) * hourHeight / 60).clamp(20.0, double.infinity);
    return TimelineSlot(clampedStart * hourHeight / 60, height);
  }
}
