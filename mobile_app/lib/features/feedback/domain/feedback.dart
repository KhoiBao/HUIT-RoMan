import '../../../core/utils/date_time_x.dart';

class Feedback {
  const Feedback({
    required this.id,
    required this.rating,
    required this.comment,
    required this.userName,
    required this.roomName,
    required this.createdAt,
    this.usageSessionId,
    this.bookingId,
    this.roomId,
    this.startAt,
    this.endAt,
  });

  final int id;
  final int rating;
  final String comment;
  final String userName;
  final String roomName;
  final DateTime createdAt;
  final int? usageSessionId;
  final int? bookingId;
  final int? roomId;
  final DateTime? startAt;
  final DateTime? endAt;

  String get createdAtLabel => DateTimeX.dayTimeOf(createdAt);

  factory Feedback.fromJson(Map<String, dynamic> json) => Feedback(
        id: _int(json['id']),
        rating: _int(json['rating']),
        comment: (json['comment'] ?? '').toString(),
        userName: (json['userName'] ?? '').toString(),
        roomName: (json['roomName'] ?? '').toString(),
        createdAt: DateTimeX.parseUtc(json['createdAt']?.toString()) ??
            DateTime.now().toUtc(),
        usageSessionId: json['usageSessionId'] == null
            ? null
            : _int(json['usageSessionId']),
        bookingId:
            json['bookingId'] == null ? null : _int(json['bookingId']),
        roomId: json['roomId'] == null ? null : _int(json['roomId']),
        startAt: DateTimeX.parseUtc(json['startAt']?.toString()),
        endAt: DateTimeX.parseUtc(json['endAt']?.toString()),
      );
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
