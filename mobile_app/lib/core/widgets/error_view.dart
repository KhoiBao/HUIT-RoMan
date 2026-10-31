import 'package:flutter/material.dart';
import '../errors/app_exception.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import 'app_button.dart';

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final message = error is AppException
        ? (error as AppException).message
        : 'Đã có lỗi xảy ra, vui lòng thử lại';
    final isNetwork = error is NetworkException;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: Icon(
                isNetwork ? Icons.wifi_off_rounded : Icons.error_outline_rounded,
                size: 28,
                color: AppColors.danger,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: AppColors.navy, height: 1.5),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Thử lại',
                outlined: true,
                expand: false,
                height: 44,
                onPressed: onRetry,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
