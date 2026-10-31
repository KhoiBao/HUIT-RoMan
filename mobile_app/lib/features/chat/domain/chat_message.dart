import '../../../core/utils/date_time_x.dart';

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.userId,
    required this.senderName,
    required this.senderCardCode,
    required this.isFromStaff,
    required this.content,
    required this.sentAt,
  });

  final int id;
  final int conversationId;
  final int userId;
  final String senderName;
  final String senderCardCode;
  final bool isFromStaff;
  final String content;
  final DateTime sentAt;

  bool isMine(int? currentUserId) => userId == currentUserId;

  String get timeLabel => DateTimeX.timeOf(sentAt);
  String get dayLabel => DateTimeX.dayOf(sentAt);

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: (json['id'] ?? 0) as int,
        conversationId: (json['chatConversationId'] ?? 0) as int,
        userId: (json['userId'] ?? 0) as int,
        senderName: (json['senderName'] ?? '').toString(),
        senderCardCode: (json['senderCardCode'] ?? '').toString(),
        isFromStaff: json['isFromStaff'] == true,
        content: (json['content'] ?? '').toString(),
        sentAt: DateTimeX.parseUtc(json['sentAt']?.toString()) ??
            DateTime.now().toUtc(),
      );
}
