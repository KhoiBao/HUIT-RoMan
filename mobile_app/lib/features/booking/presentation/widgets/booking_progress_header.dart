import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

class BookingProgressHeader extends StatelessWidget {
  const BookingProgressHeader({super.key, required this.step});

  final int step;

  static const _labels = ['Thời gian', 'Phòng', 'Thông tin'];

  @override
  Widget build(BuildContext context) {
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 240);

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.md),
      child: Row(
        children: [
          for (var i = 0; i < _labels.length; i++) ...[
            Expanded(
              child: AnimatedOpacity(
                duration: duration,
                opacity: i <= step ? 1 : 0.45,
                child: Column(
                  children: [
                    Row(
                      children: [
                        AnimatedContainer(
                          duration: duration,
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: i <= step ? AppColors.primary : Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: i <= step
                                  ? AppColors.primary
                                  : AppColors.line,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: i < step
                              ? const Icon(Icons.check_rounded,
                                  size: 15, color: Colors.white)
                              : Text(
                                  '${i + 1}',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: i <= step
                                        ? Colors.white
                                        : AppColors.muted,
                                  ),
                                ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            _labels[i],
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight:
                                  i == step ? FontWeight.w700 : FontWeight.w500,
                              color: i <= step
                                  ? AppColors.navy
                                  : AppColors.muted,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    AnimatedContainer(
                      duration: duration,
                      height: 3,
                      decoration: BoxDecoration(
                        color: i <= step ? AppColors.primary : AppColors.line,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (i < _labels.length - 1) const SizedBox(width: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}
