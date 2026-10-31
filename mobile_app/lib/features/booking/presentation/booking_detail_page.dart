import 'dart:async';

import 'package:flutter/material.dart' hide Feedback;
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/status_palette.dart';
import '../../../core/utils/date_time_x.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_sheet.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/status_badge.dart';
import '../../feedback/application/feedback_providers.dart';
import '../../feedback/domain/feedback.dart';
import '../../feedback/presentation/feedback_sheet.dart';
import '../../usage/application/usage_providers.dart';
import '../../usage/domain/session_time_rules.dart';
import '../../usage/domain/usage_session.dart';
import '../../usage/presentation/widgets/checkout_sheet.dart';
import '../../usage/presentation/widgets/extend_session_sheet.dart';
import '../../usage/presentation/widgets/session_countdown.dart';
import '../application/booking_providers.dart';
import '../domain/booking.dart';
import '../domain/booking_rules.dart';
import '../domain/booking_status.dart';
import 'widgets/cancel_booking_sheet.dart';

class BookingDetailPage extends ConsumerStatefulWidget {
  const BookingDetailPage({super.key, required this.bookingId});

  final int bookingId;

  @override
  ConsumerState<BookingDetailPage> createState() => _BookingDetailPageState();
}

class _BookingDetailPageState extends ConsumerState<BookingDetailPage> {
  bool _busy = false;
  final Set<String> _reminded = {};

  BookingRepositoryReader get _repo =>
      BookingRepositoryReader(ref, widget.bookingId);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncReminders());
  }

  void _refreshAll() {
    ref.invalidate(bookingByIdProvider(widget.bookingId));
    ref.invalidate(approvalHistoryProvider(widget.bookingId));
    ref.invalidate(bookingFeedbackProvider(widget.bookingId));
    ref.invalidate(myBookingsProvider);
    ref.invalidate(myUsageProvider);
    unawaited(_syncReminders());
  }

  Future<void> _syncReminders() async {
    try {
      final sessions = await ref.read(usageRepositoryProvider).my();
      await ref.read(sessionRemindersProvider).sync(sessions);
    } catch (_) {
      // Nhắc lịch là phụ trợ, không chặn màn hình chi tiết.
    }
  }

  void _onReminder(UsageSession? session, int minutes) {
    final endAt = session?.endAt;
    final key =
        '${session?.id ?? widget.bookingId}-${endAt?.millisecondsSinceEpoch}-$minutes';
    if (!_reminded.add(key)) return;
    final room = session?.roomLabel;
    _toast(room == null
        ? 'Còn $minutes phút sử dụng phòng. Vui lòng chuẩn bị trả phòng.'
        : 'Còn $minutes phút sử dụng $room. Vui lòng chuẩn bị trả phòng.');
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

  UsageSession? _sessionFor(List<UsageSession> sessions,
      {required bool inUse}) {
    for (final session in sessions) {
      if (session.bookingId != widget.bookingId) continue;
      if (inUse ? session.status.isInUse : session.status.isFinished) {
        return session;
      }
    }
    return null;
  }

  Future<void> _checkIn(Booking booking) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Nhận phòng ngay?',
      message:
          'Bạn xác nhận bắt đầu sử dụng ${booking.roomNames} từ ${booking.timeRange}.',
      confirmLabel: 'Nhận phòng',
    );
    if (!confirmed || !mounted) return;

    setState(() => _busy = true);
    try {
      await _repo.checkIn();
      _refreshAll();
      _toast('Nhận phòng thành công!');
    } on AppException catch (error) {
      _toast(error.message, error: true);
    } catch (_) {
      _toast('Không nhận phòng được. Vui lòng thử lại.', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancel(Booking booking) async {
    final request = await showAppSheet<CancelBookingRequest>(
      context,
      builder: (_) => CancelBookingSheet(roomLabel: booking.roomNames),
    );
    if (request == null || !mounted) return;

    final confirmed = await showConfirmDialog(
      context,
      title: 'Xác nhận hủy đơn?',
      message:
          'Đơn #${booking.id} sẽ bị hủy và không thể khôi phục. Bạn có chắc chắn?',
      confirmLabel: 'Hủy đơn',
      danger: true,
    );
    if (!confirmed || !mounted) return;

    setState(() => _busy = true);
    try {
      await _repo.cancel(reason: request.reason, reasonDetail: request.detail);
      _refreshAll();
      _toast('Đã hủy đơn đặt phòng');
    } on AppException catch (error) {
      _toast(error.message, error: true);
    } catch (_) {
      _toast('Không hủy được đơn. Vui lòng thử lại.', error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<List<UsageSession>> _loadSessions() async {
    try {
      return await ref.read(myUsageProvider.future);
    } catch (_) {
      return const [];
    }
  }

  Future<void> _checkOut() async {
    final sessions = await _loadSessions();
    if (!mounted) return;
    final session = _sessionFor(sessions, inUse: true);
    if (session == null) {
      _toast('Chưa tìm thấy phiên sử dụng phòng. Vui lòng thử lại sau.',
          error: true);
      return;
    }
    final result = await showAppSheet<bool>(
      context,
      builder: (_) => CheckoutSheet(session: session),
    );
    if (result == true) {
      _refreshAll();
      _toast('Đã trả phòng. Cảm ơn bạn đã sử dụng dịch vụ!');
    }
  }

  Future<void> _extend() async {
    final sessions = await _loadSessions();
    if (!mounted) return;
    final session = _sessionFor(sessions, inUse: true);
    if (session == null) {
      _toast('Chưa tìm thấy phiên sử dụng phòng. Vui lòng thử lại sau.',
          error: true);
      return;
    }
    final result = await showAppSheet<bool>(
      context,
      builder: (_) => ExtendSessionSheet(session: session),
    );
    if (result == true && mounted) {
      _refreshAll();
      _toast('Đã gia hạn phòng. Giờ kết thúc mới đã được cập nhật.');
    }
  }

  Future<void> _feedback(Booking booking) async {
    final sessions = await _loadSessions();
    if (!mounted) return;
    final session = _sessionFor(sessions, inUse: true) ??
        _sessionFor(sessions, inUse: false);
    final result = await showAppSheet<bool>(
      context,
      builder: (_) => FeedbackSheet(
        bookingId: booking.id,
        usageSessionId: session?.id,
        subtitle: booking.activityName,
      ),
    );
    if (result == true) {
      ref.invalidate(bookingFeedbackProvider(widget.bookingId));
      _toast('Cảm ơn bạn đã gửi đánh giá!');
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingAsync = ref.watch(bookingByIdProvider(widget.bookingId));
    final historyAsync =
        ref.watch(approvalHistoryProvider(widget.bookingId));
    final feedbackAsync =
        ref.watch(bookingFeedbackProvider(widget.bookingId));
    final sessions =
        ref.watch(myUsageProvider).value ?? const <UsageSession>[];
    final activeSession = _sessionFor(sessions, inUse: true);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết đơn'),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            onPressed: _refreshAll,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: bookingAsync.when(
        skipLoadingOnRefresh: true,
        loading: () => const ListSkeleton(count: 3, lines: 4),
        error: (error, _) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(bookingByIdProvider(widget.bookingId)),
        ),
        data: (booking) {
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              _refreshAll();
              await ref.read(bookingByIdProvider(widget.bookingId).future);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 120),
              children: [
                _StatusCard(booking: booking),
                if (booking.isInUse) ...[
                  const SizedBox(height: AppSpacing.md),
                  SessionCountdown(
                    endAt: activeSession?.endAt ?? booking.endAt,
                    onReminder: (minutes) =>
                        _onReminder(activeSession, minutes),
                  ),
                ],
                if (_windowNotice(booking) case final notice?) ...[
                  const SizedBox(height: AppSpacing.md),
                  notice,
                ],
                if (booking.rejectionReason.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  _NoticeBanner(
                    icon: Icons.block_rounded,
                    title: 'Đơn bị từ chối',
                    message: booking.rejectionReason,
                    background: StatusPalette.rejected.background,
                    foreground: StatusPalette.rejected.foreground,
                  ),
                ],
                if (booking.status == BookingStatus.cancelled) ...[
                  const SizedBox(height: AppSpacing.md),
                  _CancellationCard(booking: booking),
                ],
                const SizedBox(height: AppSpacing.xl),
                const SectionHeader(title: 'Thông tin đơn'),
                const SizedBox(height: AppSpacing.sm),
                _InfoCard(booking: booking),
                const SizedBox(height: AppSpacing.xl),
                const SectionHeader(title: 'Phòng đặt'),
                const SizedBox(height: AppSpacing.sm),
                for (final detail in booking.details)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: _DetailCard(detail: detail),
                  ),
                const SizedBox(height: AppSpacing.md),
                const SectionHeader(title: 'Lịch sử xử lý'),
                const SizedBox(height: AppSpacing.sm),
                _HistoryCard(historyAsync: historyAsync),
                if (booking.status == BookingStatus.completed ||
                    booking.isInUse) ...[
                  const SizedBox(height: AppSpacing.xl),
                  const SectionHeader(title: 'Đánh giá'),
                  const SizedBox(height: AppSpacing.sm),
                  _RatingSection(
                    endAt: activeSession?.endAt ?? booking.endAt,
                    alwaysUnlocked: booking.status == BookingStatus.completed,
                    feedbackAsync: feedbackAsync,
                    onRate: () => _feedback(booking),
                  ),
                ],
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: bookingAsync.maybeWhen(
        data: (booking) {
          final feedbackAsync = ref.watch(
              bookingFeedbackProvider(widget.bookingId));
          final canRate = booking.status == BookingStatus.completed &&
              feedbackAsync.hasValue &&
              feedbackAsync.value == null;
          Widget? primary;
          if (booking.canCheckIn) {
            primary = AppButton(
              label: 'Nhận phòng',
              icon: Icons.login_rounded,
              loading: _busy,
              onPressed: () => _checkIn(booking),
            );
          } else if (booking.isInUse) {
            primary = AppButton(
              label: 'Trả phòng',
              icon: Icons.logout_rounded,
              loading: _busy,
              onPressed: _checkOut,
            );
          } else if (canRate) {
            primary = AppButton(
              label: 'Đánh giá phòng',
              icon: Icons.star_outline_rounded,
              onPressed: () => _feedback(booking),
            );
          }

          Widget? secondary;
          if (booking.canCancel) {
            secondary = AppButton(
              label: 'Hủy đơn',
              outlined: true,
              danger: true,
              onPressed: _busy ? null : () => _cancel(booking),
            );
          } else if (booking.isInUse) {
            secondary = AppButton(
              label: 'Gia hạn',
              outlined: true,
              onPressed: _busy ? null : _extend,
            );
          }

          if (primary == null && secondary == null) return null;
          return SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.md),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: AppColors.line)),
              ),
              child: Row(
                children: [
                  if (secondary != null && primary != null) ...[
                    Expanded(flex: 2, child: secondary),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(flex: 3, child: primary),
                  ] else if (primary != null)
                    Expanded(child: primary)
                  else if (secondary != null)
                    Expanded(child: secondary),
                ],
              ),
            ),
          );
        },
        orElse: () => const SizedBox.shrink(),
      ),
    );
  }

  Widget? _windowNotice(Booking booking) {
    final isApproved = booking.status == BookingStatus.approved ||
        booking.status == BookingStatus.partiallyApproved;
    if (!isApproved || booking.isCheckedIn) return null;

    final state = booking.currentCheckInState;
    if (state == CheckInWindow.open) {
      return _NoticeBanner(
        icon: Icons.qr_code_scanner_rounded,
        title: 'Đã đến giờ nhận phòng',
        message:
            'Nhận phòng trước ${DateTimeX.timeOf(booking.startAt)} để giữ chỗ.',
        background: StatusPalette.approved.background,
        foreground: StatusPalette.approved.foreground,
      );
    }
    if (state == CheckInWindow.tooEarly) {
      return _NoticeBanner(
        icon: Icons.schedule_rounded,
        title: 'Chưa đến giờ nhận phòng',
        message: BookingRules.checkInHint(booking.startAt),
        background: StatusPalette.partial.background,
        foreground: StatusPalette.partial.foreground,
      );
    }
    return _NoticeBanner(
      icon: Icons.timer_off_outlined,
      title: 'Đã quá giờ nhận phòng',
      message: 'Đơn có thể bị tự động hủy do không nhận phòng đúng hạn.',
      background: StatusPalette.rejected.background,
      foreground: StatusPalette.rejected.foreground,
    );
  }
}

class BookingRepositoryReader {
  BookingRepositoryReader(this._ref, this._bookingId);

  final WidgetRef _ref;
  final int _bookingId;

  Future<void> checkIn() async {
    await _ref.read(bookingRepositoryProvider).checkIn(_bookingId);
  }

  Future<void> cancel({required String reason, String? reasonDetail}) async {
    await _ref
        .read(bookingRepositoryProvider)
        .cancel(_bookingId, reason: reason, reasonDetail: reasonDetail);
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '#${booking.id}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.muted,
                ),
              ),
              const Spacer(),
              StatusBadge(label: booking.status.label),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            booking.activityName.isEmpty ? 'Đơn đặt phòng' : booking.activityName,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w700,
              color: AppColors.navy,
              height: 1.35,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(height: 1, color: AppColors.line),
          const SizedBox(height: AppSpacing.md),
          _IconLine(
            icon: Icons.calendar_month_outlined,
            text: booking.dateLabel,
          ),
          const SizedBox(height: 6),
          _IconLine(
            icon: Icons.schedule_rounded,
            text: booking.timeRange,
          ),
          const SizedBox(height: 6),
          _IconLine(
            icon: Icons.meeting_room_outlined,
            text: booking.roomNames.isEmpty ? 'Chưa có phòng' : booking.roomNames,
          ),
          if (booking.isCheckedIn) ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md, vertical: 7),
              decoration: BoxDecoration(
                color: StatusPalette.inUse.background,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.how_to_reg_rounded,
                      size: 14, color: StatusPalette.inUse.foreground),
                  const SizedBox(width: 5),
                  Text(
                    'Đã nhận phòng lúc ${DateTimeX.timeOf(booking.checkedInAt!)}',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: StatusPalette.inUse.foreground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 240.ms).slideY(begin: 0.03);
  }
}

class _IconLine extends StatelessWidget {
  const _IconLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.muted),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
                fontSize: 13, color: AppColors.navy, height: 1.4),
          ),
        ),
      ],
    );
  }
}

class _NoticeBanner extends StatelessWidget {
  const _NoticeBanner({
    required this.icon,
    required this.title,
    required this.message,
    required this.background,
    required this.foreground,
  });

  final IconData icon;
  final String title;
  final String message;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.input),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: foreground),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: foreground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: foreground.withValues(alpha: 0.9),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CancellationCard extends StatelessWidget {
  const _CancellationCard({required this.booking});

  final Booking booking;

  String get _sourceLabel => switch ((booking.cancelSource ?? '').toUpperCase()) {
        'STUDENT' => 'Bạn đã hủy đơn',
        'AUTO' => 'Hệ thống tự động hủy',
        'STAFF' => 'Nhân sự đã hủy đơn',
        _ => 'Đơn đã bị hủy',
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: StatusPalette.cancelled.background,
        borderRadius: BorderRadius.circular(AppRadius.input),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.cancel_outlined,
                  size: 18, color: StatusPalette.cancelled.foreground),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  _sourceLabel,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: StatusPalette.cancelled.foreground,
                  ),
                ),
              ),
            ],
          ),
          if (booking.cancelReasonLabel != null) ...[
            const SizedBox(height: 6),
            Text(
              'Lý do: ${booking.cancelReasonLabel}',
              style: TextStyle(
                fontSize: 12.5,
                color: StatusPalette.cancelled.foreground,
              ),
            ),
          ],
          if ((booking.cancelReasonDetail ?? '').isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              booking.cancelReasonDetail!,
              style: TextStyle(
                fontSize: 12.5,
                color: StatusPalette.cancelled.foreground,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.booking});

  final Booking booking;

  static String? _approvalModeLabel(String? mode) =>
      switch ((mode ?? '').toUpperCase()) {
        'AUTO' => 'Duyệt tự động',
        'MANUAL' => 'Duyệt thủ công',
        _ => null,
      };

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[
      if (booking.purpose.isNotEmpty)
        _InfoRow(icon: Icons.flag_outlined, label: 'Mục đích', value: booking.purpose),
      _InfoRow(
        icon: Icons.groups_outlined,
        label: 'Số người',
        value: '${booking.guestCount} người',
      ),
      if (booking.note.isNotEmpty)
        _InfoRow(
          icon: Icons.sticky_note_2_outlined,
          label: 'Ghi chú',
          value: booking.note,
        ),
      _InfoRow(
        icon: Icons.send_outlined,
        label: 'Gửi lúc',
        value: DateTimeX.dayTimeOf(booking.requestedAt),
      ),
      if (booking.approvedByName != null || booking.approvedAt != null)
        _InfoRow(
          icon: Icons.verified_user_outlined,
          label: 'Người duyệt',
          value: [
            if (booking.approvedByName != null) booking.approvedByName!,
            if (_approvalModeLabel(booking.approvalMode) != null)
              _approvalModeLabel(booking.approvalMode)!,
          ].join(' · '),
        ),
      if (booking.approvedAt != null)
        _InfoRow(
          icon: Icons.event_available_outlined,
          label: 'Duyệt lúc',
          value: DateTimeX.dayTimeOf(booking.approvedAt!),
        ),
    ];

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            rows[i],
            if (i != rows.length - 1)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
                child: Divider(height: 1, color: AppColors.line),
              ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppColors.muted),
        const SizedBox(width: AppSpacing.sm),
        SizedBox(
          width: 84,
          child: Text(
            label,
            style: const TextStyle(fontSize: 12.5, color: AppColors.muted),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
                fontSize: 13, color: AppColors.navy, height: 1.4),
          ),
        ),
      ],
    );
  }
}

class _DetailCard extends StatelessWidget {
  const _DetailCard({required this.detail});

  final BookingDetailItem detail;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  detail.roomLabel,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
              ),
              StatusBadge(label: detail.status.label, compact: true),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            detail.roomCode,
            style: const TextStyle(fontSize: 11.5, color: AppColors.muted),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              const Icon(Icons.schedule_rounded,
                  size: 14, color: AppColors.muted),
              const SizedBox(width: 5),
              Text(
                detail.timeRange,
                style: const TextStyle(fontSize: 12, color: AppColors.muted),
              ),
              if (detail.periodLabel.isNotEmpty) ...[
                const SizedBox(width: AppSpacing.sm),
                Container(width: 3, height: 3, decoration: const BoxDecoration(color: AppColors.line, shape: BoxShape.circle)),
                const SizedBox(width: AppSpacing.sm),
                Flexible(
                  child: Text(
                    detail.periodLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        const TextStyle(fontSize: 12, color: AppColors.muted),
                  ),
                ),
              ],
            ],
          ),
          if (detail.rejectionReason.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Lý do từ chối: ${detail.rejectionReason}',
              style: const TextStyle(
                  fontSize: 12, color: AppColors.danger, height: 1.4),
            ),
          ],
        ],
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.historyAsync});

  final AsyncValue<List<ApprovalEvent>> historyAsync;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
      ),
      child: historyAsync.when(
        skipLoadingOnRefresh: true,
        loading: () => const Column(
          children: [
            SkeletonBox(height: 14),
            SizedBox(height: AppSpacing.md),
            SkeletonBox(height: 14),
          ],
        ),
        error: (_, _) => const Text(
          'Không tải được lịch sử xử lý.',
          style: TextStyle(fontSize: 12.5, color: AppColors.muted),
        ),
        data: (events) {
          if (events.isEmpty) {
            return const Row(
              children: [
                Icon(Icons.hourglass_empty_rounded,
                    size: 16, color: AppColors.muted),
                SizedBox(width: AppSpacing.sm),
                Text(
                  'Đơn đang chờ người duyệt xử lý.',
                  style: TextStyle(fontSize: 12.5, color: AppColors.muted),
                ),
              ],
            );
          }
          return Column(
            children: [
              for (var i = 0; i < events.length; i++)
                _HistoryItem(
                  event: events[i],
                  isLast: i == events.length - 1,
                ),
            ],
          );
        },
      ),
    );
  }
}

class _HistoryItem extends StatelessWidget {
  const _HistoryItem({required this.event, required this.isLast});

  final ApprovalEvent event;
  final bool isLast;

  static String? _modeLabel(String? mode) =>
      switch ((mode ?? '').toUpperCase()) {
        'AUTO' => 'Duyệt tự động',
        'MANUAL' => 'Duyệt thủ công',
        _ => null,
      };

  @override
  Widget build(BuildContext context) {
    final tone = StatusPalette.forLabel(event.bookingStatus.label);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 18,
            child: Column(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  margin: const EdgeInsets.only(top: 3),
                  decoration: BoxDecoration(
                    color: tone.foreground,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 1.5,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: AppColors.line,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        event.statusName.isEmpty
                            ? event.bookingStatus.label
                            : event.statusName,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: tone.foreground,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        DateTimeX.dayTimeOf(event.decidedAt),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.muted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      event.actorLabel,
                      if (_modeLabel(event.approvalMode) != null)
                        _modeLabel(event.approvalMode)!,
                    ].join(' · '),
                    style:
                        const TextStyle(fontSize: 11.5, color: AppColors.muted),
                  ),
                  if (event.comment.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      event.comment,
                      style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.navy,
                          height: 1.4),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RatingSection extends StatefulWidget {
  const _RatingSection({
    required this.endAt,
    required this.alwaysUnlocked,
    required this.feedbackAsync,
    required this.onRate,
  });

  final DateTime endAt;
  final bool alwaysUnlocked;
  final AsyncValue<Feedback?> feedbackAsync;
  final VoidCallback onRate;

  @override
  State<_RatingSection> createState() => _RatingSectionState();
}

class _RatingSectionState extends State<_RatingSection> {
  Timer? _timer;

  bool get _unlocked =>
      widget.alwaysUnlocked ||
      SessionTimeRules.canRate(widget.endAt, DateTime.now());

  @override
  void initState() {
    super.initState();
    _watchUnlock();
  }

  @override
  void didUpdateWidget(covariant _RatingSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.endAt != widget.endAt ||
        oldWidget.alwaysUnlocked != widget.alwaysUnlocked) {
      _watchUnlock();
    }
  }

  void _watchUnlock() {
    _timer?.cancel();
    if (_unlocked) return;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (SessionTimeRules.canRate(widget.endAt, DateTime.now())) {
        _timer?.cancel();
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.feedbackAsync.isLoading) {
      return const CardSkeleton(lines: 2);
    }
    final feedback = widget.feedbackAsync.value;
    if (feedback != null) return _FeedbackCard(feedback: feedback);
    if (!_unlocked) return _LockedRating(endAt: widget.endAt);
    return _FeedbackPrompt(onTap: widget.onRate);
  }
}

class _LockedRating extends StatelessWidget {
  const _LockedRating({required this.endAt});

  final DateTime endAt;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_outline_rounded, color: AppColors.muted),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Đánh giá phòng',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Mở đánh giá lúc ${SessionTimeRules.ratingUnlockLabel(endAt)} · 30 phút trước khi kết thúc',
                  style: const TextStyle(
                      fontSize: 11.5, color: AppColors.muted, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  const _FeedbackCard({required this.feedback});

  final Feedback feedback;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              for (var star = 1; star <= 5; star++)
                Icon(
                  star <= feedback.rating
                      ? Icons.star_rounded
                      : Icons.star_outline_rounded,
                  size: 18,
                  color: star <= feedback.rating
                      ? AppColors.gold
                      : AppColors.line,
                ),
              const Spacer(),
              Text(
                feedback.createdAtLabel,
                style:
                    const TextStyle(fontSize: 11, color: AppColors.muted),
              ),
            ],
          ),
          if (feedback.comment.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              feedback.comment,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.navy, height: 1.5),
            ),
          ],
        ],
      ),
    );
  }
}

class _FeedbackPrompt extends StatelessWidget {
  const _FeedbackPrompt({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.line),
          ),
          child: const Row(
            children: [
              Icon(Icons.star_outline_rounded, color: AppColors.gold),
              SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  'Chia sẻ trải nghiệm sử dụng phòng của bạn',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.navy,
                  ),
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }
}
