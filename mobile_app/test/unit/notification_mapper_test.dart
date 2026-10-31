import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/notification/domain/app_notification.dart';

void main() {
  test('maps a notification payload', () {
    final item = AppNotification.fromJson({
      'id': 21,
      'title': 'Đơn đặt phòng đã được duyệt',
      'content': 'Đơn #45 tại Phòng 201 đã được duyệt.',
      'type': 1,
      'typeName': 'BookingStatus',
      'isRead': false,
      'sentAt': '2026-10-31T03:00:00Z',
    });

    expect(item.id, 21);
    expect(item.title, contains('được duyệt'));
    expect(item.content, contains('Phòng 201'));
    expect(item.type, 1);
    expect(item.typeName, 'BookingStatus');
    expect(item.isRead, isFalse);
    expect(item.sentAt, DateTime.utc(2026, 10, 31, 3));
  });

  test('defaults missing fields safely', () {
    final item = AppNotification.fromJson({
      'id': 5,
      'body': 'Nhắc nhở bắt đầu phiên sử dụng phòng.',
      'type': 2,
    });

    expect(item.title, '');
    expect(item.content, contains('Nhắc nhở'));
    expect(item.isRead, isFalse);
    expect(item.sentAt.isUtc, isTrue);
  });

  test('page reports whether more items remain', () {
    const page = NotificationPage(
      items: [],
      totalCount: 45,
      unreadCount: 3,
      page: 2,
      pageSize: 20,
    );

    expect(page.hasMore, isTrue);

    const last = NotificationPage(
      items: [],
      totalCount: 45,
      unreadCount: 0,
      page: 3,
      pageSize: 20,
    );

    expect(last.hasMore, isFalse);
  });
}
