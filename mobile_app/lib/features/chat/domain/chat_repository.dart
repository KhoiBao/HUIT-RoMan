import 'chat_conversation.dart';
import 'chat_message.dart';

abstract class ChatRepository {
  Future<ChatConversation> myActive({String? initialMessage});
  Future<ChatConversation> newConversation({String? initialMessage});
  Future<ChatMessage> send(int conversationId, String content);
  Future<void> markRead(int conversationId);
  Future<void> close(int conversationId);
}
