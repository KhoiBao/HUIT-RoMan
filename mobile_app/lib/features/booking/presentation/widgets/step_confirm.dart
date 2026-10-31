import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../application/booking_create_controller.dart';

class StepConfirm extends ConsumerStatefulWidget {
  const StepConfirm({super.key});

  @override
  ConsumerState<StepConfirm> createState() => _StepConfirmState();
}

class _StepConfirmState extends ConsumerState<StepConfirm> {
  late final TextEditingController _activity;
  late final TextEditingController _purpose;
  late final TextEditingController _guests;
  late final TextEditingController _note;

  @override
  void initState() {
    super.initState();
    final state = ref.read(bookingCreateControllerProvider);
    _activity = TextEditingController(text: state.activityName);
    _purpose = TextEditingController(text: state.purpose);
    _guests = TextEditingController(text: '${state.guestCount}');
    _note = TextEditingController(text: state.note);
  }

  @override
  void dispose() {
    _activity.dispose();
    _purpose.dispose();
    _guests.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bookingCreateControllerProvider);
    final controller = ref.read(bookingCreateControllerProvider.notifier);
    final dateLabel =
        '${_two(state.date.day)}/${_two(state.date.month)}/${state.date.year}';

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.xxl),
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            children: [
              _SummaryRow(
                icon: Icons.calendar_today_rounded,
                label: 'Ngày sử dụng',
                value: dateLabel,
              ),
              const Divider(height: AppSpacing.xl, color: AppColors.line),
              _SummaryRow(
                icon: Icons.schedule_rounded,
                label: state.modeLabel,
                value: state.timeLabel,
              ),
              const Divider(height: AppSpacing.xl, color: AppColors.line),
              _SummaryRow(
                icon: Icons.meeting_room_rounded,
                label: '${state.selectedRooms.length} phòng',
                value: state.selectedRooms.map((r) => r.name).join(', '),
                onEdit: () => controller.setStep(1),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        const Text(
          'Thông tin đơn',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                key: const Key('booking-activity'),
                controller: _activity,
                maxLength: 120,
                textInputAction: TextInputAction.next,
                onChanged: controller.setActivityName,
                decoration: const InputDecoration(
                  labelText: 'Tên hoạt động',
                  hintText: 'Ví dụ: Họp nhóm đồ án',
                  counterText: '',
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                key: const Key('booking-purpose'),
                controller: _purpose,
                maxLength: 500,
                minLines: 2,
                maxLines: 3,
                textInputAction: TextInputAction.newline,
                onChanged: controller.setPurpose,
                decoration: const InputDecoration(
                  labelText: 'Mục đích sử dụng',
                  hintText: 'Mô tả ngắn gọn nhu cầu sử dụng phòng',
                  counterText: '',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                key: const Key('booking-guests'),
                controller: _guests,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (value) =>
                    controller.setGuestCount(int.tryParse(value) ?? 0),
                decoration: InputDecoration(
                  labelText: 'Số người tham gia',
                  hintText: '1',
                  counterText: '',
                  helperText: state.selectedRooms.isEmpty
                      ? null
                      : 'Sức chứa tối đa ${state.maxCapacity} người',
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                key: const Key('booking-note'),
                controller: _note,
                maxLength: 500,
                minLines: 2,
                maxLines: 4,
                onChanged: controller.setNote,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú (không bắt buộc)',
                  hintText: 'Thiết bị cần chuẩn bị, yêu cầu hỗ trợ…',
                  counterText: '',
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
        ),
        if (state.formError.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          _MessageBanner(message: state.formError),
        ],
        if (state.submitError.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          _MessageBanner(message: state.submitError),
        ],
        if (state.eligibility != null && !state.eligibility!.isEligible) ...[
          const SizedBox(height: AppSpacing.md),
          _MessageBanner(
            message: state.eligibility!.message.isEmpty
                ? 'Tài khoản của bạn hiện không được phép mượn phòng.'
                : state.eligibility!.message,
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(AppRadius.input),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.verified_outlined, size: 17, color: AppColors.primary),
              SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  'Đơn sẽ được gửi tới quản lý thư viện. Bạn có thể theo dõi trạng thái duyệt trong mục Đơn của tôi.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.navy,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  static String _two(int value) => value.toString().padLeft(2, '0');
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
    this.onEdit,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11.5, color: AppColors.muted),
              ),
              const SizedBox(height: 3),
              Text(
                value.isEmpty ? '—' : value,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.navy,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        if (onEdit != null)
          TextButton(
            onPressed: onEdit,
            style: TextButton.styleFrom(minimumSize: const Size(48, 40)),
            child: const Text('Sửa', style: TextStyle(fontSize: 12.5)),
          ),
      ],
    );
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded,
              size: 17, color: AppColors.danger),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.danger,
                height: 1.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
