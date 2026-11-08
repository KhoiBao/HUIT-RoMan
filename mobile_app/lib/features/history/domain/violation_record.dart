import '../../../core/utils/date_time_x.dart';

enum ViolationStatus {
  pending,
  processing,
  resolved,
  finePaid,
  cancelled,
  unknown;

  static ViolationStatus fromApi(String? raw) {
    final value = (raw ?? '').trim();
    if (value.isEmpty) return ViolationStatus.unknown;
    if (value.contains('Chờ xử lý')) return ViolationStatus.pending;
    if (value.contains('Đang xử lý')) return ViolationStatus.processing;
    if (value.contains('Đã nộp phạt')) return ViolationStatus.finePaid;
    if (value.contains('Đã xử lý')) return ViolationStatus.resolved;
    if (value.contains('Hủy')) return ViolationStatus.cancelled;
    return ViolationStatus.unknown;
  }

  String get label => switch (this) {
        ViolationStatus.pending => 'Chờ xử lý',
        ViolationStatus.processing => 'Đang xử lý',
        ViolationStatus.resolved => 'Đã xử lý',
        ViolationStatus.finePaid => 'Đã nộp phạt',
        ViolationStatus.cancelled => 'Hủy bỏ',
        ViolationStatus.unknown => 'Không rõ',
      };
}

class ViolationRecord {
  const ViolationRecord({
    required this.id,
    required this.code,
    required this.incidentTime,
    required this.description,
    required this.severityText,
    required this.penaltyApplied,
    required this.status,
    required this.violationTypeName,
    required this.isRestricted,
    required this.restrictDays,
    this.roomName,
    this.restrictionEndAt,
  });

  final int id;
  final String code;
  final DateTime incidentTime;
  final String description;
  final String severityText;
  final String penaltyApplied;
  final ViolationStatus status;
  final String violationTypeName;
  final String? roomName;
  final bool isRestricted;
  final int restrictDays;
  final DateTime? restrictionEndAt;

  String? get roomLabel => (roomName ?? '').trim().isEmpty ? null : roomName;

  String get incidentLabel =>
      DateTimeX.dayTimeOf(incidentTime.toUtc());

  factory ViolationRecord.fromJson(Map<String, dynamic> json) {
    final status = ViolationStatus.fromApi(json['status']?.toString());
    return ViolationRecord(
      id: _int(json['id']),
      code: (json['code'] ?? '').toString(),
      incidentTime: DateTimeX.parseUtc(json['incidentTime']?.toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      description: (json['description'] ?? '').toString(),
      severityText: (json['severityText'] ?? '').toString(),
      penaltyApplied: (json['penaltyApplied'] ?? '').toString(),
      status: status,
      violationTypeName: (json['violationTypeName'] ?? '').toString(),
      roomName: json['roomName']?.toString(),
      isRestricted: json['isRestricted'] == true,
      restrictDays: _int(json['restrictDays']),
      restrictionEndAt: DateTimeX.parseUtc(json['restrictionEndAt']?.toString()),
    );
  }
}

class UserEligibility {
  const UserEligibility({
    required this.isEligible,
    required this.message,
    required this.hasActiveRestriction,
    this.restrictionType,
    this.reason,
    this.startAt,
    this.endAt,
    this.remainingDays,
  });

  final bool isEligible;
  final String message;
  final bool hasActiveRestriction;
  final String? restrictionType;
  final String? reason;
  final DateTime? startAt;
  final DateTime? endAt;
  final int? remainingDays;

  factory UserEligibility.fromJson(Map<String, dynamic> json) =>
      UserEligibility(
        isEligible: json['isEligible'] == true,
        message: (json['message'] ?? '').toString(),
        hasActiveRestriction: json['hasActiveRestriction'] == true,
        restrictionType: json['restrictionType']?.toString(),
        reason: json['reason']?.toString(),
        startAt: DateTimeX.parseUtc(json['startAt']?.toString()),
        endAt: DateTimeX.parseUtc(json['endAt']?.toString()),
        remainingDays:
            json['remainingDays'] == null ? null : _int(json['remainingDays']),
      );
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
