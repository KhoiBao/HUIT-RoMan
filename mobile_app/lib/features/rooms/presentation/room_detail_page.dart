import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/status_badge.dart';
import '../../schedule/application/schedule_providers.dart';
import '../application/rooms_providers.dart';
import '../domain/room.dart';

class RoomDetailPage extends ConsumerWidget {
  const RoomDetailPage({super.key, required this.roomId});

  final int roomId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomAsync = ref.watch(roomProvider(roomId));
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết phòng')),
      body: roomAsync.when(
        skipLoadingOnRefresh: true,
        loading: () => const Padding(
          padding: EdgeInsets.all(AppSpacing.lg),
          child: CardSkeleton(lines: 5),
        ),
        error: (error, _) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(roomProvider(roomId)),
        ),
        data: (room) => _RoomBody(room: room),
      ),
      bottomNavigationBar: roomAsync.maybeWhen(
        data: (room) => _BookingBar(room: room),
        orElse: () => null,
      ),
    );
  }
}

class _RoomBody extends ConsumerWidget {
  const _RoomBody({required this.room});
  final Room room;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final equipmentAsync = ref.watch(roomEquipmentsProvider(room.id));
    final today = DateTime.now();
    final key = DateTime(today.year, today.month, today.day).toIso8601String();
    final schedulesAsync = ref.watch(daySchedulesProvider(key));

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async {
        ref.invalidate(roomProvider(room.id));
        ref.invalidate(roomEquipmentsProvider(room.id));
        ref.invalidate(daySchedulesProvider(key));
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.xxl),
        children: [
          _RoomHero(room: room).animate().fadeIn(duration: 240.ms).slideY(begin: 0.04),
          const SizedBox(height: AppSpacing.xl),
          if (room.description.isNotEmpty) ...[
            const SectionHeader(title: 'Mô tả'),
            const SizedBox(height: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: AppColors.line),
              ),
              child: Text(
                room.description,
                style: const TextStyle(
                    fontSize: 13.5, height: 1.6, color: AppColors.navy),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
          const SectionHeader(title: 'Thiết bị'),
          const SizedBox(height: AppSpacing.sm),
          equipmentAsync.when(
            skipLoadingOnRefresh: true,
            loading: () => const CardSkeleton(lines: 2),
            error: (error, _) => _InlineError(
                message: error is Exception ? 'Không tải được thiết bị' : '$error'),
            data: (items) {
              if (items.isEmpty) {
                return const _InlineCard(
                  child: Text('Phòng chưa cập nhật danh sách thiết bị',
                      style: TextStyle(fontSize: 13, color: AppColors.muted)),
                );
              }
              return _InlineCard(
                child: Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    for (final item in items)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F8FC),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.chair_outlined,
                                size: 13, color: AppColors.muted),
                            const SizedBox(width: 5),
                            Text(
                              '${item.name} × ${item.quantity}',
                              style: const TextStyle(
                                  fontSize: 12, color: AppColors.navy),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          const SectionHeader(title: 'Lịch hôm nay'),
          const SizedBox(height: AppSpacing.sm),
          schedulesAsync.when(
            skipLoadingOnRefresh: true,
            loading: () => const CardSkeleton(lines: 2),
            error: (error, _) =>
                const _InlineCard(child: Text('Không tải được lịch phòng')),
            data: (entries) {
              final roomEntries =
                  entries.where((e) => e.roomId == room.id).toList()
                    ..sort((a, b) => a.startAt.compareTo(b.startAt));
              if (roomEntries.isEmpty) {
                return const _InlineCard(
                  child: Row(
                    children: [
                      Icon(Icons.free_breakfast_outlined,
                          size: 18, color: AppColors.success),
                      SizedBox(width: 8),
                      Text('Phòng trống cả ngày',
                          style: TextStyle(
                              fontSize: 13, color: AppColors.success)),
                    ],
                  ),
                );
              }
              return Column(
                children: [
                  for (final entry in roomEntries)
                    Container(
                      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppRadius.input),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 3,
                            height: 38,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  entry.activityName.isEmpty
                                      ? 'Đã đặt'
                                      : entry.activityName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.navy),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  entry.timeRange,
                                  style: const TextStyle(
                                      fontSize: 12, color: AppColors.muted),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(label: entry.status, compact: true),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _RoomHero extends StatelessWidget {
  const _RoomHero({required this.room});
  final Room room;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
        boxShadow: appShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.meeting_room_rounded,
                    size: 27, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      room.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      [room.roomCode, room.location]
                          .where((e) => e.isNotEmpty)
                          .join(' · '),
                      style: const TextStyle(
                          fontSize: 12.5, color: AppColors.muted),
                    ),
                  ],
                ),
              ),
              StatusBadge(label: room.status.label),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(height: 1, color: AppColors.line),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              _Info(
                  icon: Icons.groups_outlined,
                  label: 'Sức chứa',
                  value: '${room.capacity} người'),
              _Info(
                  icon: Icons.category_outlined,
                  label: 'Loại phòng',
                  value: room.roomTypeName.isEmpty ? '—' : room.roomTypeName),
              _Info(
                  icon: Icons.schedule,
                  label: 'Hình thức',
                  value: room.bookingMode),
            ],
          ),
        ],
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.muted),
          const SizedBox(height: 6),
          Text(label,
              style: const TextStyle(fontSize: 11, color: AppColors.muted)),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppColors.navy),
          ),
        ],
      ),
    );
  }
}

class _InlineCard extends StatelessWidget {
  const _InlineCard({required this.child});
  final Widget child;

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
      child: child,
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return _InlineCard(
      child: Text(message,
          style: const TextStyle(fontSize: 13, color: AppColors.muted)),
    );
  }
}

class _BookingBar extends StatelessWidget {
  const _BookingBar({required this.room});
  final Room room;

  @override
  Widget build(BuildContext context) {
    final disabled = room.status == RoomStatus.maintenance;
    return Container(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.md),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: SafeArea(
        top: false,
        child: AppButton(
          label: disabled ? 'Phòng đang bảo trì' : 'Đặt phòng này',
          icon: disabled ? Icons.block : Icons.add_circle_outline,
          onPressed: disabled
              ? null
              : () => context.push('/booking/new?roomId=${room.id}'),
        ),
      ),
    );
  }
}
