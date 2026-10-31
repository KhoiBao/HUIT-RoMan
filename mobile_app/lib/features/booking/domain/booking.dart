import '../../../core/utils/date_time_x.dart';
import 'booking_rules.dart';
import 'booking_status.dart';
import 'clock_time.dart';

enum BookingMode { hourly, period }

class Period {
  const Period({
    required this.id,
    required this.name,
    required this.start,
    required this.end,
    this.roomTypeId,
    this.roomTypeName = '',
  });

  final int id;
  final String name;
  final ClockTime start;
  final ClockTime end;
  final int? roomTypeId;
  final String roomTypeName;

  String get range => '${start.label} – ${end.label}';

  factory Period.fromJson(Map<String, dynamic> json) => Period(
        id: _int(json['id']),
        name: (json['name'] ?? '').toString(),
        start: ClockTime.tryParse(json['startTime']?.toString()) ??
            const ClockTime(0, 0),
        end: ClockTime.tryParse(json['endTime']?.toString()) ??
            const ClockTime(0, 0),
        roomTypeId: json['roomTypeId'] == null ? null : _int(json['roomTypeId']),
        roomTypeName: (json['roomTypeName'] ?? '').toString(),
      );
}

class PeriodGroup {
  const PeriodGroup({
    required this.roomTypeId,
    required this.roomTypeName,
    required this.periods,
  });

  final int roomTypeId;
  final String roomTypeName;
  final List<Period> periods;

  static List<PeriodGroup> fromPeriods(List<Period> periods) {
    final map = <int, List<Period>>{};
    for (final period in periods) {
      final id = period.roomTypeId;
      if (id == null) continue;
      map.putIfAbsent(id, () => []).add(period);
    }
    final groups = <PeriodGroup>[];
    for (final entry in map.entries) {
      final list = [...entry.value]..sort((a, b) => a.start.compareTo(b.start));
      groups.add(PeriodGroup(
        roomTypeId: entry.key,
        roomTypeName: list.first.roomTypeName,
        periods: list,
      ));
    }
    groups.sort((a, b) => a.roomTypeName.compareTo(b.roomTypeName));
    return groups;
  }
}

class AvailableRoom {
  const AvailableRoom({
    required this.id,
    required this.name,
    required this.code,
    required this.building,
    required this.floor,
    required this.capacity,
    required this.roomTypeId,
    required this.roomTypeName,
    required this.isBookingByPeriod,
  });

  final int id;
  final String name;
  final String code;
  final String building;
  final String floor;
  final int capacity;
  final int roomTypeId;
  final String roomTypeName;
  final bool isBookingByPeriod;

  String get location {
    final parts = <String>[
      if (building.isNotEmpty) building,
      if (floor.isNotEmpty) 'Tầng $floor',
    ];
    return parts.join(' · ');
  }

  factory AvailableRoom.fromJson(Map<String, dynamic> json) => AvailableRoom(
        id: _int(json['roomId'] ?? json['id']),
        name: (json['roomName'] ?? json['name'] ?? '').toString(),
        code: (json['roomCode'] ?? json['code'] ?? '').toString(),
        building: (json['building'] ?? '').toString(),
        floor: (json['floor'] ?? '').toString(),
        capacity: _int(json['capacity']),
        roomTypeId: _int(json['roomTypeId']),
        roomTypeName: (json['roomTypeName'] ?? '').toString(),
        isBookingByPeriod: json['isBookingByPeriod'] == true,
      );
}

class BookingDetailItem {
  const BookingDetailItem({
    required this.id,
    required this.roomId,
    required this.roomName,
    required this.roomCode,
    required this.startAt,
    required this.endAt,
    required this.guestCount,
    required this.purpose,
    required this.status,
    this.startPeriodId,
    this.startPeriodName,
    this.endPeriodId,
    this.endPeriodName,
    this.rejectionReason = '',
    this.approvedByName,
    this.approvedAt,
    this.approvalMode,
  });

  final int id;
  final int roomId;
  final String roomName;
  final String roomCode;
  final DateTime startAt;
  final DateTime endAt;
  final int? startPeriodId;
  final String? startPeriodName;
  final int? endPeriodId;
  final String? endPeriodName;
  final int guestCount;
  final String purpose;
  final BookingStatus status;
  final String rejectionReason;
  final String? approvedByName;
  final DateTime? approvedAt;
  final String? approvalMode;

  String get roomLabel => roomName.isEmpty ? roomCode : roomName;

  String get timeRange => DateTimeX.range(startAt, endAt);

  String get periodLabel {
    if (startPeriodName == null && endPeriodName == null) return '';
    if (startPeriodName == endPeriodName) return startPeriodName ?? '';
    return '${startPeriodName ?? ''} – ${endPeriodName ?? ''}';
  }

  bool get isActive => status != BookingStatus.rejected && status != BookingStatus.cancelled;

  factory BookingDetailItem.fromJson(Map<String, dynamic> json) =>
      BookingDetailItem(
        id: _int(json['id']),
        roomId: _int(json['roomId']),
        roomName: (json['roomName'] ?? '').toString(),
        roomCode: (json['roomCode'] ?? '').toString(),
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
        guestCount: _int(json['guestCount']),
        purpose: (json['purpose'] ?? '').toString(),
        status: BookingStatus.fromApi(json['status']?.toString()),
        rejectionReason: (json['rejectionReason'] ?? '').toString(),
        approvedByName: json['approvedByName'] as String?,
        approvedAt: DateTimeX.parseUtc(json['approvedAt']?.toString()),
        approvalMode: json['approvalMode'] as String?,
      );
}

class CheckInWindowInfo {
  const CheckInWindowInfo({
    required this.startAt,
    required this.opensAt,
    required this.deadlineAt,
    required this.state,
    required this.serverTime,
  });

  final DateTime startAt;
  final DateTime opensAt;
  final DateTime deadlineAt;
  final CheckInWindow state;
  final DateTime serverTime;

  factory CheckInWindowInfo.fromJson(Map<String, dynamic> json) =>
      CheckInWindowInfo(
        startAt: DateTimeX.parseUtc(json['startAt']?.toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        opensAt: DateTimeX.parseUtc(json['opensAt']?.toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        deadlineAt: DateTimeX.parseUtc(json['deadlineAt']?.toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        state: CheckInWindow.fromApi(json['state']?.toString()),
        serverTime: DateTimeX.parseUtc(json['serverTime']?.toString()) ??
            DateTime.now().toUtc(),
      );
}

class Booking {
  const Booking({
    required this.id,
    required this.activityName,
    required this.purpose,
    required this.guestCount,
    required this.status,
    required this.requestedAt,
    required this.createdAt,
    required this.details,
    this.note = '',
    this.rejectionReason = '',
    this.checkedInAt,
    this.cancelReason,
    this.cancelReasonDetail,
    this.cancelSource,
    this.checkInWindow,
    this.approvedByName,
    this.approvedAt,
    this.approvalMode,
  });

  final int id;
  final String activityName;
  final String purpose;
  final int guestCount;
  final BookingStatus status;
  final String rejectionReason;
  final String note;
  final DateTime requestedAt;
  final DateTime createdAt;
  final DateTime? checkedInAt;
  final String? cancelReason;
  final String? cancelReasonDetail;
  final String? cancelSource;
  final CheckInWindowInfo? checkInWindow;
  final String? approvedByName;
  final DateTime? approvedAt;
  final String? approvalMode;
  final List<BookingDetailItem> details;

  bool get isCheckedIn => checkedInAt != null;

  List<BookingDetailItem> get activeDetails =>
      details.where((d) => d.isActive).toList();

  DateTime get startAt {
    final source = activeDetails.isNotEmpty ? activeDetails : details;
    if (source.isEmpty) return requestedAt;
    return source
        .map((d) => d.startAt)
        .reduce((a, b) => a.isBefore(b) ? a : b);
  }

  DateTime get endAt {
    final source = activeDetails.isNotEmpty ? activeDetails : details;
    if (source.isEmpty) return startAt;
    return source.map((d) => d.endAt).reduce((a, b) => a.isAfter(b) ? a : b);
  }

  String get roomNames {
    final names = <String>{};
    for (final detail in activeDetails.isNotEmpty ? activeDetails : details) {
      final name = detail.roomLabel;
      if (name.isNotEmpty) names.add(name);
    }
    return names.join(', ');
  }

  String get timeRange => DateTimeX.range(startAt, endAt);

  String get dateLabel => DateTimeX.dayOf(startAt);

  CheckInWindow get currentCheckInState =>
      BookingRules.checkInWindow(startAt);

  bool get canCheckIn =>
      status.isApproved && !isCheckedIn && currentCheckInState == CheckInWindow.open;

  bool get canCancel => BookingRules.canCancel(
        status: status,
        startAt: startAt,
        checkedIn: isCheckedIn,
      );

  bool get isInUse =>
      status == BookingStatus.inUse ||
      details.any((d) => d.status == BookingStatus.inUse);

  String? get cancelReasonLabel {
    final code = (cancelReason ?? '').trim().toUpperCase();
    return switch (code) {
      'CHANGE_PLAN' => 'Thay đổi kế hoạch',
      'NO_LONGER_NEEDED' => 'Không còn nhu cầu sử dụng',
      'OTHER' => 'Lý do khác',
      'NO_SHOW' => 'Không nhận phòng đúng hạn',
      '' => null,
      _ => cancelReason,
    };
  }

  factory Booking.fromJson(Map<String, dynamic> json) {
    final details = (json['details'] as List<dynamic>? ?? const [])
        .whereType<Map>()
        .map((e) => BookingDetailItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    final requested =
        DateTimeX.parseUtc(json['requestedAt']?.toString()) ??
            DateTimeX.parseUtc(json['createdAt']?.toString()) ??
            DateTime.now().toUtc();
    return Booking(
      id: _int(json['id']),
      activityName: (json['activityName'] ?? '').toString(),
      purpose: (json['purpose'] ?? '').toString(),
      guestCount: _int(json['guestCount']),
      status: BookingStatus.fromApi(json['status']?.toString()),
      rejectionReason: (json['rejectionReason'] ?? '').toString(),
      note: (json['note'] ?? '').toString(),
      requestedAt: requested,
      createdAt: DateTimeX.parseUtc(json['createdAt']?.toString()) ?? requested,
      checkedInAt: DateTimeX.parseUtc(json['checkedInAt']?.toString()),
      cancelReason: json['cancelReason'] as String?,
      cancelReasonDetail: json['cancelReasonDetail'] as String?,
      cancelSource: json['cancelSource'] as String?,
      checkInWindow: json['checkInWindow'] is Map
          ? CheckInWindowInfo.fromJson(
              Map<String, dynamic>.from(json['checkInWindow'] as Map))
          : null,
      approvedByName: json['approvedByName'] as String?,
      approvedAt: DateTimeX.parseUtc(json['approvedAt']?.toString()),
      approvalMode: json['approvalMode'] as String?,
      details: details,
    );
  }
}

class ApprovalEvent {
  const ApprovalEvent({
    required this.id,
    required this.bookingId,
    required this.status,
    required this.statusName,
    required this.comment,
    required this.decidedAt,
    this.employeeName,
    this.employeeCode,
    this.employeePosition,
    this.actorName,
    this.approvalMode,
  });

  final int id;
  final int bookingId;
  final int status;
  final String statusName;
  final String comment;
  final DateTime decidedAt;
  final String? employeeName;
  final String? employeeCode;
  final String? employeePosition;
  final String? actorName;
  final String? approvalMode;

  BookingStatus get bookingStatus => switch (status) {
        1 => BookingStatus.approved,
        2 => BookingStatus.rejected,
        3 => BookingStatus.partiallyApproved,
        4 => BookingStatus.cancelled,
        _ => BookingStatus.unknown,
      };

  String get actorLabel {
    final name = employeeName ?? actorName;
    if (name == null || name.trim().isEmpty) {
      return approvalMode == 'AUTO' ? 'Hệ thống' : 'Quản lý thư viện';
    }
    return name;
  }

  factory ApprovalEvent.fromJson(Map<String, dynamic> json) => ApprovalEvent(
        id: _int(json['id']),
        bookingId: _int(json['bookingId']),
        status: _int(json['status']),
        statusName: (json['statusName'] ?? '').toString(),
        comment: (json['comment'] ?? '').toString(),
        decidedAt: DateTimeX.parseUtc(json['decidedAt']?.toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
        employeeName: json['employeeName'] as String?,
        employeeCode: json['employeeCode'] as String?,
        employeePosition: json['employeePosition'] as String?,
        actorName: json['actorName'] as String?,
        approvalMode: json['approvalMode'] as String?,
      );
}

class BookingEligibility {
  const BookingEligibility({
    required this.isEligible,
    required this.message,
    this.hasActiveRestriction = false,
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

  factory BookingEligibility.fromJson(Map<String, dynamic> json) =>
      BookingEligibility(
        isEligible: json['isEligible'] == true,
        message: (json['message'] ?? '').toString(),
        hasActiveRestriction: json['hasActiveRestriction'] == true,
        restrictionType: json['restrictionType'] as String?,
        reason: json['reason'] as String?,
        startAt: DateTimeX.parseUtc(json['startAt']?.toString()),
        endAt: DateTimeX.parseUtc(json['endAt']?.toString()),
        remainingDays:
            json['remainingDays'] == null ? null : _int(json['remainingDays']),
      );
}

class BookingDraft {
  const BookingDraft({
    required this.date,
    required this.mode,
    required this.rooms,
    required this.activityName,
    required this.purpose,
    required this.guestCount,
    this.startTime,
    this.endTime,
    this.startPeriod,
    this.endPeriod,
    this.note = '',
  });

  final DateTime date;
  final BookingMode mode;
  final ClockTime? startTime;
  final ClockTime? endTime;
  final Period? startPeriod;
  final Period? endPeriod;
  final List<AvailableRoom> rooms;
  final String activityName;
  final String purpose;
  final int guestCount;
  final String note;

  String get timeLabel {
    if (mode == BookingMode.period) {
      final start = startPeriod;
      final end = endPeriod;
      if (start == null || end == null) return 'Chưa chọn tiết';
      return '${start.name} – ${end.name}';
    }
    if (startTime == null || endTime == null) return 'Chưa chọn giờ';
    return '${startTime!.label} – ${endTime!.label}';
  }
}

class AvailabilityQuery {
  const AvailabilityQuery({
    required this.date,
    required this.mode,
    this.startTime,
    this.endTime,
    this.startPeriodId,
    this.endPeriodId,
  });

  final DateTime date;
  final BookingMode mode;
  final ClockTime? startTime;
  final ClockTime? endTime;
  final int? startPeriodId;
  final int? endPeriodId;

  @override
  bool operator ==(Object other) =>
      other is AvailabilityQuery &&
      other.date == date &&
      other.mode == mode &&
      other.startTime == startTime &&
      other.endTime == endTime &&
      other.startPeriodId == startPeriodId &&
      other.endPeriodId == endPeriodId;

  @override
  int get hashCode => Object.hash(date, mode, startTime, endTime,
      startPeriodId, endPeriodId);
}

int _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
