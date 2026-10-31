import 'dart:async';

import 'package:signalr_netcore/signalr_client.dart';

import '../domain/chat_conversation.dart';
import '../domain/chat_message.dart';

typedef ChatTokenReader = Future<String?> Function();

class ChatRealtime {
  ChatRealtime(this._baseUrl, this._tokenReader);

  final String _baseUrl;
  final ChatTokenReader _tokenReader;

  final _messages = StreamController<ChatMessage>.broadcast();
  final _typing = StreamController<ChatTypingEvent>.broadcast();
  final _closed = StreamController<int>.broadcast();
  final _connected = StreamController<bool>.broadcast();

  HubConnection? _hub;
  int? _conversationId;
  bool _disposed = false;

  Stream<ChatMessage> get messages => _messages.stream;
  Stream<ChatTypingEvent> get typing => _typing.stream;
  Stream<int> get closed => _closed.stream;
  Stream<bool> get connected => _connected.stream;

  Future<void> connect(int conversationId) async {
    await _stopHub();
    if (_disposed) return;
    _conversationId = conversationId;

    final token = await _tokenReader();
    if (_disposed || token == null || token.isEmpty) return;

    final hub = HubConnectionBuilder()
        .withUrl(
          '$_baseUrl/hubs/chat',
          options: HttpConnectionOptions(
            accessTokenFactory: () async => token,
          ),
        )
        .withAutomaticReconnect()
        .build();
    _hub = hub;

    hub.on('ReceiveMessage', (args) {
      final json = _firstMap(args);
      if (json != null) _emit(_messages, ChatMessage.fromJson(json));
    });
    hub.on('UserTyping', (args) {
      final json = _firstMap(args);
      if (json != null) _emit(_typing, ChatTypingEvent.fromJson(json));
    });
    hub.on('ConversationClosed', (args) {
      final json = _firstMap(args);
      final id = json?['conversationId'];
      if (id is int) _emit(_closed, id);
    });
    hub.onclose(({error}) => _emit(_connected, false));

    try {
      await hub.start();
      if (_disposed) {
        await hub.stop();
        return;
      }
      _emit(_connected, true);
      await hub.invoke('JoinConversation', args: [conversationId]);
    } catch (_) {
      _emit(_connected, false);
    }
  }

  Future<void> sendTyping(bool isTyping) async {
    final hub = _hub;
    final id = _conversationId;
    if (hub == null || id == null) return;
    if (hub.state != HubConnectionState.Connected) return;
    try {
      await hub.send('SendTyping', args: [id, isTyping]);
    } catch (_) {
      // Typing state is best effort.
    }
  }

  Future<void> disconnect() async {
    final hub = _hub;
    final id = _conversationId;
    if (hub != null && id != null && hub.state == HubConnectionState.Connected) {
      try {
        await hub.invoke('LeaveConversation', args: [id]);
      } catch (_) {
        // Ignore failures while leaving; the connection is about to close.
      }
    }
    await _stopHub();
  }

  Future<void> _stopHub() async {
    final hub = _hub;
    _hub = null;
    _conversationId = null;
    if (hub == null) return;
    try {
      await hub.stop();
    } catch (_) {
      // The socket may already be closed.
    }
    _emit(_connected, false);
  }

  void dispose() {
    _disposed = true;
    _stopHub();
    _messages.close();
    _typing.close();
    _closed.close();
    _connected.close();
  }

  static Map<String, dynamic>? _firstMap(List<Object?>? args) {
    if (args == null || args.isEmpty) return null;
    final first = args.first;
    if (first is Map) return Map<String, dynamic>.from(first);
    return null;
  }

  void _emit<T>(StreamController<T> controller, T value) {
    if (_disposed || controller.isClosed) return;
    controller.add(value);
  }
}
