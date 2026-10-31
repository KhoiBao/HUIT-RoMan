import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/chat/domain/chat_conversation.dart';
import 'package:roman_mobile/features/chat/domain/chat_message.dart';

void main() {
  test('maps a chat message payload from the API', () {
    final message = ChatMessage.fromJson({
      'id': 12,
      'chatConversationId': 4,
      'userId': 7,
      'senderName': 'Nguyễn Văn A',
      'senderCardCode': 'SV001',
      'senderRole': 'Student',
      'isFromStaff': false,
      'content': 'Cho em hỏi phòng 201 còn trống không?',
      'sentAt': '2026-10-31T03:15:00Z',
      'isRead': true,
    });

    expect(message.id, 12);
    expect(message.conversationId, 4);
    expect(message.userId, 7);
    expect(message.senderName, 'Nguyễn Văn A');
    expect(message.isFromStaff, isFalse);
    expect(message.content, contains('phòng 201'));
    expect(message.timeLabel, '10:15');
    expect(message.dayLabel, '31/10/2026');
    expect(message.isMine(7), isTrue);
    expect(message.isMine(8), isFalse);
  });

  test('maps an active conversation with its message history', () {
    final conversation = ChatConversation.fromJson({
      'id': 4,
      'userId': 7,
      'userName': 'Nguyễn Văn A',
      'userCardCode': 'SV001',
      'userEmail': 'sv001@huit.edu.vn',
      'departmentName': 'Khoa Công nghệ Thông tin',
      'userRole': 'Student',
      'startTime': '2026-10-31T02:00:00Z',
      'status': 'Open',
      'unreadCount': 2,
      'messages': [
        {
          'id': 1,
          'chatConversationId': 4,
          'userId': 7,
          'senderName': 'Nguyễn Văn A',
          'content': 'Xin chào',
          'sentAt': '2026-10-31T02:01:00Z',
        },
        {
          'id': 2,
          'chatConversationId': 4,
          'userId': 99,
          'senderName': 'Lê Thị B',
          'senderRole': 'Employee',
          'isFromStaff': true,
          'content': 'Chào bạn, mình có thể giúp gì?',
          'sentAt': '2026-10-31T02:02:00Z',
        },
      ],
    });

    expect(conversation.id, 4);
    expect(conversation.userName, 'Nguyễn Văn A');
    expect(conversation.departmentName, 'Khoa Công nghệ Thông tin');
    expect(conversation.isOpen, isTrue);
    expect(conversation.unreadCount, 2);
    expect(conversation.messages, hasLength(2));
    expect(conversation.messages.first.content, 'Xin chào');
    expect(conversation.messages.last.isFromStaff, isTrue);
    expect(conversation.copyWith(status: 'Closed').isOpen, isFalse);
  });

  test('maps a typing event', () {
    final event = ChatTypingEvent.fromJson({
      'conversationId': 4,
      'userId': 99,
      'userName': 'Lê Thị B',
      'isStaff': true,
      'isTyping': true,
    });

    expect(event.conversationId, 4);
    expect(event.userName, 'Lê Thị B');
    expect(event.isTyping, isTrue);
  });
}
