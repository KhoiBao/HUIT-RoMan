import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/status_palette.dart';
import '../../../../core/utils/date_time_x.dart';
import '../../../usage/application/usage_providers.dart';
import '../../../usage/domain/usage_session.dart';

class ReadySessionBanner extends ConsumerWidget {
  const ReadySessionBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(myUsageProvider).value ?? const <UsageSession>[];

    UsageSession? session;
    var readyToCheckIn = false;
    for (final candidate in sessions) {
      if (candidate.canCheckIn) {
        session = candidate;
        readyToCheckIn = true;
        break;
      }
    }
    if (session == null) {
      for (final candidate in sessions) {
        if (candidate.status.isInUse) {
          session = candidate;
          break;
        }
      }
    }
    if (session == null) return const SizedBox.shrink();
    final active = session;

    final tone = readyToCheckIn ? StatusPalette.approved : StatusPalette.inUse;
    final title =
        readyToCheckIn ? 'Đến giờ nhận phòng' : 'Bạn đang sử dụng phòng';
    final action = readyToCheckIn ? 'Nhận phòng' : 'Trả phòng';

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.card),
          onTap: () => context.push('/bookings/${active.bookingId}'),
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.card),
              border: Border(left: BorderSide(color: tone.foreground, width: 4)),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: tone.background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    readyToCheckIn
                        ? Icons.qr_code_scanner_rounded
                        : Icons.meeting_room_outlined,
                    size: 20,
                    color: tone.foreground,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: tone.foreground,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${active.roomLabel} · ${DateTimeX.timeOf(active.startAt)} – ${DateTimeX.timeOf(active.endAt)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Row(
                  children: [
                    Text(
                      action,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: tone.foreground,
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded,
                        size: 18, color: tone.foreground),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 260.ms).slideY(begin: 0.04);
  }
}
