import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../auth/application/auth_controller.dart';
import '../data/chat_realtime.dart';
import '../domain/chat_conversation.dart';
import '../domain/chat_message.dart';
import 'chat_providers.dart';

class ChatState {
  const ChatState({
    this.conversation,
    this.messages = const [],
    this.loading = true,
    this.loadError,
    this.sending = false,
    this.closing = false,
    this.restarting = false,
    this.typing = false,
    this.connected = false,
  });

  final ChatConversation? conversation;
  final List<ChatMessage> messages;
  final bool loading;
  final String? loadError;
  final bool sending;
  final bool closing;
  final bool restarting;
  final bool typing;
  final bool connected;

  bool get isOpen => conversation?.isOpen ?? false;
  bool get busy => closing || restarting;

  ChatState copyWith({
    ChatConversation? conversation,
    List<ChatMessage>? messages,
    bool? loading,
    Object? loadError = _unset,
    bool? sending,
    bool? closing,
    bool? restarting,
    bool? typing,
    bool? connected,
  }) =>
      ChatState(
        conversation: conversation ?? this.conversation,
        messages: messages ?? this.messages,
        loading: loading ?? this.loading,
        loadError:
            identical(loadError, _unset) ? this.loadError : loadError as String?,
        sending: sending ?? this.sending,
        closing: closing ?? this.closing,
        restarting: restarting ?? this.restarting,
        typing: typing ?? this.typing,
        connected: connected ?? this.connected,
      );

  static const _unset = Object();
}

final chatControllerProvider =
    NotifierProvider.autoDispose<ChatController, ChatState>(
        ChatController.new);

class ChatController extends Notifier<ChatState> {
  ChatRealtime? _realtime;
  final _subscriptions = <StreamSubscription<Object?>>[];
  Timer? _typingTimer;
  bool _disposed = false;

  @override
  ChatState build() {
    ref.onDispose(() {
      _disposed = true;
      _typingTimer?.cancel();
      for (final subscription in _subscriptions) {
        subscription.cancel();
      }
      _realtime?.dispose();
    });
    Future.microtask(_load);
    return const ChatState();
  }

  int? get _myUserId => ref.read(authControllerProvider).user?.id;

  Future<void> _load() async {
    if (_disposed) return;
    state = state.copyWith(loading: true, loadError: null);
    try {
      final conversation = await ref.read(chatRepositoryProvider).myActive();
      if (_disposed) return;
      _bindRealtime();
      state = ChatState(
        conversation: conversation,
        messages: conversation.messages,
        loading: false,
      );
      if (conversation.id > 0) {
        await _realtime?.connect(conversation.id);
      }
    } on AppException catch (error) {
      if (_disposed) return;
      state = state.copyWith(loading: false, loadError: error.message);
    } catch (_) {
      if (_disposed) return;
      state = state.copyWith(
        loading: false,
        loadError: 'Không kết nối được bộ phận hỗ trợ. Vui lòng thử lại.',
      );
    }
  }

  Future<void> retry() => _load();

  void _bindRealtime() {
    if (_realtime != null) return;
    final realtime = ref.read(chatRealtimeProvider);
    _realtime = realtime;
    _subscriptions.add(realtime.messages.listen(_onMessage));
    _subscriptions.add(realtime.typing.listen(_onTyping));
    _subscriptions.add(realtime.closed.listen(_onClosed));
    _subscriptions.add(realtime.connected.listen((connected) {
      if (_disposed) return;
      state = state.copyWith(connected: connected);
    }));
  }

  void _onMessage(ChatMessage message) {
    if (_disposed) return;
    final conversation = state.conversation;
    if (conversation == null || message.conversationId != conversation.id) {
      return;
    }
    if (state.messages.any((item) => item.id == message.id)) return;
    state = state.copyWith(
      messages: [...state.messages, message],
      typing: false,
    );
  }

  void _onTyping(ChatTypingEvent event) {
    if (_disposed) return;
    final conversation = state.conversation;
    if (conversation == null || event.conversationId != conversation.id) {
      return;
    }
    if (event.userId == _myUserId) return;
    state = state.copyWith(typing: event.isTyping);
  }

  void _onClosed(int conversationId) {
    if (_disposed) return;
    final conversation = state.conversation;
    if (conversation == null || conversation.id != conversationId) return;
    state = state.copyWith(
      conversation: conversation.copyWith(status: 'Closed'),
      typing: false,
    );
  }

  void onComposerChanged(String text) {
    _typingTimer?.cancel();
    _realtime?.sendTyping(text.trim().isNotEmpty);
    _typingTimer = Timer(
      const Duration(seconds: 2),
      () => _realtime?.sendTyping(false),
    );
  }

  Future<String?> send(String text) async {
    final conversation = state.conversation;
    final content = text.trim();
    if (conversation == null || !conversation.isOpen) {
      return 'Cuộc trò chuyện đã đóng.';
    }
    if (content.isEmpty) return 'Vui lòng nhập tin nhắn.';
    if (state.sending) return 'Đang gửi tin nhắn trước đó.';

    state = state.copyWith(sending: true);
    _typingTimer?.cancel();
    _realtime?.sendTyping(false);
    try {
      final message =
          await ref.read(chatRepositoryProvider).send(conversation.id, content);
      if (_disposed) return null;
      state = state.copyWith(
        sending: false,
        messages: state.messages.any((item) => item.id == message.id)
            ? state.messages
            : [...state.messages, message],
      );
      return null;
    } on AppException catch (error) {
      if (_disposed) return error.message;
      state = state.copyWith(sending: false);
      return error.message;
    } catch (_) {
      if (_disposed) return 'Không gửi được tin nhắn. Vui lòng thử lại.';
      state = state.copyWith(sending: false);
      return 'Không gửi được tin nhắn. Vui lòng thử lại.';
    }
  }

  Future<String?> closeConversation() async {
    final conversation = state.conversation;
    if (conversation == null || state.closing) return null;
    state = state.copyWith(closing: true);
    try {
      await ref.read(chatRepositoryProvider).close(conversation.id);
      if (_disposed) return null;
      state = state.copyWith(
        closing: false,
        conversation: conversation.copyWith(status: 'Closed'),
        typing: false,
      );
      return null;
    } on AppException catch (error) {
      if (_disposed) return error.message;
      state = state.copyWith(closing: false);
      return error.message;
    } catch (_) {
      if (_disposed) return 'Không đóng được cuộc trò chuyện.';
      state = state.copyWith(closing: false);
      return 'Không đóng được cuộc trò chuyện.';
    }
  }

  Future<String?> startNewConversation() async {
    if (state.restarting) return null;
    _bindRealtime();
    state = state.copyWith(restarting: true);
    try {
      final conversation =
          await ref.read(chatRepositoryProvider).newConversation();
      if (_disposed) return null;
      state = ChatState(
        conversation: conversation,
        messages: conversation.messages,
        restarting: false,
        typing: false,
        connected: state.connected,
      );
      if (conversation.id > 0) {
        await _realtime?.connect(conversation.id);
      }
      return null;
    } on AppException catch (error) {
      if (_disposed) return error.message;
      state = state.copyWith(restarting: false);
      return error.message;
    } catch (_) {
      if (_disposed) return 'Không mở được cuộc trò chuyện mới.';
      state = state.copyWith(restarting: false);
      return 'Không mở được cuộc trò chuyện mới.';
    }
  }
}
