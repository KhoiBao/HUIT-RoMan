import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

Future<bool> showConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'Xác nhận',
  String cancelLabel = 'Hủy',
  bool danger = false,
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.card)),
      title: Text(
        title,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.navy),
      ),
      content: Text(
        message,
        style: const TextStyle(fontSize: 14, color: AppColors.muted, height: 1.5),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.md),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(cancelLabel, style: const TextStyle(color: AppColors.muted)),
        ),
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(
            confirmLabel,
            style: TextStyle(color: danger ? AppColors.danger : AppColors.primary),
          ),
        ),
      ],
    ),
  );
  return result ?? false;
}
