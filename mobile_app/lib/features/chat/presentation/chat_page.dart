import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../../auth/application/auth_controller.dart';
import '../application/chat_controller.dart';
import '../domain/chat_conversation.dart';
import '../domain/chat_message.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

enum _ChatAction { newConversation, closeConversation }

class _ChatPageState extends ConsumerState<ChatPage> {
  final _input = TextEditingController();
  final _focus = FocusNode();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _focus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToBottom({bool animated = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
      final target = _scroll.position.maxScrollExtent;
      if (animated) {
        _scroll.animateTo(
          target,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
        );
      } else {
        _scroll.jumpTo(target);
      }
    });
  }

  Future<void> _send() async {
    final error = await ref.read(chatControllerProvider.notifier).send(_input.text);
    if (!mounted) return;
    if (error != null) {
      _toast(error, error: true);
      return;
    }
    _input.clear();
    _focus.requestFocus();
    _scrollToBottom();
  }

  Future<void> _startNew() async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Bắt đầu cuộc trò chuyện mới?',
      message:
          'Cuộc trò chuyện hiện tại sẽ được đóng lại và bộ phận hỗ trợ sẽ nhận được cuộc trò chuyện mới của bạn.',
      confirmLabel: 'Bắt đầu',
    );
    if (!confirmed || !mounted) return;
    final error =
        await ref.read(chatControllerProvider.notifier).startNewConversation();
    if (!mounted) return;
    if (error != null) {
      _toast(error, error: true);
    } else {
      _input.clear();
      _scrollToBottom(animated: false);
    }
  }

  Future<void> _closeConversation() async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Đóng cuộc trò chuyện?',
      message:
          'Bạn vẫn có thể mở cuộc trò chuyện mới nếu cần hỗ trợ thêm.',
      confirmLabel: 'Đóng',
      danger: true,
    );
    if (!confirmed || !mounted) return;
    final error =
        await ref.read(chatControllerProvider.notifier).closeConversation();
    if (!mounted) return;
    if (error != null) {
      _toast(error, error: true);
    } else {
      _toast('Đã đóng cuộc trò chuyện.');
    }
  }

  void _toast(String message, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: error ? AppColors.danger : AppColors.navy,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatControllerProvider);
    final controller = ref.read(chatControllerProvider.notifier);
    final myUserId = ref.watch(authControllerProvider.select((auth) => auth.user?.id));

    ref.listen(
      chatControllerProvider.select((value) => value.messages.length),
      (previous, next) {
        if (previous == null || next > previous) _scrollToBottom();
      },
    );

    final conversation = state.conversation;
    final isOpen = state.isOpen;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 64,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Hỗ trợ'),
            const SizedBox(height: 3),
            _StatusLine(
              conversation: conversation,
              connected: state.connected,
              loading: state.loading,
            ),
          ],
        ),
        actions: [
          if (conversation != null)
            PopupMenuButton<_ChatAction>(
              tooltip: 'Tùy chọn',
              icon: const Icon(Icons.more_horiz_rounded),
              onSelected: (action) {
                switch (action) {
                  case _ChatAction.newConversation:
                    _startNew();
                    break;
                  case _ChatAction.closeConversation:
                    _closeConversation();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: _ChatAction.newConversation,
                  child: Text('Cuộc trò chuyện mới'),
                ),
                if (isOpen)
                  const PopupMenuItem(
                    value: _ChatAction.closeConversation,
                    child: Text('Đóng cuộc trò chuyện'),
                  ),
              ],
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: state.loading
            ? const ListSkeleton(count: 4, lines: 2)
            : state.loadError != null && conversation == null
                ? ErrorView(
                    error: BusinessException(state.loadError!),
                    onRetry: controller.retry,
                  )
                : Column(
                    children: [
                      Expanded(
                        child: _MessageList(
                          messages: state.messages,
                          myUserId: myUserId,
                          scrollController: _scroll,
                        ),
                      ),
                      if (state.typing) const _TypingBar(),
                      if (isOpen)
                        _Composer(
                          controller: _input,
                          focusNode: _focus,
                          sending: state.sending,
                          onChanged: controller.onComposerChanged,
                          onSend: _send,
                        )
                      else
                        _ClosedBar(
                          restarting: state.restarting,
                          onStartNew: _startNew,
                        ),
                    ],
                  ),
      ),
    );
  }
}

class _StatusLine extends StatelessWidget {
  const _StatusLine({
    required this.conversation,
    required this.connected,
    required this.loading,
  });

  final ChatConversation? conversation;
  final bool connected;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final isOpen = conversation?.isOpen ?? false;
    final (color, label) = loading || conversation == null
        ? (AppColors.muted, 'Đang kết nối…')
        : isOpen
            ? connected
                ? (AppColors.success, 'Đang hoạt động')
                : (AppColors.gold, 'Đang kết nối lại…')
            : (AppColors.muted, 'Đã đóng');

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w500,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _MessageList extends StatelessWidget {
  const _MessageList({
    required this.messages,
    required this.myUserId,
    required this.scrollController,
  });

  final List<ChatMessage> messages;
  final int? myUserId;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    if (messages.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.all(AppSpacing.xl),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.12),
          const _IntroCard(),
        ],
      );
    }

    return ListView.builder(
      controller: scrollController,
      physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.md),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        final message = messages[index];
        final previous = index == 0 ? null : messages[index - 1];
        final showDay = previous == null ||
            previous.dayLabel != message.dayLabel;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (showDay) _DayDivider(label: message.dayLabel),
            _MessageBubble(message: message, myUserId: myUserId),
          ],
        );
      },
    );
  }
}

class _IntroCard extends StatelessWidget {
  const _IntroCard();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.support_agent_rounded,
              size: 30, color: AppColors.primary),
        ),
        const SizedBox(height: AppSpacing.lg),
        const Text(
          'Bắt đầu trò chuyện',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        const Text(
          'Gửi tin nhắn để bộ phận hỗ trợ giải đáp về đặt phòng, nhận phòng và sử dụng phòng.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: AppColors.muted, height: 1.5),
        ),
      ],
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04, curve: Curves.easeOutCubic);
  }
}

class _DayDivider extends StatelessWidget {
  const _DayDivider({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.line),
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 11, color: AppColors.muted),
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.myUserId});

  final ChatMessage message;
  final int? myUserId;

  @override
  Widget build(BuildContext context) {
    final mine = message.isMine(myUserId);
    final maxWidth = MediaQuery.sizeOf(context).width * 0.78;
    final sender = message.isFromStaff
        ? (message.senderName.isEmpty
            ? 'Hỗ trợ'
            : '${message.senderName} · Hỗ trợ')
        : message.senderName;

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: maxWidth),
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        decoration: BoxDecoration(
          color: mine ? AppColors.primary : Colors.white,
          border: mine ? null : Border.all(color: AppColors.line),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(mine ? 16 : 4),
            bottomRight: Radius.circular(mine ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!mine && sender.isNotEmpty) ...[
              Text(
                sender,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 3),
            ],
            Text(
              message.content,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: mine ? Colors.white : AppColors.navy,
              ),
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                message.timeLabel,
                style: TextStyle(
                  fontSize: 10.5,
                  color: mine
                      ? Colors.white.withValues(alpha: 0.75)
                      : AppColors.muted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypingBar extends StatelessWidget {
  const _TypingBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.sm),
      child: Row(
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.muted.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          const Text(
            'Đang soạn tin…',
            style: TextStyle(fontSize: 11.5, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.sending,
    required this.onChanged,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool sending;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.md, AppSpacing.md, AppSpacing.md),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                key: const ValueKey('chat-input'),
                controller: controller,
                focusNode: focusNode,
                minLines: 1,
                maxLines: 4,
                keyboardType: TextInputType.multiline,
                textCapitalization: TextCapitalization.sentences,
                onChanged: onChanged,
                style: const TextStyle(fontSize: 14, color: AppColors.navy),
                decoration: const InputDecoration(
                  hintText: 'Nhập tin nhắn…',
                  isDense: true,
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: controller,
              builder: (context, value, _) {
                final enabled = value.text.trim().isNotEmpty && !sending;
                return Material(
                  color: enabled
                      ? AppColors.primary
                      : AppColors.primary.withValues(alpha: 0.35),
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: enabled ? onSend : null,
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: sending
                          ? const Center(
                              child: SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.2,
                                  color: Colors.white,
                                ),
                              ),
                            )
                          : const Icon(Icons.send_rounded,
                              size: 20, color: Colors.white),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ClosedBar extends StatelessWidget {
  const _ClosedBar({required this.restarting, required this.onStartNew});

  final bool restarting;
  final VoidCallback onStartNew;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.lock_outline_rounded,
                    size: 16, color: AppColors.muted),
                const SizedBox(width: AppSpacing.sm),
                const Expanded(
                  child: Text(
                    'Cuộc trò chuyện đã đóng.',
                    style: TextStyle(fontSize: 12.5, color: AppColors.muted),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Bắt đầu cuộc trò chuyện mới',
              outlined: true,
              height: 46,
              loading: restarting,
              onPressed: onStartNew,
            ),
          ],
        ),
      ),
    );
  }
}
