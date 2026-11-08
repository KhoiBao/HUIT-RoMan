import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../application/history_providers.dart';
import '../domain/violation_record.dart';

class ViolationHistoryPage extends ConsumerWidget {
  const ViolationHistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final violationsAsync = ref.watch(myViolationsProvider);
    final eligibilityAsync = ref.watch(myEligibilityProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Lịch sử vi phạm')),
      body: SafeArea(
        top: false,
        child: violationsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorView(
            error: error,
            onRetry: () {
              ref.invalidate(myViolationsProvider);
              ref.invalidate(myEligibilityProvider);
            },
          ),
          data: (violations) {
            final restriction = eligibilityAsync.value;
            final isRestricted =
                restriction?.hasActiveRestriction == true || restriction?.isEligible == false;
            return Column(
              children: [
                if (isRestricted)
                  _RestrictionBanner(eligibility: restriction!),
                Expanded(
                  child: violations.isEmpty
                      ? const EmptyState(
                          icon: Icons.verified_outlined,
                          message: 'Chưa có biên bản vi phạm nào',
                          description:
                              'Hãy giữ nội quy khi sử dụng phòng nhé.',
                        )
                      : RefreshIndicator(
                          color: AppColors.primary,
                          onRefresh: () async {
                            ref.invalidate(myViolationsProvider);
                            ref.invalidate(myEligibilityProvider);
                          },
                          child: ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(
                                parent: BouncingScrollPhysics()),
                            padding: const EdgeInsets.fromLTRB(AppSpacing.lg,
                                AppSpacing.md, AppSpacing.lg, 32),
                            itemCount: violations.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: AppSpacing.md),
                            itemBuilder: (context, index) =>
                                _ViolationCard(record: violations[index]),
                          ),
                        ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _RestrictionBanner extends StatelessWidget {
  const _RestrictionBanner({required this.eligibility});

  final UserEligibility eligibility;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.block_rounded, size: 18, color: AppColors.danger),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eligibility.message.isNotEmpty
                      ? eligibility.message
                      : 'Bạn đang bị cấm mượn phòng.',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.danger,
                    height: 1.4,
                  ),
                ),
                if (eligibility.reason != null &&
                    eligibility.reason!.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Lý do: ${eligibility.reason}',
                    style: const TextStyle(
                        fontSize: 11.5, color: AppColors.muted, height: 1.4),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ViolationCard extends StatelessWidget {
  const _ViolationCard({required this.record});

  final ViolationRecord record;

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
                child: Text(
                  record.violationTypeName.isEmpty
                      ? 'Vi phạm nội quy'
                      : record.violationTypeName,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
                ),
              ),
              StatusBadge(label: record.status.label, compact: true),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${record.code} · ${record.incidentLabel}',
            style: const TextStyle(fontSize: 11.5, color: AppColors.muted),
          ),
          if (record.description.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              record.description,
              style: const TextStyle(
                  fontSize: 12.5, color: AppColors.navy, height: 1.5),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (record.roomLabel != null)
                StatusBadge(label: record.roomLabel!, compact: true),
              if (record.severityText.isNotEmpty)
                StatusBadge(label: record.severityText, compact: true),
              if (record.penaltyApplied.isNotEmpty)
                StatusBadge(label: record.penaltyApplied, compact: true),
            ],
          ),
        ],
      ),
    );
  }
}
