import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_sheet.dart';

class CancelBookingRequest {
  const CancelBookingRequest({required this.reason, this.detail});

  final String reason;
  final String? detail;
}

class CancelBookingSheet extends StatefulWidget {
  const CancelBookingSheet({super.key, required this.roomLabel});

  final String roomLabel;

  @override
  State<CancelBookingSheet> createState() => _CancelBookingSheetState();
}

class _CancelBookingSheetState extends State<CancelBookingSheet> {
  static const _options = [
    (
      code: 'CHANGE_PLAN',
      label: 'Thay đổi kế hoạch',
      icon: Icons.event_repeat_outlined,
    ),
    (
      code: 'NO_LONGER_NEEDED',
      label: 'Không còn nhu cầu sử dụng',
      icon: Icons.do_not_disturb_on_outlined,
    ),
    (
      code: 'OTHER',
      label: 'Lý do khác',
      icon: Icons.edit_note_outlined,
    ),
  ];

  final _detailController = TextEditingController();
  String _reason = _options.first.code;
  String? _error;

  @override
  void dispose() {
    _detailController.dispose();
    super.dispose();
  }

  void _submit() {
    final detail = _detailController.text.trim();
    if (_reason == 'OTHER' && detail.length < 3) {
      setState(() => _error = 'Vui lòng nhập lý do cụ thể (ít nhất 3 ký tự).');
      return;
    }
    Navigator.of(context).pop(
      CancelBookingRequest(
        reason: _reason,
        detail: _reason == 'OTHER' ? detail : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SheetHeader(
              title: 'Hủy đơn đặt phòng',
              subtitle:
                  'Đơn chỉ có thể hủy trước giờ bắt đầu ít nhất 3 giờ và khi chưa nhận phòng.',
            ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(AppRadius.input),
              ),
              child: Row(
                children: [
                  const Icon(Icons.meeting_room_outlined,
                      size: 18, color: AppColors.primary),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      widget.roomLabel,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navy,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            const Text(
              'Lý do hủy',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            for (final option in _options)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: _ReasonTile(
                  icon: option.icon,
                  label: option.label,
                  selected: _reason == option.code,
                  onTap: () => setState(() {
                    _reason = option.code;
                    _error = null;
                  }),
                ),
              ),
            if (_reason == 'OTHER') ...[
              const SizedBox(height: AppSpacing.sm),
              TextField(
                key: const Key('cancel-reason-detail'),
                controller: _detailController,
                maxLength: 200,
                minLines: 2,
                maxLines: 4,
                style: const TextStyle(fontSize: 13.5, color: AppColors.navy),
                decoration: InputDecoration(
                  hintText: 'Nhập lý do cụ thể',
                  hintStyle:
                      const TextStyle(fontSize: 13, color: AppColors.muted),
                  counterText: '',
                  filled: true,
                  fillColor: AppColors.bg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.input),
                    borderSide: const BorderSide(color: AppColors.line),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.input),
                    borderSide: const BorderSide(color: AppColors.line),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.input),
                    borderSide: const BorderSide(color: AppColors.primary),
                  ),
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                _error!,
                style: const TextStyle(fontSize: 12, color: AppColors.danger),
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            AppButton(
              label: 'Tiếp tục',
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

class _ReasonTile extends StatelessWidget {
  const _ReasonTile({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.primary.withValues(alpha: 0.07)
          : Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.input),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md, vertical: AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.line,
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(icon,
                  size: 18,
                  color: selected ? AppColors.primary : AppColors.muted),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: selected ? AppColors.navy : AppColors.muted,
                  ),
                ),
              ),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                size: 18,
                color: selected ? AppColors.primary : AppColors.line,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
