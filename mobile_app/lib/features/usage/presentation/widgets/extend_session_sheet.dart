import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_time_x.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../booking/application/booking_providers.dart';
import '../../../booking/domain/booking.dart';
import '../../../booking/domain/clock_time.dart';
import '../../../rooms/application/rooms_providers.dart';
import '../../../rooms/domain/room.dart';
import '../../application/usage_providers.dart';
import '../../domain/usage_session.dart';

class ExtendSessionSheet extends ConsumerStatefulWidget {
  const ExtendSessionSheet({super.key, required this.session});

  final UsageSession session;

  @override
  ConsumerState<ExtendSessionSheet> createState() => _ExtendSessionSheetState();
}

class _ExtendSessionSheetState extends ConsumerState<ExtendSessionSheet> {
  static const _presets = [30, 45, 60, 90];

  int? _periodId;
  late DateTime _customEnd;
  int? _preset = 30;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _customEnd = widget.session.endAt.toUtc().add(const Duration(minutes: 30));
  }

  ClockTime get _currentEndClock {
    final local = DateTimeX.toVietnam(widget.session.endAt);
    return ClockTime(local.hour, local.minute);
  }

  List<Period> _periodOptions(List<Period> periods, Room room) {
    final currentEnd = _currentEndClock;
    final options = periods
        .where((period) =>
            period.roomTypeId == room.roomTypeId && period.end > currentEnd)
        .toList()
      ..sort((a, b) => a.end.compareTo(b.end));
    return options;
  }

  DateTime _periodEndInstant(Period period) {
    final startLocal = DateTimeX.toVietnam(widget.session.startAt);
    return DateTimeX.fromVietnamWallClock(DateTime(
      startLocal.year,
      startLocal.month,
      startLocal.day,
      period.end.hour,
      period.end.minute,
    ));
  }

  Future<void> _pickCustomEnd() async {
    final currentLocal = DateTimeX.toVietnam(_customEnd);
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(currentLocal),
      helpText: 'Chọn giờ kết thúc mới',
    );
    if (picked == null || !mounted) return;
    final endLocal = DateTimeX.toVietnam(widget.session.endAt);
    final candidate = DateTimeX.fromVietnamWallClock(DateTime(
      endLocal.year,
      endLocal.month,
      endLocal.day,
      picked.hour,
      picked.minute,
    ));
    setState(() {
      _preset = null;
      _customEnd = candidate;
      _error = null;
    });
  }

  Future<void> _submit({Period? selectedPeriod, required bool byPeriod}) async {
    if (_busy) return;
    final input = byPeriod
        ? ExtendUsageInput.byPeriod(selectedPeriod!.id)
        : ExtendUsageInput.byTime(_customEnd);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(usageRepositoryProvider).extend(widget.session.id, input);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on AppException catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Không gia hạn được phòng. Vui lòng thử lại.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final roomAsync = ref.watch(roomProvider(widget.session.roomId));

    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SheetHeader(
                title: 'Gia hạn phòng',
                subtitle:
                    'Chọn thời điểm kết thúc mới. Hệ thống sẽ kiểm tra trùng lịch trước khi áp dụng.',
              ),
              _SessionSummary(session: widget.session),
              const SizedBox(height: AppSpacing.lg),
              roomAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                  child: Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.2),
                    ),
                  ),
                ),
                error: (_, _) => Text(
                  'Không tải được thông tin phòng. Vui lòng đóng và thử lại.',
                  style: TextStyle(
                      fontSize: 12.5, color: AppColors.danger),
                ),
                data: (room) => room.isBookingByPeriod
                    ? _buildPeriodPicker(room)
                    : _buildHourlyPicker(),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _error!,
                  style:
                      const TextStyle(fontSize: 12, color: AppColors.danger),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPeriodPicker(Room room) {
    final periodsAsync = ref.watch(periodsProvider);
    return periodsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.2),
          ),
        ),
      ),
      error: (_, _) => const Text(
        'Không tải được danh sách tiết học.',
        style: TextStyle(fontSize: 12.5, color: AppColors.danger),
      ),
      data: (periods) {
        final options = _periodOptions(periods, room);
        if (options.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(AppRadius.input),
            ),
            child: const Text(
              'Không còn tiết học nào sau giờ kết thúc hiện tại.',
              style: TextStyle(fontSize: 12.5, color: AppColors.muted),
            ),
          );
        }
        final selected = options.firstWhere(
          (period) => period.id == _periodId,
          orElse: () => options.first,
        );
        final newEnd = _periodEndInstant(selected);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tiết kết thúc mới',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            for (final period in options)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: _PeriodOption(
                  period: period,
                  selected: period.id == selected.id,
                  onTap: () => setState(() {
                    _periodId = period.id;
                    _error = null;
                  }),
                ),
              ),
            _ExtensionSummary(
              newEnd: newEnd,
              previousEnd: widget.session.endAt,
            ),
            const SizedBox(height: AppSpacing.lg),
            AppButton(
              label: 'Xác nhận gia hạn',
              loading: _busy,
              onPressed:
                  _busy ? null : () => _submit(selectedPeriod: selected, byPeriod: true),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHourlyPicker() {
    final addedMinutes = _customEnd.difference(widget.session.endAt).inMinutes;
    final valid = addedMinutes > 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Gia hạn thêm',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            for (final minutes in _presets)
              _PresetChip(
                label: '+$minutes phút',
                selected: _preset == minutes && valid,
                onTap: () => setState(() {
                  _preset = minutes;
                  _customEnd = widget.session.endAt
                      .toUtc()
                      .add(Duration(minutes: minutes));
                  _error = null;
                }),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        _CustomTimeTile(
          label: 'Giờ kết thúc khác',
          value: DateTimeX.timeOf(_customEnd),
          onTap: _pickCustomEnd,
        ),
        const SizedBox(height: AppSpacing.md),
        _ExtensionSummary(
          newEnd: _customEnd,
          previousEnd: widget.session.endAt,
          invalid: !valid,
        ),
        const SizedBox(height: AppSpacing.lg),
        AppButton(
          label: 'Xác nhận gia hạn',
          loading: _busy,
          onPressed: _busy || !valid
              ? null
              : () => _submit(selectedPeriod: null, byPeriod: false),
        ),
      ],
    );
  }
}

class _SessionSummary extends StatelessWidget {
  const _SessionSummary({required this.session});

  final UsageSession session;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.bg,
        borderRadius: BorderRadius.circular(AppRadius.input),
      ),
      child: Row(
        children: [
          const Icon(Icons.meeting_room_outlined,
              size: 18, color: AppColors.primary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session.roomLabel,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.navy,
                  ),
                ),
                Text(
                  '${session.dateLabel} · ${session.timeRange}',
                  style:
                      const TextStyle(fontSize: 11.5, color: AppColors.muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PeriodOption extends StatelessWidget {
  const _PeriodOption({
    required this.period,
    required this.selected,
    required this.onTap,
  });

  final Period period;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.07)
              : Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.input),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.line,
            width: selected ? 1.4 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    period.name,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.navy,
                    ),
                  ),
                  Text(
                    period.range,
                    style:
                        const TextStyle(fontSize: 11.5, color: AppColors.muted),
                  ),
                ],
              ),
            ),
            Icon(
              selected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_off_rounded,
              size: 18,
              color: selected ? AppColors.primary : AppColors.muted,
            ),
          ],
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding:
            const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.line),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.navy,
          ),
        ),
      ),
    );
  }
}

class _CustomTimeTile extends StatelessWidget {
  const _CustomTimeTile({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.input),
          border: Border.all(color: AppColors.line),
        ),
        child: Row(
          children: [
            const Icon(Icons.schedule_rounded,
                size: 18, color: AppColors.muted),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 13, color: AppColors.navy),
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.edit_outlined, size: 16, color: AppColors.muted),
          ],
        ),
      ),
    );
  }
}

class _ExtensionSummary extends StatelessWidget {
  const _ExtensionSummary({
    required this.newEnd,
    required this.previousEnd,
    this.invalid = false,
  });

  final DateTime newEnd;
  final DateTime previousEnd;
  final bool invalid;

  @override
  Widget build(BuildContext context) {
    final added = newEnd.toUtc().difference(previousEnd.toUtc()).inMinutes;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: invalid
            ? AppColors.danger.withValues(alpha: 0.06)
            : AppColors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppRadius.input),
      ),
      child: Text(
        invalid
            ? 'Giờ kết thúc mới phải sau ${DateTimeX.timeOf(previousEnd)}.'
            : 'Kết thúc mới ${DateTimeX.timeOf(newEnd)} · thêm ${DateTimeX.durationLabel(Duration(minutes: added))}',
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w600,
          color: invalid ? AppColors.danger : AppColors.primary,
        ),
      ),
    );
  }
}
