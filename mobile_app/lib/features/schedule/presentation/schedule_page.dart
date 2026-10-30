import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/status_palette.dart';
import '../../../core/utils/date_time_x.dart';
import '../../../core/widgets/app_sheet.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/loading_skeleton.dart';
import '../../../core/widgets/status_badge.dart';
import '../../rooms/application/rooms_providers.dart';
import '../../rooms/domain/room.dart';
import '../application/schedule_providers.dart';
import '../domain/schedule_entry.dart';

class SchedulePage extends ConsumerStatefulWidget {
  const SchedulePage({super.key});

  @override
  ConsumerState<SchedulePage> createState() => _SchedulePageState();
}

class _SchedulePageState extends ConsumerState<SchedulePage> {
  DateTime _selected = DateTime.now();
  String? _building;

  String get _dateKey =>
      DateTime(_selected.year, _selected.month, _selected.day).toIso8601String();

  @override
  Widget build(BuildContext context) {
    final roomsAsync = ref.watch(roomsProvider);
    final schedulesAsync = ref.watch(daySchedulesProvider(_dateKey));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lịch phòng'),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            onPressed: () {
              ref.invalidate(roomsProvider);
              ref.invalidate(daySchedulesProvider(_dateKey));
            },
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/booking/new'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Đặt phòng',
            style: TextStyle(
                fontFamily: 'BeVietnamPro', fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            SizedBox(
              height: 78,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
                itemCount: 14,
                separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
                itemBuilder: (context, index) {
                  final day = DateTime.now().add(Duration(days: index));
                  final selected = day.year == _selected.year &&
                      day.month == _selected.month &&
                      day.day == _selected.day;
                  return _DayPill(
                    day: day,
                    selected: selected,
                    onTap: () => setState(() => _selected = day),
                  );
                },
              ),
            ),
            roomsAsync.maybeWhen(
              data: (rooms) {
                final buildings = rooms
                    .map((r) => r.building)
                    .where((e) => e.isNotEmpty)
                    .toSet()
                    .toList()
                  ..sort();
                if (buildings.isEmpty) return const SizedBox.shrink();
                return SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    children: [
                      _BuildingChip(
                        label: 'Tất cả tòa',
                        selected: _building == null,
                        onTap: () => setState(() => _building = null),
                      ),
                      for (final building in buildings) ...[
                        const SizedBox(width: AppSpacing.sm),
                        _BuildingChip(
                          label: building,
                          selected: _building == building,
                          onTap: () => setState(() => _building = building),
                        ),
                      ],
                    ],
                  ),
                );
              },
              orElse: () => const SizedBox.shrink(),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: (roomsAsync.isLoading || schedulesAsync.isLoading)
                  ? const ListSkeleton(count: 3, lines: 2)
                  : roomsAsync.hasError
                      ? ErrorView(
                          error: roomsAsync.error,
                          onRetry: () => ref.invalidate(roomsProvider),
                        )
                      : schedulesAsync.hasError
                          ? ErrorView(
                              error: schedulesAsync.error,
                              onRetry: () =>
                                  ref.invalidate(daySchedulesProvider(_dateKey)),
                            )
                          : _TimelineList(
                              rooms: (roomsAsync.value ?? const [])
                                  .where((room) =>
                                      _building == null ||
                                      room.building == _building)
                                  .toList(),
                              entries: schedulesAsync.value ?? const [],
                              date: _selected,
                              onRefresh: () async {
                                ref.invalidate(roomsProvider);
                                ref.invalidate(daySchedulesProvider(_dateKey));
                                await Future.wait([
                                  ref.read(roomsProvider.future),
                                  ref
                                      .read(daySchedulesProvider(_dateKey).future),
                                ]);
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayPill extends StatelessWidget {
  const _DayPill({
    required this.day,
    required this.selected,
    required this.onTap,
  });

  final DateTime day;
  final bool selected;
  final VoidCallback onTap;

  static const _short = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  @override
  Widget build(BuildContext context) {
    final isToday = DateTimeX.isTodayVn(
        DateTimeX.fromVietnamWallClock(DateTime(day.year, day.month, day.day, 12)));
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 56,
        decoration: BoxDecoration(
          color: selected ? AppColors.navy : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: selected ? AppColors.navy : AppColors.line),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _short[day.weekday % 7],
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white70 : AppColors.muted,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${day.day}',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : AppColors.navy,
              ),
            ),
            const SizedBox(height: 2),
            Container(
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                color: isToday
                    ? (selected ? Colors.white : AppColors.primary)
                    : Colors.transparent,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BuildingChip extends StatelessWidget {
  const _BuildingChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 13),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withValues(alpha: 0.10) : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.line),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? AppColors.primary : AppColors.muted,
          ),
        ),
      ),
    );
  }
}

class _TimelineList extends StatelessWidget {
  const _TimelineList({
    required this.rooms,
    required this.entries,
    required this.date,
    required this.onRefresh,
  });

  final List<Room> rooms;
  final List<ScheduleEntry> entries;
  final DateTime date;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    if (rooms.isEmpty) {
      return const EmptyState(
        icon: Icons.meeting_room_outlined,
        message: 'Không có phòng để hiển thị',
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, 96),
        physics:
            const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        itemCount: rooms.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (context, index) {
          final room = rooms[index];
          return _RoomTimeline(
            room: room,
            entries: entries.where((e) => e.roomId == room.id).toList(),
            date: date,
          );
        },
      ),
    );
  }
}

class _RoomTimeline extends StatelessWidget {
  const _RoomTimeline({
    required this.room,
    required this.entries,
    required this.date,
  });

  final Room room;
  final List<ScheduleEntry> entries;
  final DateTime date;

  static const hourHeight = 32.0;
  static const gridHeight = TimelineLayout.hours * hourHeight;

  @override
  Widget build(BuildContext context) {
    final isToday = DateTimeX.isTodayVn(
        DateTimeX.fromVietnamWallClock(DateTime(date.year, date.month, date.day, 12)));
    final nowVn = DateTimeX.toVietnam(DateTime.now().toUtc());
    final nowMinutes = (nowVn.hour - TimelineLayout.startHour) * 60 + nowVn.minute;
    final showNow = isToday && nowMinutes >= 0 && nowMinutes <= TimelineLayout.hours * 60;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
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
              Expanded(
                child: Text(
                  room.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
              ),
              Text(
                room.roomCode,
                style: const TextStyle(fontSize: 11, color: AppColors.muted),
              ),
              const SizedBox(width: AppSpacing.sm),
              StatusBadge(
                label: room.status.label,
                compact: true,
                icon: room.status == RoomStatus.maintenance
                    ? Icons.build_outlined
                    : null,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            height: gridHeight,
            child: Row(
              children: [
                SizedBox(
                  width: 30,
                  child: Stack(
                    children: [
                      for (var hour = TimelineLayout.startHour;
                          hour < TimelineLayout.endHour;
                          hour++)
                        Positioned(
                          top: (hour - TimelineLayout.startHour) * hourHeight - 5,
                          right: 6,
                          child: Text(
                            '$hour',
                            style: const TextStyle(
                                fontSize: 9, color: AppColors.muted),
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return Stack(
                        children: [
                          Positioned.fill(
                            child: GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTapUp: (details) {
                                final tapped = TimelineLayout.startHour +
                                    (details.localPosition.dy / hourHeight).floor();
                                final start = tapped.clamp(
                                    TimelineLayout.startHour,
                                    TimelineLayout.endHour - 1);
                                final dateKey = DateTimeX.dateOf(date);
                                context.push(
                                  '/booking/new?roomId=${room.id}&date=$dateKey'
                                  '&start=${start.toString().padLeft(2, '0')}:00'
                                  '&end=${(start + 1).toString().padLeft(2, '0')}:00',
                                );
                              },
                              child: CustomPaint(
                                painter: _GridPainter(),
                                size: Size(constraints.maxWidth, gridHeight),
                              ),
                            ),
                          ),
                          for (final entry in entries)
                            Positioned(
                              left: 0,
                              right: 4,
                              top: TimelineLayout.offset(
                                      entry.startAt, entry.endAt, hourHeight)
                                  .top,
                              height: TimelineLayout.offset(
                                      entry.startAt, entry.endAt, hourHeight)
                                  .height,
                              child: _EntryBlock(entry: entry),
                            ),
                          if (showNow)
                            Positioned(
                              left: 0,
                              right: 0,
                              top: nowMinutes * hourHeight / 60,
                              child: Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: const BoxDecoration(
                                      color: AppColors.danger,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  Expanded(
                                    child: Container(
                                      height: 1.2,
                                      color: AppColors.danger,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      );
                    },
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

class _EntryBlock extends StatelessWidget {
  const _EntryBlock({required this.entry});
  final ScheduleEntry entry;

  @override
  Widget build(BuildContext context) {
    final tone = StatusPalette.forLabel(entry.status);
    return GestureDetector(
      onTap: () => showAppSheet(
        context,
        builder: (ctx) => _EntrySheet(entry: entry),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: tone.background,
          borderRadius: BorderRadius.circular(7),
          border: Border(left: BorderSide(color: tone.foreground, width: 3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '${DateTimeX.timeOf(entry.startAt)} – ${DateTimeX.timeOf(entry.endAt)}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w600,
                color: tone.foreground,
              ),
            ),
            if (entry.activityName.isNotEmpty)
              Text(
                entry.activityName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  color: tone.foreground.withValues(alpha: 0.9),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = AppColors.line
      ..strokeWidth = 1;
    for (var hour = 0; hour <= TimelineLayout.hours; hour++) {
      final y = hour * _RoomTimeline.hourHeight;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), line);
    }
    // Lunch break shading keeps the midday gap readable.
    final lunch = Paint()..color = const Color(0xFFF7FAFD);
    canvas.drawRect(
      Rect.fromLTWH(
          0,
          (12 - TimelineLayout.startHour) * _RoomTimeline.hourHeight,
          size.width,
          _RoomTimeline.hourHeight),
      lunch,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _EntrySheet extends StatelessWidget {
  const _EntrySheet({required this.entry});
  final ScheduleEntry entry;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SheetHeader(title: 'Chi tiết lịch phòng'),
            Row(
              children: [
                Expanded(
                  child: Text(
                    entry.roomName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.navy,
                    ),
                  ),
                ),
                StatusBadge(label: entry.status),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            _row(Icons.schedule, 'Thời gian', entry.timeRange),
            _row(Icons.event_note_outlined, 'Hoạt động',
                entry.activityName.isEmpty ? '—' : entry.activityName),
            if (entry.purpose.isNotEmpty)
              _row(Icons.flag_outlined, 'Mục đích', entry.purpose),
            if (entry.bookedByName.isNotEmpty)
              _row(Icons.person_outline, 'Người đặt', entry.bookedByName),
            const SizedBox(height: AppSpacing.xl),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  context.push('/bookings/${entry.bookingId}');
                },
                child: const Text('Xem đơn đặt phòng'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppColors.muted),
          const SizedBox(width: AppSpacing.sm),
          SizedBox(
            width: 84,
            child: Text(label,
                style:
                    const TextStyle(fontSize: 12.5, color: AppColors.muted)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.navy, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
