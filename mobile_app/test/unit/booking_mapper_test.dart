import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/booking/domain/booking.dart';
import 'package:roman_mobile/features/booking/domain/booking_rules.dart';
import 'package:roman_mobile/features/booking/domain/booking_status.dart';
import 'package:roman_mobile/features/booking/domain/clock_time.dart';

void main() {
  test('normalises every booking status (Vietnamese and English)', () {
    expect(BookingStatus.fromApi('Chờ duyệt'), BookingStatus.pending);
    expect(BookingStatus.fromApi('Pending'), BookingStatus.pending);
    expect(BookingStatus.fromApi('Đã duyệt'), BookingStatus.approved);
    expect(BookingStatus.fromApi('Approved'), BookingStatus.approved);
    expect(BookingStatus.fromApi('Duyệt một phần'), BookingStatus.partiallyApproved);
    expect(BookingStatus.fromApi('PartiallyApproved'),
        BookingStatus.partiallyApproved);
    expect(BookingStatus.fromApi('Từ chối'), BookingStatus.rejected);
    expect(BookingStatus.fromApi('Rejected'), BookingStatus.rejected);
    expect(BookingStatus.fromApi('Đã hủy'), BookingStatus.cancelled);
    expect(BookingStatus.fromApi('Cancelled'), BookingStatus.cancelled);
    expect(BookingStatus.fromApi('Đang sử dụng'), BookingStatus.inUse);
    expect(BookingStatus.fromApi('InUse'), BookingStatus.inUse);
    expect(BookingStatus.fromApi('Hoàn thành'), BookingStatus.completed);
    expect(BookingStatus.fromApi('Completed'), BookingStatus.completed);
    expect(BookingStatus.fromApi(null), BookingStatus.unknown);
  });

  test('parses booking payload with details and check-in window', () {
    final booking = Booking.fromJson({
      'id': 12,
      'activityName': 'Họp nhóm đồ án',
      'purpose': 'Thảo luận',
      'guestCount': 4,
      'status': 'Đã duyệt',
      'note': 'Mang laptop',
      'requestedAt': '2026-11-01T02:00:00Z',
      'createdAt': '2026-11-01T02:00:00Z',
      'checkedInAt': null,
      'approvedByName': 'Nguyễn Văn A',
      'checkInWindow': {
        'startAt': '2026-11-02T01:00:00Z',
        'opensAt': '2026-11-02T00:45:00Z',
        'deadlineAt': '2026-11-02T01:00:00Z',
        'state': 'NotOpen',
        'serverTime': '2026-11-01T02:00:00Z',
      },
      'details': [
        {
          'id': 31,
          'roomId': 5,
          'roomName': 'Phòng học nhóm 1',
          'roomCode': 'NH1',
          'startAt': '2026-11-02T01:00:00Z',
          'endAt': '2026-11-02T03:00:00Z',
          'startPeriodId': null,
          'endPeriodId': null,
          'guestCount': 4,
          'purpose': 'Thảo luận',
          'status': 'Đã duyệt',
          'rejectionReason': '',
          'createdAt': '2026-11-01T02:00:00Z',
        },
      ],
    });

    expect(booking.id, 12);
    expect(booking.status, BookingStatus.approved);
    expect(booking.details, hasLength(1));
    expect(booking.details.single.roomName, 'Phòng học nhóm 1');
    expect(booking.details.single.status, BookingStatus.approved);
    expect(booking.startAt, DateTime.utc(2026, 11, 2, 1));
    expect(booking.checkInWindow?.state, CheckInWindow.tooEarly);
    expect(booking.approvedByName, 'Nguyễn Văn A');
    expect(booking.isCheckedIn, isFalse);
  });

  test('computes start/end from active details only', () {
    final booking = Booking.fromJson({
      'id': 2,
      'activityName': 'X',
      'status': 'Duyệt một phần',
      'details': [
        {
          'id': 1,
          'roomId': 1,
          'roomName': 'A',
          'startAt': '2026-11-02T01:00:00Z',
          'endAt': '2026-11-02T02:00:00Z',
          'status': 'Từ chối',
        },
        {
          'id': 2,
          'roomId': 2,
          'roomName': 'B',
          'startAt': '2026-11-02T03:00:00Z',
          'endAt': '2026-11-02T05:00:00Z',
          'status': 'Đã duyệt',
        },
      ],
    });

    expect(booking.startAt, DateTime.utc(2026, 11, 2, 3));
    expect(booking.endAt, DateTime.utc(2026, 11, 2, 5));
    expect(booking.roomNames, 'B');
  });

  test('parses available room and period payloads', () {
    final room = AvailableRoom.fromJson({
      'roomId': 9,
      'roomName': 'Phòng thuyết trình 2',
      'roomCode': 'PT2',
      'building': 'A',
      'floor': '2',
      'capacity': 30,
      'roomTypeId': 3,
      'roomTypeName': 'Phòng thuyết trình',
      'isBookingByPeriod': false,
    });
    expect(room.id, 9);
    expect(room.roomTypeName, 'Phòng thuyết trình');

    final period = Period.fromJson({
      'id': 4,
      'name': 'Tiết 4',
      'startTime': '09:45:00',
      'endTime': '10:30:00',
      'roomTypeId': 1,
      'roomTypeName': 'Phòng lý thuyết',
    });
    expect(period.id, 4);
    expect(period.start, const ClockTime(9, 45));
    expect(period.roomTypeId, 1);
  });
}
