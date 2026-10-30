import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/date_time_x.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/status_badge.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/domain/session_user.dart';
import '../../notification/application/notifications_providers.dart';
import '../../rooms/application/rooms_providers.dart';
import '../../rooms/domain/room.dart';
import '../../schedule/application/schedule_providers.dart';
import '../../schedule/domain/schedule_entry.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final roomsAsync = ref.watch(roomsProvider);
    final schedulesAsync = ref.watch(todaySchedulesProvider);

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/booking/new'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 2,
        icon: const Icon(Icons.add_rounded),
        label: const Text(
          'Đặt phòng',
          style: TextStyle(fontFamily: 'BeVietnamPro', fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(roomsProvider);
            ref.invalidate(todaySchedulesProvider);
            await Future.wait([
              ref.read(roomsProvider.future),
              ref.read(todaySchedulesProvider.future),
            ]);
          },
          child: ListView(
            physics:
                const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 96),
            children: [
              _HomeHeader(user: user),
              const SizedBox(height: AppSpacing.xl),
              if (roomsAsync.isLoading || schedulesAsync.isLoading)
                _HomeSkeleton()
              else if (roomsAsync.hasError)
                SizedBox(
                  height: 320,
                  child: ErrorView(
                    error: roomsAsync.error,
                    onRetry: () => ref.invalidate(roomsProvider),
                  ),
                )
              else if (schedulesAsync.hasError)
                SizedBox(
                  height: 320,
                  child: ErrorView(
                    error: schedulesAsync.error,
                    onRetry: () => ref.invalidate(todaySchedulesProvider),
                  ),
                )
              else
                _HomeContent(
                  rooms: roomsAsync.value ?? const [],
                  schedules: schedulesAsync.value ?? const [],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeHeader extends ConsumerWidget {
  const _HomeHeader({required this.user});
  final SessionUser? user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadCountProvider).value ?? 0;
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Chào buổi sáng'
        : (hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối');
    return Row(
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: const BoxDecoration(
            color: AppColors.navy,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            user?.initials ?? '?',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                greeting,
                style: const TextStyle(fontSize: 12, color: AppColors.muted),
              ),
              const SizedBox(height: 2),
              Text(
                user?.fullName ?? 'Bạn',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.navy,
                ),
              ),
            ],
          ),
        ),
        _NotificationButton(unread: unread),
      ],
    );
  }
}

class _NotificationButton extends StatelessWidget {
  const _NotificationButton({required this.unread});
  final int unread;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(side: BorderSide(color: AppColors.line)),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () => context.push('/notifications'),
        child: SizedBox(
          width: 48,
          height: 48,
          child: Stack(
            alignment: Alignment.center,
            children: [
              const Icon(Icons.notifications_none_rounded,
                  size: 22, color: AppColors.navy),
              if (unread > 0)
                Positioned(
                  top: 9,
                  right: 9,
                  child: Container(
                    constraints:
                        const BoxConstraints(minWidth: 16, minHeight: 16),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: AppColors.danger,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      unread > 9 ? '9+' : '$unread',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        height: 1.1,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent({required this.rooms, required this.schedules});
  final List<Room> rooms;
  final List<ScheduleEntry> schedules;

  @override
  Widget build(BuildContext context) {
    final available = rooms.where((r) => r.status == RoomStatus.available).length;
    final inUse = rooms.where((r) => r.status == RoomStatus.inUse).length;
    final maintenance =
        rooms.where((r) => r.status == RoomStatus.maintenance).length;
    final now = DateTime.now().toUtc();
    final upcoming = schedules.where((s) => s.startAt.isAfter(now)).length;

    final types = <String, List<Room>>{};
    for (final room in rooms) {
      final key = room.roomTypeName.isEmpty ? 'Khác' : room.roomTypeName;
      types.putIfAbsent(key, () => []).add(room);
    }
    final upcomingEntries = schedules
        .where((s) => s.startAt.isAfter(now))
        .toList()
      ..sort((a, b) => a.startAt.compareTo(b.startAt));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _StatTile(
                label: 'Phòng trống',
                value: available,
                icon: Icons.meeting_room_outlined,
                color: AppColors.success,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _StatTile(
                label: 'Sắp sử dụng',
                value: upcoming,
                icon: Icons.upcoming_outlined,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _StatTile(
                label: 'Đang sử dụng',
                value: inUse,
                icon: Icons.people_alt_outlined,
                color: AppColors.gold,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _StatTile(
                label: 'Bảo trì',
                value: maintenance,
                icon: Icons.build_outlined,
                color: AppColors.danger,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        SectionHeader(
          title: 'Loại phòng',
          actionLabel: 'Xem tất cả',
          onAction: () => context.push('/rooms'),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: 132,
          child: types.isEmpty
              ? const EmptyState(
                  icon: Icons.meeting_room_outlined,
                  message: 'Chưa có phòng',
                )
              : ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  clipBehavior: Clip.none,
                  itemCount: types.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpacing.md),
                  itemBuilder: (context, index) {
                    final entry = types.entries.elementAt(index);
                    final typeRooms = entry.value;
                    final free =
                        typeRooms.where((r) => r.status == RoomStatus.available).length;
                    final room = typeRooms.first;
                    return _TypeCard(
                      name: entry.key,
                      free: free,
                      total: typeRooms.length,
                      capacity: room.capacity,
                      mode: room.bookingMode,
                      onTap: () => context
                          .push('/rooms?type=${Uri.encodeComponent(entry.key)}'),
                    );
                  },
                ),
        ),
        const SizedBox(height: AppSpacing.xl),
        const SectionHeader(title: 'Thao tác nhanh'),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: _QuickAction(
                icon: Icons.add_circle_outline_rounded,
                label: 'Đặt phòng',
                onTap: () => context.push('/booking/new'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _QuickAction(
                icon: Icons.calendar_month_outlined,
                label: 'Lịch phòng',
                onTap: () => context.go('/schedule'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _QuickAction(
                icon: Icons.receipt_long_outlined,
                label: 'Đơn của tôi',
                onTap: () => context.go('/bookings'),
              ),
            ),
          ],
        ),
        if (upcomingEntries.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.xl),
          const SectionHeader(title: 'Sắp diễn ra hôm nay'),
          const SizedBox(height: AppSpacing.sm),
          for (final entry in upcomingEntries.take(3))
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
                    width: 44,
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      children: [
                        Text(
                          DateTimeX.timeOf(entry.startAt),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                        Text(
                          DateTimeX.timeOf(entry.endAt),
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          entry.activityName.isEmpty
                              ? 'Đã đặt phòng'
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
                          '${entry.roomName} · ${entry.roomCode}',
                          style: const TextStyle(
                              fontSize: 11.5, color: AppColors.muted),
                        ),
                      ],
                    ),
                  ),
                  StatusBadge(label: entry.status, compact: true),
                ],
              ),
            ),
        ],
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, size: 19, color: color),
          ),
          const SizedBox(width: AppSpacing.md),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.navy,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 2),
              Text(label,
                  style:
                      const TextStyle(fontSize: 11.5, color: AppColors.muted)),
            ],
          ),
        ],
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  const _TypeCard({
    required this.name,
    required this.free,
    required this.total,
    required this.capacity,
    required this.mode,
    required this.onTap,
  });

  final String name;
  final int free;
  final int total;
  final int capacity;
  final String mode;
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
          width: 214,
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy,
                      ),
                    ),
                  ),
                  const Icon(Icons.arrow_outward_rounded,
                      size: 16, color: AppColors.muted),
                ],
              ),
              const SizedBox(height: 4),
              Text('$free/$total phòng trống',
                  style: const TextStyle(fontSize: 12, color: AppColors.success)),
              const Spacer(),
              Row(
                children: [
                  const Icon(Icons.groups_outlined,
                      size: 13, color: AppColors.muted),
                  const SizedBox(width: 4),
                  Text('$capacity chỗ',
                      style: const TextStyle(
                          fontSize: 11.5, color: AppColors.muted)),
                  const SizedBox(width: AppSpacing.md),
                  const Icon(Icons.schedule, size: 13, color: AppColors.muted),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(mode,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11.5, color: AppColors.muted)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.input),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            children: [
              Icon(icon, size: 21, color: AppColors.primary),
              const SizedBox(height: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.navy,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: const [
            Expanded(child: CardSkeleton(lines: 1)),
            SizedBox(width: AppSpacing.md),
            Expanded(child: CardSkeleton(lines: 1)),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: const [
            Expanded(child: CardSkeleton(lines: 1)),
            SizedBox(width: AppSpacing.md),
            Expanded(child: CardSkeleton(lines: 1)),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        const CardSkeleton(lines: 4),
      ],
    );
  }
}
