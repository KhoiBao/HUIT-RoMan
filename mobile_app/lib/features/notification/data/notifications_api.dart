import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../domain/app_notification.dart';

class NotificationsApi {
  NotificationsApi(this._client);
  final ApiClient _client;

  Future<NotificationPage> page({int page = 1, int pageSize = 20}) async {
    final data = asMap(await _client.get('/api/Notifications', query: {
      'page': page,
      'pageSize': pageSize,
    }));
    return NotificationPage(
      items: asList(data).map(AppNotification.fromJson).toList(),
      totalCount: (data['totalCount'] ?? 0) as int,
      unreadCount: (data['unreadCount'] ?? 0) as int,
      page: (data['page'] ?? page) as int,
      pageSize: (data['pageSize'] ?? pageSize) as int,
    );
  }

  Future<int> unreadCount() async {
    final data = await _client.get('/api/Notifications/unread-count');
    if (data is int) return data;
    if (data is Map && data['count'] is int) return data['count'] as int;
    return 0;
  }

  Future<void> markRead(int id) => _client.put('/api/Notifications/$id/read');

  Future<void> markAllRead() => _client.put('/api/Notifications/read-all');

  Future<void> delete(int id) => _client.delete('/api/Notifications/$id');
}
