import '../../../core/utils/date_time_x.dart';
import '../../booking/domain/booking_rules.dart';

enum UsageStatus {
  pendingCheckIn,
  inUse,
  completed,
  cancelled,
  unknown;

  static UsageStatus fromApi(String? raw) {
    final value = (raw ?? '').trim().toLowerCase();
    if (value.isEmpty) return UsageStatus.unknown;
    if (value.contains('chờ nhận') || value.contains('pending')) {
      return UsageStatus.pendingCheckIn;
    }
    if (value.contains('đang sử dụng') ||
        value == 'inuse' ||
        value == 'in use' ||
        value == 'using') {
      return UsageStatus.inUse;
    }
    if (value.contains('hoàn thành') || value.contains('completed')) {
      return UsageStatus.completed;
    }
    if (value.contains('đã hủy') ||
        value.contains('đã huỷ') ||
        value.contains('cancelled') ||
        value.contains('canceled')) {
      return UsageStatus.cancelled;
    }
    return UsageStatus.unknown;
  }

  String get label => switch (this) {
        UsageStatus.pendingCheckIn => 'Chờ nhận phòng',
        UsageStatus.inUse => 'Đang sử dụng',
        UsageStatus.completed => 'Hoàn thành',
        UsageStatus.cancelled => 'Đã hủy',
        UsageStatus.unknown => 'Không rõ',
      };

  bool get isPending => this == UsageStatus.pendingCheckIn;
  bool get isInUse => this == UsageStatus.inUse;
  bool get isFinished => this == UsageStatus.completed;
}

class UsageSession {
  const UsageSession({
    required this.id,
    required this.status,
    required this.confirmationCode,
    required this.createdAt,
    required this.bookingDetailId,
    required this.bookingId,
    required this.activityName,
    required this.purpose,
    required this.guestCount,
    required this.roomId,
    required this.roomName,
    required this.roomCode,
    required this.building,
    required this.floor,
    required this.startAt,
    required this.endAt,
    this.actualCheckIn,
    this.actualCheckOut,
    this.actualGuestCount,
    this.startPeriodId,
    this.startPeriodName,
    this.endPeriodId,
    this.endPeriodName,
    this.roomStatus = '',
    this.staffNote,
  });

  final int id;
  final UsageStatus status;
  final String confirmationCode;
  final DateTime createdAt;
  final DateTime? actualCheckIn;
  final DateTime? actualCheckOut;
  final int? actualGuestCount;
  final int bookingDetailId;
  final int bookingId;
  final String activityName;
  final String purpose;
  final int guestCount;
  final int roomId;
  final String roomName;
  final String roomCode;
  final String building;
  final String floor;
  final String roomStatus;
  final DateTime startAt;
  final DateTime endAt;
  final int? startPeriodId;
  final String? startPeriodName;
  final int? endPeriodId;
  final String? endPeriodName;
  final String? staffNote;

  String get roomLabel => roomName.isEmpty ? roomCode : roomName;

  String get location {
    final parts = <String>[
      if (building.isNotEmpty) building,
      if (floor.isNotEmpty) 'Tầng $floor',
    ];
    return parts.join(' · ');
  }

  String get timeRange => DateTimeX.range(startAt, endAt);
  String get dateLabel => DateTimeX.dayOf(startAt);

  String get periodLabel {
    if (startPeriodName == null && endPeriodName == null) return '';
    if (startPeriodName == endPeriodName) return startPeriodName ?? '';
    return '${startPeriodName ?? ''} – ${endPeriodName ?? ''}';
  }

  CheckInWindow get checkInWindow => BookingRules.checkInWindow(startAt);

  bool get canCheckIn =>
      status.isPending && checkInWindow == CheckInWindow.open;

  String get checkInHint => BookingRules.checkInHint(startAt);

  factory UsageSession.fromJson(Map<String, dynamic> json) => UsageSession(
        id: _int(json['id']),
        status: UsageStatus.fromApi(json['status']?.toString()),
        confirmationCode: (json['confirmationCode'] ?? '').toString(),
        createdAt: DateTimeX.parseUtc(json['createdAt']?.toString()) ??
            DateTime.now().toUtc(),
        actualCheckIn: DateTimeX.parseUtc(json['actualCheckIn']?.toString()),
        actualCheckOut: DateTimeX.parseUtc(json['actualCheckOut']?.toString()),
        actualGuestCount: json['actualGuestCount'] == null
            ? null
            : _int(json['actualGuestCount']),
        bookingDetailId: _int(json['bookingDetailId']),
        bookingId: _int(json['bookingId']),
        activityName: (json['activityName'] ?? '').toString(),
        purpose: (json['purpose'] ?? '').toString(),
        guestCount: _int(json['guestCount']),
        roomId: _int(json['roomId']),
        roomName: (json['roomName'] ?? '').toString(),
        roomCode: (json['roomCode'] ?? '').toString(),
        building: (json['building'] ?? '').toString(),
        floor: (json['floor'] ?? '').toString(),
        roomStatus: (json['roomStatus'] ?? '').toString(),
        startAt: DateTimeX.parseUtc(json['startAt']?.toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        endAt: DateTimeX.parseUtc(json['endAt']?.toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        startPeriodId:
            json['startPeriodId'] == null ? null : _int(json['startPeriodId']),
        startPeriodName: json['startPeriodName'] as String?,
        endPeriodId:
            json['endPeriodId'] == null ? null : _int(json['endPeriodId']),
        endPeriodName: json['endPeriodName'] as String?,
        staffNote: json['staffNote'] as String?,
      );
}

class ExtendUsageInput {
  const ExtendUsageInput.byPeriod(int periodId)
      : newEndPeriodId = periodId,
        newEndAt = null;

  const ExtendUsageInput.byTime(DateTime endAt)
      : newEndAt = endAt,
        newEndPeriodId = null;

  final DateTime? newEndAt;
  final int? newEndPeriodId;
}

class CheckOutResultInput {
  const CheckOutResultInput({
    required this.roomCondition,
    this.devicesOk = true,
    this.cleaned = true,
    this.lightsOff = true,
    this.staffNote,
  });

  final String roomCondition;
  final bool devicesOk;
  final bool cleaned;
  final bool lightsOff;
  final String? staffNote;
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
