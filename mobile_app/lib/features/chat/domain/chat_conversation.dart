import '../../../core/network/api_envelope.dart';
import '../../../core/utils/date_time_x.dart';
import 'chat_message.dart';

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userCardCode,
    required this.status,
    required this.messages,
    this.departmentName,
    this.userRole,
    this.startTime,
    this.endTime,
    this.lastMessageContent,
    this.lastMessageTime,
    this.unreadCount = 0,
  });

  final int id;
  final int userId;
  final String userName;
  final String userCardCode;
  final String? departmentName;
  final String? userRole;
  final DateTime? startTime;
  final DateTime? endTime;
  final String status;
  final String? lastMessageContent;
  final DateTime? lastMessageTime;
  final int unreadCount;
  final List<ChatMessage> messages;

  bool get isOpen => status.trim().toLowerCase() == 'open';
  bool get hasMessages => messages.isNotEmpty;

  String get startedLabel =>
      startTime == null ? '' : 'Bắt đầu ${DateTimeX.dayTimeOf(startTime!)}';

  ChatConversation copyWith({String? status}) => ChatConversation(
        id: id,
        userId: userId,
        userName: userName,
        userCardCode: userCardCode,
        departmentName: departmentName,
        userRole: userRole,
        startTime: startTime,
        endTime: endTime,
        status: status ?? this.status,
        lastMessageContent: lastMessageContent,
        lastMessageTime: lastMessageTime,
        unreadCount: unreadCount,
        messages: messages,
      );

  factory ChatConversation.fromJson(Map<String, dynamic> json) =>
      ChatConversation(
        id: (json['id'] ?? 0) as int,
        userId: (json['userId'] ?? 0) as int,
        userName: (json['userName'] ?? '').toString(),
        userCardCode: (json['userCardCode'] ?? '').toString(),
        departmentName: json['departmentName'] as String?,
        userRole: json['userRole'] as String?,
        startTime: DateTimeX.parseUtc(json['startTime']?.toString()),
        endTime: DateTimeX.parseUtc(json['endTime']?.toString()),
        status: (json['status'] ?? 'Open').toString(),
        lastMessageContent: json['lastMessageContent'] as String?,
        lastMessageTime: DateTimeX.parseUtc(json['lastMessageTime']?.toString()),
        unreadCount: (json['unreadCount'] ?? 0) as int,
        messages: asList(json['messages']).map(ChatMessage.fromJson).toList(),
      );
}

class ChatTypingEvent {
  const ChatTypingEvent({
    required this.conversationId,
    required this.userId,
    required this.userName,
    required this.isTyping,
  });

  final int conversationId;
  final int userId;
  final String userName;
  final bool isTyping;

  factory ChatTypingEvent.fromJson(Map<String, dynamic> json) =>
      ChatTypingEvent(
        conversationId: (json['conversationId'] ?? 0) as int,
        userId: (json['userId'] ?? 0) as int,
        userName: (json['userName'] ?? '').toString(),
        isTyping: json['isTyping'] == true,
      );
}
