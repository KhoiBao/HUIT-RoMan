import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/feedback/domain/feedback.dart';
import 'package:roman_mobile/features/usage/domain/usage_session.dart';

void main() {
  test('normalises usage statuses', () {
    expect(UsageStatus.fromApi('Chờ nhận phòng'), UsageStatus.pendingCheckIn);
    expect(UsageStatus.fromApi('Đang sử dụng'), UsageStatus.inUse);
    expect(UsageStatus.fromApi('Hoàn thành'), UsageStatus.completed);
    expect(UsageStatus.fromApi('Đã hủy'), UsageStatus.cancelled);
    expect(UsageStatus.fromApi('in use'), UsageStatus.inUse);
    expect(UsageStatus.fromApi(null), UsageStatus.unknown);
  });

  test('maps a usage session payload and check-in window', () {
    final start = DateTime.now().toUtc().add(const Duration(minutes: 10));
    final end = start.add(const Duration(hours: 1));
    final session = UsageSession.fromJson({
      'id': 12,
      'status': 'Chờ nhận phòng',
      'confirmationCode': 'A1B2C3D4',
      'createdAt': start.toIso8601String(),
      'bookingDetailId': 33,
      'bookingId': 7,
      'activityName': 'Họp nhóm',
      'purpose': 'Thảo luận',
      'guestCount': 4,
      'roomId': 5,
      'roomName': 'Phòng 201',
      'roomCode': 'A201',
      'building': 'A',
      'floor': '2',
      'startAt': start.toIso8601String(),
      'endAt': end.toIso8601String(),
      'startPeriodId': 1,
      'startPeriodName': 'Tiết 1',
      'endPeriodId': 2,
      'endPeriodName': 'Tiết 2',
    });

    expect(session.roomLabel, 'Phòng 201');
    expect(session.location, 'A · Tầng 2');
    expect(session.status.isPending, isTrue);
    expect(session.canCheckIn, isTrue);
    expect(session.periodLabel, 'Tiết 1 – Tiết 2');
  });

  test('marks sessions too early to check in', () {
    final start = DateTime.now().toUtc().add(const Duration(hours: 2));
    final session = UsageSession.fromJson({
      'id': 1,
      'status': 'Chờ nhận phòng',
      'confirmationCode': 'ZZZ',
      'createdAt': start.toIso8601String(),
      'startAt': start.toIso8601String(),
      'endAt': start.add(const Duration(hours: 1)).toIso8601String(),
    });

    expect(session.canCheckIn, isFalse);
    expect(session.checkInHint, contains('15 phút'));
  });

  test('maps a feedback payload', () {
    final createdAt = DateTime.now().toUtc();
    final feedback = Feedback.fromJson({
      'id': 9,
      'rating': 4,
      'comment': 'Phòng sạch sẽ',
      'userName': 'Nguyễn Văn A',
      'roomName': 'Phòng 201',
      'createdAt': createdAt.toIso8601String(),
      'bookingId': 7,
      'usageSessionId': 12,
    });

    expect(feedback.id, 9);
    expect(feedback.rating, 4);
    expect(feedback.comment, 'Phòng sạch sẽ');
    expect(feedback.bookingId, 7);
    expect(feedback.usageSessionId, 12);
  });
}
