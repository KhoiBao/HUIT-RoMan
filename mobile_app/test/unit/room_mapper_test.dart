import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/rooms/domain/room.dart';

void main() {
  test('parses Vietnamese and English room status', () {
    expect(Room.fromJson({'id': 1, 'status': 'Đang sử dụng'}).status,
        RoomStatus.inUse);
    expect(Room.fromJson({'id': 2, 'status': 'Maintenance'}).status,
        RoomStatus.maintenance);
    expect(Room.fromJson({'id': 3, 'status': 'Trống'}).status,
        RoomStatus.available);
  });

  test('maps backend room fields', () {
    final room = Room.fromJson({
      'id': 5,
      'name': 'Phòng nhóm 101',
      'roomCode': 'A-101',
      'building': 'A',
      'floor': '1',
      'capacity': 40,
      'roomTypeName': 'Phòng nhóm',
      'isBookingByPeriod': true,
    });
    expect(room.location, 'A · Tầng 1');
    expect(room.bookingMode, 'Theo tiết');
    expect(room.capacity, 40);
  });
}
