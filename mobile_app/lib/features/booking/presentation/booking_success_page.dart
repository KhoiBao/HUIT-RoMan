import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/date_time_x.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/status_badge.dart';
import '../domain/booking.dart';

class BookingSuccessPage extends StatelessWidget {
  const BookingSuccessPage({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final approved = booking.status.isApproved;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.10),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Container(
                    width: 70,
                    height: 70,
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_rounded,
                        size: 38, color: Colors.white),
                  ),
                ),
              )
                  .animate(target: reduceMotion ? 0 : 1)
                  .fadeIn(duration: 280.ms)
                  .scale(
                    begin: const Offset(0.6, 0.6),
                    end: const Offset(1, 1),
                    curve: Curves.easeOutBack,
                    duration: 420.ms,
                  ),
              const SizedBox(height: AppSpacing.xl),
              const Text(
                'Đã gửi đơn đặt phòng',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy,
                ),
              )
                  .animate(target: reduceMotion ? 0 : 1)
                  .fadeIn(delay: 120.ms, duration: 280.ms)
                  .slideY(begin: 0.08, end: 0),
              const SizedBox(height: AppSpacing.sm),
              Text(
                approved
                    ? 'Đơn của bạn đã được duyệt tự động và sẵn sàng sử dụng.'
                    : 'Đơn đang chờ quản lý thư viện duyệt. Bạn sẽ nhận được thông báo khi có kết quả.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                  border: Border.all(color: AppColors.line),
                  boxShadow: appShadow,
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Đơn #${booking.id}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.navy,
                            ),
                          ),
                        ),
                        StatusBadge(label: booking.status.label),
                      ],
                    ),
                    const Divider(height: AppSpacing.xl, color: AppColors.line),
                    _Row(
                      icon: Icons.campaign_outlined,
                      text: booking.activityName,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _Row(
                      icon: Icons.calendar_today_rounded,
                      text:
                          '${DateTimeX.dayOf(booking.startAt)} · ${booking.timeRange}',
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _Row(
                      icon: Icons.meeting_room_outlined,
                      text: booking.roomNames,
                    ),
                  ],
                ),
              ),
              const Spacer(),
              AppButton(
                label: 'Xem đơn của tôi',
                icon: Icons.receipt_long_rounded,
                onPressed: () => context.go('/bookings/${booking.id}'),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () => context.go('/home'),
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                child: const Text(
                  'Về trang chủ',
                  style: TextStyle(fontSize: 14, color: AppColors.muted),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 17, color: AppColors.primary),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.navy,
              height: 1.4,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}
