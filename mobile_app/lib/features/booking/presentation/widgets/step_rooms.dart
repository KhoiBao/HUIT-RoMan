import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/empty_state.dart';
import '../../../../core/widgets/loading_skeleton.dart';
import '../../application/booking_create_controller.dart';
import '../../domain/booking.dart';

class StepRooms extends ConsumerWidget {
  const StepRooms({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(bookingCreateControllerProvider);
    final controller = ref.read(bookingCreateControllerProvider.notifier);

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.xxl),
      children: [
        _TimeSummary(state: state, onEdit: () => controller.setStep(0)),
        const SizedBox(height: AppSpacing.xl),
        Row(
          children: [
            Expanded(
              child: Text(
                state.loadingRooms
                    ? 'Đang tìm phòng trống…'
                    : '${state.rooms.length} phòng còn trống',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.navy,
                ),
              ),
            ),
            if (state.selectedRoomIds.isNotEmpty)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  'Đã chọn ${state.selectedRoomIds.length}',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        if (state.notice.isNotEmpty) ...[
          _InfoBanner(message: state.notice),
          const SizedBox(height: AppSpacing.md),
        ],
        if (state.roomsError.isNotEmpty && state.rooms.isNotEmpty) ...[
          _InfoBanner(message: state.roomsError, danger: true),
          const SizedBox(height: AppSpacing.md),
        ],
        if (state.loadingRooms)
          ListSkeleton(count: 4, lines: 2)
        else if (state.roomsError.isNotEmpty && state.rooms.isEmpty)
          _RoomsError(
            message: state.roomsError,
            onRetry: controller.loadRooms,
          )
        else if (state.rooms.isEmpty)
          SizedBox(
            height: 320,
            child: EmptyState(
              icon: Icons.meeting_room_outlined,
              message: 'Không còn phòng trống',
              description:
                  'Khung giờ này đã được đặt kín. Hãy chọn khung giờ khác.',
              actionLabel: 'Đổi khung giờ',
              onAction: () => controller.setStep(0),
            ),
          )
        else
          for (final room in state.rooms)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: _RoomOption(
                room: room,
                selected: state.selectedRoomIds.contains(room.id),
                onTap: () => controller.toggleRoom(room.id),
              ),
            ),
      ],
    );
  }
}

class _TimeSummary extends StatelessWidget {
  const _TimeSummary({required this.state, required this.onEdit});
  final BookingCreateState state;
  final VoidCallback onEdit;

  String get _dateLabel {
    final d = state.date;
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

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
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.event_available_rounded,
                size: 21, color: AppColors.primary),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _dateLabel,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${state.timeLabel} · ${state.modeLabel}',
                  style: const TextStyle(fontSize: 12, color: AppColors.muted),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: onEdit,
            style: TextButton.styleFrom(minimumSize: const Size(48, 40)),
            child: const Text('Sửa', style: TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

class _RoomOption extends StatelessWidget {
  const _RoomOption({
    required this.room,
    required this.selected,
    required this.onTap,
  });

  final AvailableRoom room;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.primary.withValues(alpha: 0.05)
          : Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 160),
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.line,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : const Color(0xFFF3F7FB),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.meeting_room_rounded,
                  size: 21,
                  color: selected ? AppColors.primary : AppColors.muted,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      room.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      [
                        if (room.code.isNotEmpty) room.code,
                        if (room.location.isNotEmpty) room.location,
                        '${room.capacity} chỗ',
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11.5, color: AppColors.muted),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F9FF),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        room.roomTypeName,
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              AnimatedContainer(
                duration: MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : const Duration(milliseconds: 160),
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : Colors.transparent,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: selected ? AppColors.primary : AppColors.line,
                    width: 1.5,
                  ),
                ),
                child: selected
                    ? const Icon(Icons.check_rounded,
                        size: 15, color: Colors.white)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.message, this.danger = false});
  final String message;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? AppColors.danger : AppColors.gold;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            danger ? Icons.error_outline_rounded : Icons.info_outline_rounded,
            size: 17,
            color: color,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 12.5,
                color: color,
                height: 1.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoomsError extends StatelessWidget {
  const _RoomsError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          const Icon(Icons.wifi_off_rounded,
              size: 30, color: AppColors.danger),
          const SizedBox(height: AppSpacing.md),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontSize: 13, color: AppColors.navy, height: 1.5),
          ),
          const SizedBox(height: AppSpacing.md),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
