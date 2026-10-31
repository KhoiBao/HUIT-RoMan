import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_time_x.dart';
import '../../../../core/widgets/loading_skeleton.dart';
import '../../application/booking_create_controller.dart';
import '../../domain/booking.dart';
import '../../domain/clock_time.dart';

const _presetSlots = <(ClockTime, ClockTime)>[
  (ClockTime(7, 0), ClockTime(9, 0)),
  (ClockTime(8, 0), ClockTime(10, 0)),
  (ClockTime(9, 0), ClockTime(11, 0)),
  (ClockTime(10, 0), ClockTime(12, 0)),
  (ClockTime(13, 0), ClockTime(15, 0)),
  (ClockTime(14, 0), ClockTime(16, 0)),
  (ClockTime(15, 0), ClockTime(17, 0)),
  (ClockTime(16, 0), ClockTime(18, 0)),
  (ClockTime(17, 0), ClockTime(19, 0)),
  (ClockTime(18, 0), ClockTime(20, 0)),
];

class StepTime extends ConsumerWidget {
  const StepTime({super.key});

  static const _weekdayShort = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(bookingCreateControllerProvider);
    final controller = ref.read(bookingCreateControllerProvider.notifier);

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.xxl),
      children: [
        _RuleHint(isStudent: state.isStudent),
        if (state.eligibility != null && !state.eligibility!.isEligible) ...[
          const SizedBox(height: AppSpacing.md),
          _RestrictionBanner(eligibility: state.eligibility!),
        ],
        const SizedBox(height: AppSpacing.xl),
        const _SectionLabel(
          icon: Icons.calendar_today_rounded,
          title: 'Ngày sử dụng',
        ),
        const SizedBox(height: AppSpacing.md),
        SizedBox(
          height: 78,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            clipBehavior: Clip.none,
            itemCount: 14,
            separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
            itemBuilder: (context, index) {
              final today = DateTimeX.toVietnam(DateTime.now().toUtc());
              final date = DateTime(today.year, today.month, today.day)
                  .add(Duration(days: index));
              final selected = DateTimeX.dateOf(date) ==
                  DateTimeX.dateOf(state.date);
              return _DatePill(
                weekday: _weekdayShort[date.weekday - 1],
                label: '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}',
                selected: selected,
                isToday: index == 0,
                onTap: () => controller.setDate(date),
              );
            },
          ),
        ),
        if (state.dateError.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.sm),
          _InlineError(message: state.dateError),
        ],
        const SizedBox(height: AppSpacing.xl),
        const _SectionLabel(
          icon: Icons.schedule_rounded,
          title: 'Hình thức đặt phòng',
        ),
        const SizedBox(height: AppSpacing.md),
        if (state.isStudent)
          const _LockedMode()
        else
          _ModeToggle(
            mode: state.mode,
            onChanged: controller.setMode,
          ),
        const SizedBox(height: AppSpacing.lg),
        if (state.mode == BookingMode.hourly)
          _HourlyPicker(state: state, controller: controller)
        else
          _PeriodPicker(state: state, controller: controller),
        if (state.timeError.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          _InlineError(message: state.timeError),
        ],
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }
}

class _RuleHint extends StatelessWidget {
  const _RuleHint({required this.isStudent});
  final bool isStudent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.14)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline_rounded,
              size: 18, color: AppColors.primary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              isStudent
                  ? 'Tối đa 2 giờ mỗi lượt, trong khung 07:00 – 20:00, đặt trước tối đa 14 ngày và không nhận Chủ Nhật.'
                  : 'Bạn có thể đặt theo tiết học hoặc theo khung giờ, trong khung phục vụ 07:00 – 20:00.',
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.navy,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RestrictionBanner extends StatelessWidget {
  const _RestrictionBanner({required this.eligibility});
  final BookingEligibility eligibility;

  @override
  Widget build(BuildContext context) {
    final message = eligibility.message.trim().isEmpty
        ? 'Tài khoản của bạn hiện đang bị hạn chế mượn phòng.'
        : eligibility.message;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.block_rounded, size: 18, color: AppColors.danger),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.danger,
                height: 1.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.icon, required this.title});
  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 17, color: AppColors.primary),
        const SizedBox(width: AppSpacing.sm),
        Text(
          title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.navy,
          ),
        ),
      ],
    );
  }
}

class _DatePill extends StatelessWidget {
  const _DatePill({
    required this.weekday,
    required this.label,
    required this.selected,
    required this.isToday,
    required this.onTap,
  });

  final String weekday;
  final String label;
  final bool selected;
  final bool isToday;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.input),
        child: AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 180),
          width: 64,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.line,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                isToday ? 'Hôm nay' : weekday,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white70 : AppColors.muted,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : AppColors.navy,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LockedMode extends StatelessWidget {
  const _LockedMode();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_clock_rounded,
              size: 18, color: AppColors.muted),
          const SizedBox(width: AppSpacing.sm),
          const Expanded(
            child: Text(
              'Sinh viên đặt phòng theo khung giờ',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.navy,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'Theo giờ',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeToggle extends StatelessWidget {
  const _ModeToggle({required this.mode, required this.onChanged});
  final BookingMode mode;
  final ValueChanged<BookingMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFE9EFF6),
        borderRadius: BorderRadius.circular(AppRadius.input),
      ),
      child: Row(
        children: [
          _ModePill(
            label: 'Theo khung giờ',
            selected: mode == BookingMode.hourly,
            onTap: () => onChanged(BookingMode.hourly),
          ),
          _ModePill(
            label: 'Theo tiết học',
            selected: mode == BookingMode.period,
            onTap: () => onChanged(BookingMode.period),
          ),
        ],
      ),
    );
  }
}

class _ModePill extends StatelessWidget {
  const _ModePill({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: selected ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: AnimatedContainer(
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : const Duration(milliseconds: 180),
            height: 46,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              boxShadow: selected ? appShadow : null,
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? AppColors.navy : AppColors.muted,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HourlyPicker extends StatelessWidget {
  const _HourlyPicker({required this.state, required this.controller});
  final BookingCreateState state;
  final BookingCreateController controller;

  Future<void> _pick(
    BuildContext context, {
    required ClockTime initial,
    required bool isStart,
  }) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: initial.hour, minute: initial.minute),
      helpText: isStart ? 'Chọn giờ bắt đầu' : 'Chọn giờ kết thúc',
      cancelText: 'Hủy',
      confirmText: 'Chọn',
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    final value = ClockTime(picked.hour, picked.minute);
    if (isStart) {
      controller.setStartTime(value);
    } else {
      controller.setEndTime(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTimeX.toVietnam(DateTime.now().toUtc());
    final isToday = DateTimeX.dateOf(state.date) == DateTimeX.dateOf(now);
    final presets = _presetSlots.where((slot) {
      if (!isToday) return true;
      return slot.$1.minutes > now.hour * 60 + now.minute;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _TimeCard(
                label: 'Bắt đầu',
                value: state.startTime,
                onTap: () => _pick(context,
                    initial: state.startTime, isStart: true),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              child: Icon(Icons.arrow_forward_rounded,
                  size: 18, color: AppColors.muted),
            ),
            Expanded(
              child: _TimeCard(
                label: 'Kết thúc',
                value: state.endTime,
                onTap: () =>
                    _pick(context, initial: state.endTime, isStart: false),
              ),
            ),
          ],
        ),
        if (presets.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          const Text(
            'Khung giờ gợi ý',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final slot in presets)
                _PresetChip(
                  label: '${slot.$1.label} – ${slot.$2.label}',
                  selected: state.startTime == slot.$1 &&
                      state.endTime == slot.$2,
                  onTap: () {
                    controller.setStartTime(slot.$1);
                    controller.setEndTime(slot.$2);
                  },
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _TimeCard extends StatelessWidget {
  const _TimeCard({
    required this.label,
    required this.value,
    required this.onTap,
  });
  final String label;
  final ClockTime value;
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11.5, color: AppColors.muted),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(
                    value.label,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.navy,
                      height: 1.15,
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.expand_more_rounded,
                      size: 18, color: AppColors.muted),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PresetChip extends StatelessWidget {
  const _PresetChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : Colors.white,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
                color: selected ? AppColors.primary : AppColors.line),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : AppColors.navy,
            ),
          ),
        ),
      ),
    );
  }
}

class _PeriodPicker extends StatelessWidget {
  const _PeriodPicker({required this.state, required this.controller});
  final BookingCreateState state;
  final BookingCreateController controller;

  Future<void> _pickPeriod(
    BuildContext context, {
    required List<Period> options,
    required bool isStart,
    Period? selected,
  }) async {
    final result = await showModalBottomSheet<Period>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.line,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xl, AppSpacing.lg, AppSpacing.xl, AppSpacing.sm),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  isStart ? 'Chọn tiết bắt đầu' : 'Chọn tiết kết thúc',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
              ),
            ),
            SizedBox(
              height: 340,
              child: ListView.builder(
                physics: const BouncingScrollPhysics(),
                itemCount: options.length,
                itemBuilder: (_, index) {
                  final period = options[index];
                  final isSelected = period.id == selected?.id;
                  return ListTile(
                    title: Text(
                      period.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navy,
                      ),
                    ),
                    subtitle: Text(
                      period.range,
                      style:
                          const TextStyle(fontSize: 12, color: AppColors.muted),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle_rounded,
                            color: AppColors.primary)
                        : null,
                    onTap: () => Navigator.of(ctx).pop(period),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpacing.md),
          ],
        ),
      ),
    );
    if (result == null) return;
    if (isStart) {
      controller.setStartPeriod(result);
    } else {
      controller.setEndPeriod(result);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (state.loadingPeriods && state.periodGroups.isEmpty) {
      return const CardSkeleton(lines: 2);
    }
    if (state.periodGroups.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.card),
          border: Border.all(color: AppColors.line),
        ),
        child: Column(
          children: [
            const Text(
              'Không tải được lịch tiết học.',
              style: TextStyle(fontSize: 13, color: AppColors.muted),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextButton(
              onPressed: controller.loadPeriods,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (state.periodGroups.length > 1) ...[
          const Text(
            'Bộ tiết theo loại phòng',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final group in state.periodGroups)
                _PresetChip(
                  label: group.roomTypeName,
                  selected: group.roomTypeId == state.periodRoomTypeId,
                  onTap: () => controller.selectPeriodGroup(group.roomTypeId),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
        _PeriodTile(
          label: 'Tiết bắt đầu',
          period: state.startPeriod,
          onTap: () => _pickPeriod(
            context,
            options: state.periodsInGroup,
            isStart: true,
            selected: state.startPeriod,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        _PeriodTile(
          label: 'Tiết kết thúc',
          period: state.endPeriod,
          onTap: () => _pickPeriod(
            context,
            options: state.endPeriodOptions,
            isStart: false,
            selected: state.endPeriod,
          ),
        ),
      ],
    );
  }
}

class _PeriodTile extends StatelessWidget {
  const _PeriodTile({
    required this.label,
    required this.period,
    required this.onTap,
  });
  final String label;
  final Period? period;
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
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: const Icon(Icons.menu_book_rounded,
                    size: 19, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                          fontSize: 11.5, color: AppColors.muted),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      period == null
                          ? 'Chọn tiết'
                          : '${period!.name} · ${period!.range}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navy,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.expand_more_rounded,
                  size: 20, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.error_outline_rounded,
            size: 15, color: AppColors.danger),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            message,
            style: const TextStyle(
              fontSize: 12.5,
              color: AppColors.danger,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }
}
