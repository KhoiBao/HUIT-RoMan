import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_spacing.dart';

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 8,
    this.margin = EdgeInsets.zero,
  });

  final double? width;
  final double height;
  final double radius;
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        color: const Color(0xFFE9EFF6),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

class CardSkeleton extends StatelessWidget {
  const CardSkeleton({super.key, this.lines = 3});

  final int lines;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: const Color(0xFFE9EFF6),
      highlightColor: const Color(0xFFF7FAFD),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE9EFF6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                SkeletonBox(width: 40, height: 40, radius: 12),
                SizedBox(width: AppSpacing.md),
                Expanded(child: SkeletonBox(height: 14)),
                SizedBox(width: AppSpacing.sm),
                SkeletonBox(width: 54, height: 20, radius: 999),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            for (var i = 0; i < lines; i++) ...[
              SkeletonBox(width: i.isEven ? double.infinity : 180),
              const SizedBox(height: AppSpacing.sm),
            ],
          ],
        ),
      ),
    );
  }
}

class ListSkeleton extends StatelessWidget {
  const ListSkeleton({super.key, this.count = 4, this.lines = 3});

  final int count;
  final int lines;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (_, _) => CardSkeleton(lines: lines),
    );
  }
}
