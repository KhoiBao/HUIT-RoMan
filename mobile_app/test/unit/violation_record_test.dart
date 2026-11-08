import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/history/domain/violation_record.dart';

void main() {
  test('parses a full violation record from API json', () {
    final record = ViolationRecord.fromJson(const {
      'id': 12,
      'code': 'VP-0012',
      'incidentTime': '2026-11-05T09:30:00Z',
      'description': 'Để đồ đạc lộn xộn khi trả phòng',
      'severity': 2,
      'severityText': 'Trung bình',
      'penaltyApplied': 'Cảnh cáo',
      'status': 'Đã xử lý',
      'usageSessionId': 30,
      'roomId': 5,
      'roomCode': 'B204',
      'roomName': 'Phòng tự học B204',
      'violationTypeId': 3,
      'violationTypeName': 'Vệ sinh phòng',
      'isRestricted': true,
      'restrictDays': 7,
      'restrictionEndAt': '2026-11-15T00:00:00Z',
    });

    expect(record.id, 12);
    expect(record.code, 'VP-0012');
    expect(record.incidentTime, isNotNull);
    expect(record.description, 'Để đồ đạc lộn xộn khi trả phòng');
    expect(record.severityText, 'Trung bình');
    expect(record.penaltyApplied, 'Cảnh cáo');
    expect(record.status, ViolationStatus.resolved);
    expect(record.violationTypeName, 'Vệ sinh phòng');
    expect(record.roomName, 'Phòng tự học B204');
    expect(record.isRestricted, isTrue);
    expect(record.restrictDays, 7);
    expect(record.restrictionEndAt, isNotNull);
  });

  test('maps status strings to enum', () {
    expect(ViolationStatus.fromApi('Chờ xử lý'), ViolationStatus.pending);
    expect(ViolationStatus.fromApi('Đang xử lý'), ViolationStatus.processing);
    expect(ViolationStatus.fromApi('Đã xử lý'), ViolationStatus.resolved);
    expect(ViolationStatus.fromApi('Đã nộp phạt'), ViolationStatus.finePaid);
    expect(ViolationStatus.fromApi('Hủy bỏ'), ViolationStatus.cancelled);
    expect(ViolationStatus.fromApi('xyz'), ViolationStatus.unknown);
  });

  test('tolerates missing room and restriction fields', () {
    final record = ViolationRecord.fromJson(const {
      'id': 3,
      'code': 'VP-0003',
      'incidentTime': '2026-11-01T08:00:00Z',
      'description': '',
      'severity': 1,
      'severityText': 'Nhẹ',
      'penaltyApplied': '',
      'status': 'Chờ xử lý',
      'roomId': null,
      'roomCode': null,
      'roomName': null,
      'isRestricted': false,
      'restrictDays': 0,
      'restrictionEndAt': null,
    });

    expect(record.roomName, isNull);
    expect(record.isRestricted, isFalse);
    expect(record.restrictionEndAt, isNull);
    expect(record.roomLabel, isNull);
  });
}

