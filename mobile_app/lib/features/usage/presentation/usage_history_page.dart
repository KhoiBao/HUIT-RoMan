import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/date_time_x.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../usage/application/usage_providers.dart';
import '../../usage/domain/usage_session.dart';

class UsageHistoryPage extends ConsumerWidget {
  const UsageHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(myUsageProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Lịch sử sử dụng phòng')),
      body: SafeArea(
        top: false,
        child: sessionsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorView(
            error: error,
            onRetry: () => ref.invalidate(myUsageProvider),
          ),
          data: (sessions) => sessions.isEmpty
              ? const EmptyState(
                  icon: Icons.history_outlined,
                  message: 'Chưa có phiên sử dụng phòng nào',
                  description: 'Các lần nhận và trả phòng sẽ hiển thị tại đây.',
                )
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async => ref.invalidate(myUsageProvider),
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(
                        parent: BouncingScrollPhysics()),
                    padding: const EdgeInsets.fromLTRB(
                        AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 32),
                    itemCount: sessions.length,
                    separatorBuilder: (_, _) => const SizedBox(
                        height: AppSpacing.md),
                    itemBuilder: (context, index) =>
                        _UsageSessionCard(session: sessions[index]),
                  ),
                ),
        ),
      ),
    );
  }
}

class _UsageSessionCard extends StatelessWidget {
  const _UsageSessionCard({required this.session});

  final UsageSession session;

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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.roomLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navy,
                      ),
                    ),
                    if (session.location.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        session.location,
                        style: const TextStyle(
                            fontSize: 11.5, color: AppColors.muted),
                      ),
                    ],
                  ],
                ),
              ),
              StatusBadge(label: session.status.label, compact: true),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              const Icon(Icons.event_outlined, size: 14, color: AppColors.muted),
              const SizedBox(width: 6),
              Text(
                '${session.dateLabel} · ${session.timeRange}',
                style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.navy,
                    fontWeight: FontWeight.w500),
              ),
            ],
          ),
          if (session.activityName.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              session.activityName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 12.5, color: AppColors.muted),
            ),
          ],
          if (session.actualCheckIn != null ||
              session.actualCheckOut != null) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _ActualTime(
                    label: 'Nhận phòng',
                    at: session.actualCheckIn,
                  ),
                ),
                Expanded(
                  child: _ActualTime(
                    label: 'Trả phòng',
                    at: session.actualCheckOut,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ActualTime extends StatelessWidget {
  const _ActualTime({required this.label, this.at});

  final String label;
  final DateTime? at;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppColors.muted),
        ),
        const SizedBox(height: 2),
        Text(
          at == null ? '—' : DateTimeX.timeOf(at!),
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.navy,
          ),
        ),
      ],
    );
  }
}
