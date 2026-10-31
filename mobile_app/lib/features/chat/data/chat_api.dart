import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../domain/chat_conversation.dart';
import '../domain/chat_message.dart';
import '../domain/chat_repository.dart';

class ChatApi implements ChatRepository {
  ChatApi(this._client);
  final ApiClient _client;

  @override
  Future<ChatConversation> myActive({String? initialMessage}) async {
    final data = await _client.get('/api/Chat/my-active', query: {
      if (initialMessage != null && initialMessage.trim().isNotEmpty)
        'initialMessage': initialMessage.trim(),
    });
    return ChatConversation.fromJson(asMap(data));
  }

  @override
  Future<ChatConversation> newConversation({String? initialMessage}) async {
    final message = initialMessage?.trim();
    final data = await _client.post('/api/Chat/new-conversation', body: {
      if (message != null && message.isNotEmpty) 'initialMessage': message,
    });
    return ChatConversation.fromJson(asMap(data));
  }

  @override
  Future<ChatMessage> send(int conversationId, String content) async {
    final data = await _client.post('/api/Chat/send', body: {
      'conversationId': conversationId,
      'content': content,
    });
    return ChatMessage.fromJson(asMap(data));
  }

  @override
  Future<void> markRead(int conversationId) =>
      _client.post('/api/Chat/conversations/$conversationId/read');

  @override
  Future<void> close(int conversationId) =>
      _client.post('/api/Chat/conversations/$conversationId/close');
}
