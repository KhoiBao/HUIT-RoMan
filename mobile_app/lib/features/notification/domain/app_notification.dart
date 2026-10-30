import '../../../core/utils/date_time_x.dart';

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.content,
    required this.type,
    required this.isRead,
    required this.sentAt,
    this.typeName = '',
  });

  final int id;
  final String title;
  final String content;
  final int type;
  final String typeName;
  final bool isRead;
  final DateTime sentAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: (json['id'] ?? 0) as int,
        title: (json['title'] ?? '').toString(),
        content: (json['content'] ?? json['body'] ?? '').toString(),
        type: (json['type'] ?? 0) as int,
        typeName: (json['typeName'] ?? '').toString(),
        isRead: json['isRead'] == true,
        sentAt: DateTimeX.parseUtc(json['sentAt']?.toString()) ??
            DateTime.now().toUtc(),
      );

  String get relativeTime => DateTimeX.relative(sentAt);
}

class NotificationPage {
  const NotificationPage({
    required this.items,
    required this.totalCount,
    required this.unreadCount,
    required this.page,
    required this.pageSize,
  });

  final List<AppNotification> items;
  final int totalCount;
  final int unreadCount;
  final int page;
  final int pageSize;

  bool get hasMore => page * pageSize < totalCount;
}
