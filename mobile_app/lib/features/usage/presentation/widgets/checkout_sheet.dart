import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../application/usage_providers.dart';
import '../../domain/usage_session.dart';

class CheckoutSheet extends ConsumerStatefulWidget {
  const CheckoutSheet({super.key, required this.session});

  final UsageSession session;

  @override
  ConsumerState<CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends ConsumerState<CheckoutSheet> {
  final _noteController = TextEditingController();
  String _condition = 'Trống';
  bool _devicesOk = true;
  bool _cleaned = true;
  bool _lightsOff = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(usageRepositoryProvider).checkOut(
            widget.session.id,
            CheckOutResultInput(
              roomCondition: _condition,
              devicesOk: _devicesOk,
              cleaned: _cleaned,
              lightsOff: _lightsOff,
              staffNote: _noteController.text.trim(),
            ),
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on AppException catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Không trả phòng được. Vui lòng thử lại.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
              AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SheetHeader(
                title: 'Trả phòng',
                subtitle:
                    'Xác nhận tình trạng phòng để hoàn tất phiên sử dụng và ghi nhận bàn giao.',
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
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.session.roomLabel,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.navy,
                            ),
                          ),
                          Text(
                            '${widget.session.dateLabel} · ${widget.session.timeRange}',
                            style: const TextStyle(
                                fontSize: 11.5, color: AppColors.muted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const Text(
                'Tình trạng phòng',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.navy,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: _ConditionTile(
                      label: 'Bình thường',
                      description: 'Sẵn sàng sử dụng',
                      selected: _condition == 'Trống',
                      onTap: () => setState(() => _condition = 'Trống'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _ConditionTile(
                      label: 'Cần bảo trì',
                      description: 'Có sự cố cần xử lý',
                      selected: _condition == 'Bảo trì',
                      onTap: () => setState(() => _condition = 'Bảo trì'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const Text(
                'Xác nhận bàn giao',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.navy,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              _CheckTile(
                label: 'Thiết bị hoạt động bình thường',
                value: _devicesOk,
                onChanged: (value) => setState(() => _devicesOk = value),
              ),
              _CheckTile(
                label: 'Đã vệ sinh phòng',
                value: _cleaned,
                onChanged: (value) => setState(() => _cleaned = value),
              ),
              _CheckTile(
                label: 'Đã tắt điện và thiết bị',
                value: _lightsOff,
                onChanged: (value) => setState(() => _lightsOff = value),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                key: const Key('checkout-note'),
                controller: _noteController,
                maxLength: 500,
                minLines: 2,
                maxLines: 3,
                style: const TextStyle(fontSize: 13.5, color: AppColors.navy),
                decoration: InputDecoration(
                  hintText: 'Ghi chú thêm (không bắt buộc)',
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
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _error!,
                  style:
                      const TextStyle(fontSize: 12, color: AppColors.danger),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Xác nhận trả phòng',
                loading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConditionTile extends StatelessWidget {
  const _ConditionTile({
    required this.label,
    required this.description,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String description;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.07)
              : Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.input),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.line,
            width: selected ? 1.4 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? AppColors.navy : AppColors.muted,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              description,
              style:
                  const TextStyle(fontSize: 11, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckTile extends StatelessWidget {
  const _CheckTile({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: value ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                    color: value ? AppColors.primary : AppColors.line,
                    width: 1.4),
              ),
              child: value
                  ? const Icon(Icons.check_rounded,
                      size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 13, color: AppColors.navy),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
