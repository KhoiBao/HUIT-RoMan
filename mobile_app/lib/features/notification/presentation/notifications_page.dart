import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/status_palette.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../application/notifications_providers.dart';
import '../domain/app_notification.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  final _scrollController = ScrollController();

  final List<AppNotification> _items = [];
  int _page = 1;
  int _total = 0;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  bool get _hasMore => _items.length < _total;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _load(reset: true);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore || _loading) return;
    if (_scrollController.position.extentAfter < 320) {
      _load(reset: false);
    }
  }

  Future<void> _load({required bool reset}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _error = null;
        _page = 1;
      });
    } else {
      setState(() => _loadingMore = true);
    }

    try {
      final result = await ref
          .read(notificationsApiProvider)
          .page(page: _page, pageSize: 20);
      if (!mounted) return;
      setState(() {
        if (reset) _items.clear();
        final existing = _items.map((e) => e.id).toSet();
        _items.addAll(result.items.where((e) => !existing.contains(e.id)));
        _total = result.totalCount;
        _page += 1;
        _loading = false;
        _loadingMore = false;
        _error = null;
      });
      ref.invalidate(unreadCountProvider);
    } on AppException catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadingMore = false;
        if (reset) _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadingMore = false;
        if (reset) _error = 'Không tải được thông báo.';
      });
    }
  }

  Future<void> _markRead(AppNotification item) async {
    if (item.isRead) return;
    try {
      await ref.read(notificationsApiProvider).markRead(item.id);
      if (!mounted) return;
      final index = _items.indexWhere((e) => e.id == item.id);
      if (index >= 0) {
        setState(() => _items[index] = AppNotification(
              id: item.id,
              title: item.title,
              content: item.content,
              type: item.type,
              typeName: item.typeName,
              isRead: true,
              sentAt: item.sentAt,
            ));
      }
      ref.invalidate(unreadCountProvider);
    } catch (_) {
      // Keep the item unread when the server call fails.
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ref.read(notificationsApiProvider).markAllRead();
      if (!mounted) return;
      setState(() {
        for (var i = 0; i < _items.length; i++) {
          final item = _items[i];
          if (!item.isRead) {
            _items[i] = AppNotification(
              id: item.id,
              title: item.title,
              content: item.content,
              type: item.type,
              typeName: item.typeName,
              isRead: true,
              sentAt: item.sentAt,
            );
          }
        }
      });
      ref.invalidate(unreadCountProvider);
      _toast('Đã đánh dấu tất cả là đã đọc');
    } on AppException catch (error) {
      _toast(error.message, error: true);
    } catch (_) {
      _toast('Không cập nhật được thông báo.', error: true);
    }
  }

  Future<bool> _delete(AppNotification item) async {
    try {
      await ref.read(notificationsApiProvider).delete(item.id);
      ref.invalidate(unreadCountProvider);
      return true;
    } on AppException catch (error) {
      _toast(error.message, error: true);
      return false;
    } catch (_) {
      _toast('Không xóa được thông báo.', error: true);
      return false;
    }
  }

  void _toast(String message, {bool error = false}) {
    if (!mounted) return;
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
    final hasUnread = _items.any((e) => !e.isRead);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          IconButton(
            tooltip: 'Đánh dấu tất cả đã đọc',
            onPressed: hasUnread ? _markAllRead : null,
            icon: const Icon(Icons.done_all_rounded),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: _loading
            ? const ListSkeleton(count: 5, lines: 2)
            : _error != null
                ? ErrorView(
                    error: BusinessException(_error!),
                    onRetry: () => _load(reset: true),
                  )
                : _items.isEmpty
                    ? RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () => _load(reset: true),
                        child: ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            SizedBox(
                                height: MediaQuery.sizeOf(context).height * 0.2),
                            const EmptyState(
                              icon: Icons.notifications_none_rounded,
                              message: 'Chưa có thông báo',
                              description:
                                  'Cập nhật về đơn đặt phòng và nhắc nhở sẽ xuất hiện tại đây.',
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () => _load(reset: true),
                        child: ListView.separated(
                          controller: _scrollController,
                          physics: const AlwaysScrollableScrollPhysics(
                              parent: BouncingScrollPhysics()),
                          padding: const EdgeInsets.fromLTRB(
                              AppSpacing.lg,
                              AppSpacing.md,
                              AppSpacing.lg,
                              96),
                          itemCount: _items.length + (_loadingMore ? 1 : 0),
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (context, index) {
                            if (index >= _items.length) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(
                                    vertical: AppSpacing.md),
                                child: Center(
                                  child: SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2.2),
                                  ),
                                ),
                              );
                            }
                            final item = _items[index];
                            return Dismissible(
                              key: ValueKey(item.id),
                              direction: DismissDirection.endToStart,
                              confirmDismiss: (_) => _delete(item),
                              onDismissed: (_) {
                                setState(() {
                                  _items.removeWhere((e) => e.id == item.id);
                                  _total = (_total - 1).clamp(0, 1 << 30);
                                });
                              },
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(
                                    right: AppSpacing.xl),
                                decoration: BoxDecoration(
                                  color: AppColors.danger,
                                  borderRadius:
                                      BorderRadius.circular(AppRadius.input),
                                ),
                                child: const Icon(Icons.delete_outline_rounded,
                                    color: Colors.white),
                              ),
                              child: _NotificationTile(
                                item: item,
                                onTap: () => _markRead(item),
                              ),
                            );
                          },
                        ),
                      ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final AppNotification item;
  final VoidCallback onTap;

  static IconData _iconFor(int type) => switch (type) {
        1 => Icons.event_available_outlined,
        2 => Icons.alarm_outlined,
        3 => Icons.timer_outlined,
        4 => Icons.gavel_outlined,
        _ => Icons.campaign_outlined,
      };

  static StatusTone _toneFor(int type) => switch (type) {
        1 => StatusPalette.approved,
        2 || 3 => StatusPalette.partial,
        4 => StatusPalette.rejected,
        _ => StatusPalette.neutral,
      };

  @override
  Widget build(BuildContext context) {
    final tone = _toneFor(item.type);
    return Material(
      color: item.isRead
          ? Colors.white
          : AppColors.primary.withValues(alpha: 0.035),
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.input),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.line),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: tone.background,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(_iconFor(item.type),
                    size: 19, color: tone.foreground),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.title.isEmpty ? 'Thông báo' : item.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: item.isRead
                                  ? FontWeight.w600
                                  : FontWeight.w700,
                              color: AppColors.navy,
                              height: 1.35,
                            ),
                          ),
                        ),
                        if (!item.isRead) ...[
                          const SizedBox(width: AppSpacing.sm),
                          Container(
                            width: 7,
                            height: 7,
                            margin: const EdgeInsets.only(top: 5),
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (item.content.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        item.content,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.muted,
                          height: 1.4,
                        ),
                      ),
                    ],
                    const SizedBox(height: 5),
                    Text(
                      item.relativeTime,
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
