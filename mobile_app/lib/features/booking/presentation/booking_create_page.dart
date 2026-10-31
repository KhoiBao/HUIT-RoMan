import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/confirm_dialog.dart';
import '../application/booking_create_controller.dart';
import '../application/booking_providers.dart';
import 'booking_success_page.dart';
import 'widgets/booking_progress_header.dart';
import 'widgets/step_confirm.dart';
import 'widgets/step_rooms.dart';
import 'widgets/step_time.dart';

class BookingCreatePage extends ConsumerStatefulWidget {
  const BookingCreatePage({super.key, this.prefill = const BookingPrefill()});

  final BookingPrefill prefill;

  @override
  ConsumerState<BookingCreatePage> createState() => _BookingCreatePageState();
}

class _BookingCreatePageState extends ConsumerState<BookingCreatePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(bookingCreateControllerProvider.notifier)
          .init(widget.prefill);
    });
  }

  bool get _isDirty {
    final state = ref.read(bookingCreateControllerProvider);
    return state.step > 0 ||
        state.activityName.isNotEmpty ||
        state.purpose.isNotEmpty ||
        state.note.isNotEmpty ||
        state.selectedRoomIds.isNotEmpty ||
        widget.prefill.roomId != null;
  }

  Future<void> _handleBack() async {
    final state = ref.read(bookingCreateControllerProvider);
    if (state.step > 0) {
      ref.read(bookingCreateControllerProvider.notifier).back();
      return;
    }
    if (!_isDirty) {
      context.pop();
      return;
    }
    final leave = await showConfirmDialog(
      context,
      title: 'Rời khỏi đặt phòng?',
      message: 'Các thông tin bạn đã chọn sẽ không được lưu lại.',
      confirmLabel: 'Rời trang',
      cancelLabel: 'Ở lại',
      danger: true,
    );
    if (leave && mounted) context.pop();
  }

  Future<void> _onPrimaryAction() async {
    final controller = ref.read(bookingCreateControllerProvider.notifier);
    final state = ref.read(bookingCreateControllerProvider);

    if (state.step < 2) {
      controller.next();
      return;
    }
    final booking = await controller.submit();
    if (!mounted) return;
    if (booking != null) {
      ref.invalidate(myBookingsProvider);
      return;
    }
    final error = ref.read(bookingCreateControllerProvider).submitError;
    if (error.isNotEmpty) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(error)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bookingCreateControllerProvider);

    if (state.created != null) {
      return BookingSuccessPage(booking: state.created!);
    }

    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 240);

    final primaryLabel = switch (state.step) {
      0 => 'Chọn phòng',
      1 => 'Tiếp tục',
      _ => 'Gửi đơn đặt phòng',
    };

    return PopScope(
      canPop: state.step == 0 && !_isDirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (state.step > 0) {
          ref.read(bookingCreateControllerProvider.notifier).back();
          return;
        }
        final leave = await showConfirmDialog(
          context,
          title: 'Rời khỏi đặt phòng?',
          message: 'Các thông tin bạn đã chọn sẽ không được lưu lại.',
          confirmLabel: 'Rời trang',
          cancelLabel: 'Ở lại',
          danger: true,
        );
        if (leave && context.mounted) context.pop();
      },
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            onPressed: _handleBack,
            icon: const Icon(Icons.arrow_back_rounded, color: AppColors.navy),
            tooltip: 'Quay lại',
          ),
          title: const Text(
            'Đặt phòng',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppColors.navy,
            ),
          ),
          bottom: const PreferredSize(
            preferredSize: Size.fromHeight(1),
            child: Divider(height: 1, color: AppColors.line),
          ),
        ),
        body: Column(
          children: [
            BookingProgressHeader(step: state.step),
            const Divider(height: 1, color: AppColors.line),
            Expanded(
              child: AnimatedSwitcher(
                duration: duration,
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (child, animation) {
                  final offset = Tween<Offset>(
                    begin: const Offset(0.04, 0),
                    end: Offset.zero,
                  ).animate(animation);
                  return FadeTransition(
                    opacity: animation,
                    child: SlideTransition(position: offset, child: child),
                  );
                },
                child: KeyedSubtree(
                  key: ValueKey(state.step),
                  child: switch (state.step) {
                    0 => const StepTime(),
                    1 => const StepRooms(),
                    _ => const StepConfirm(),
                  },
                ),
              ),
            ),
          ],
        ),
        bottomNavigationBar: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.line)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.md),
              child: Row(
                children: [
                  if (state.step > 0) ...[
                    Expanded(
                      child: AppButton(
                        label: 'Quay lại',
                        outlined: true,
                        onPressed: () => ref
                            .read(bookingCreateControllerProvider.notifier)
                            .back(),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                  ],
                  Expanded(
                    flex: state.step > 0 ? 2 : 1,
                    child: AppButton(
                      key: const Key('booking-primary-action'),
                      label: primaryLabel,
                      loading: state.step == 2 && state.submitting,
                      onPressed: _onPrimaryAction,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
