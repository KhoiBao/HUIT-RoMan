import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_time_x.dart';
import '../../domain/session_time_rules.dart';

class SessionCountdown extends StatefulWidget {
  const SessionCountdown({
    super.key,
    required this.endAt,
    this.onReminder,
  });

  final DateTime endAt;
  final void Function(int minutes)? onReminder;

  @override
  State<SessionCountdown> createState() => _SessionCountdownState();
}

class _SessionCountdownState extends State<SessionCountdown> {
  late Duration _remaining;
  late Timer _timer;
  late final Set<int> _fired = _passedThresholds();

  Set<int> _passedThresholds() {
    final now = DateTime.now().toUtc();
    return {
      for (final minutes in SessionTimeRules.reminderMinutes)
        if (!widget.endAt
            .toUtc()
            .subtract(Duration(minutes: minutes))
            .isAfter(now))
          minutes,
    };
  }

  @override
  void initState() {
    super.initState();
    _remaining = _calculate();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void didUpdateWidget(covariant SessionCountdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.endAt != widget.endAt) {
      _fired
        ..clear()
        ..addAll(_passedThresholds());
      _remaining = _calculate();
    }
  }

  Duration _calculate() =>
      widget.endAt.toUtc().difference(DateTime.now().toUtc());

  void _tick() {
    final remaining = _calculate();
    if (!mounted) return;
    setState(() => _remaining = remaining);
    if (remaining.isNegative) {
      _timer.cancel();
      return;
    }
    for (final minutes in SessionTimeRules.reminderMinutes) {
      if (!_fired.contains(minutes) &&
          remaining <= Duration(minutes: minutes)) {
        _fired.add(minutes);
        widget.onReminder?.call(minutes);
      }
    }
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final finished = _remaining.isNegative;
    final minutesLeft = _remaining.inMinutes;
    final tone = finished || minutesLeft < 15
        ? AppColors.danger
        : (minutesLeft < 30 ? AppColors.gold : AppColors.primary);
    final background = finished || minutesLeft < 15
        ? AppColors.danger.withValues(alpha: 0.08)
        : (minutesLeft < 30
            ? AppColors.gold.withValues(alpha: 0.09)
            : AppColors.primary.withValues(alpha: 0.06));

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: tone.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(
            finished ? Icons.timer_off_outlined : Icons.timer_outlined,
            size: 20,
            color: tone,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  finished ? 'Đã hết giờ sử dụng' : 'Thời gian còn lại',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: tone,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  finished
                      ? '00:00:00'
                      : SessionTimeRules.countdownLabel(_remaining),
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: tone,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
          Text(
            'Kết thúc ${DateTimeX.timeOf(widget.endAt)}',
            style: const TextStyle(fontSize: 11.5, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}
