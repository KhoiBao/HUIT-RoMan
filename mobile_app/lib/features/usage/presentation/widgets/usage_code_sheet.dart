import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_sheet.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../application/usage_providers.dart';
import '../../domain/usage_session.dart';
import 'checkout_sheet.dart';

class UsageCodeSheet extends ConsumerStatefulWidget {
  const UsageCodeSheet({super.key});

  @override
  ConsumerState<UsageCodeSheet> createState() => _UsageCodeSheetState();
}

class _UsageCodeSheetState extends ConsumerState<UsageCodeSheet> {
  final _controller = TextEditingController();
  UsageSession? _session;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _lookup() async {
    final code = _controller.text.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() => _error = 'Vui lòng nhập mã nhận phòng.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await ref.read(usageRepositoryProvider).byCode(code);
      if (!mounted) return;
      setState(() {
        _session = session;
        _busy = false;
      });
    } on AppException catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _session = null;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _session = null;
        _error = 'Không tìm thấy phiên sử dụng với mã này.';
      });
    }
  }

  Future<void> _checkIn(UsageSession session) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Nhận phòng ngay?',
      message:
          'Xác nhận bắt đầu sử dụng ${session.roomLabel} (${session.timeRange}).',
      confirmLabel: 'Nhận phòng',
    );
    if (!confirmed || !mounted) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(usageRepositoryProvider)
          .checkIn(usageSessionId: session.id);
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
        _error = 'Không nhận phòng được. Vui lòng thử lại.';
      });
    }
  }

  Future<void> _checkOut(UsageSession session) async {
    final done = await showAppSheet<bool>(
      context,
      builder: (_) => CheckoutSheet(session: session),
    );
    if (done == true && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;

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
                title: 'Tra cứu mã nhận phòng',
                subtitle:
                    'Nhập mã xác nhận in trên phiếu để xem nhanh phiên sử dụng phòng.',
              ),
              TextField(
                key: const Key('usage-code-input'),
                controller: _controller,
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _lookup(),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp('[a-zA-Z0-9]')),
                  LengthLimitingTextInputFormatter(12),
                ],
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2,
                  color: AppColors.navy,
                ),
                decoration: InputDecoration(
                  hintText: 'VD: A1B2C3D4',
                  hintStyle: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 1,
                    color: AppColors.muted,
                  ),
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
              const SizedBox(height: AppSpacing.md),
              AppButton(
                label: 'Tra cứu',
                height: 48,
                loading: _busy,
                onPressed: _lookup,
              ),
              if (session != null) ...[
                const SizedBox(height: AppSpacing.lg),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppRadius.input),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              session.roomLabel,
                              style: const TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.navy,
                              ),
                            ),
                          ),
                          StatusBadge(label: session.status.label, compact: true),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        [
                          if (session.roomCode.isNotEmpty) session.roomCode,
                          if (session.location.isNotEmpty) session.location,
                        ].join(' · '),
                        style: const TextStyle(
                            fontSize: 11.5, color: AppColors.muted),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          const Icon(Icons.schedule_rounded,
                              size: 14, color: AppColors.muted),
                          const SizedBox(width: 5),
                          Text(
                            '${session.dateLabel} · ${session.timeRange}',
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.muted),
                          ),
                        ],
                      ),
                      if (session.activityName.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          session.activityName,
                          style: const TextStyle(
                              fontSize: 12.5, color: AppColors.navy),
                        ),
                      ],
                      if (session.status.isPending &&
                          !session.canCheckIn) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          session.checkInHint,
                          style: const TextStyle(
                              fontSize: 11.5, color: AppColors.muted),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      if (session.canCheckIn)
                        AppButton(
                          label: 'Nhận phòng',
                          height: 46,
                          icon: Icons.login_rounded,
                          loading: _busy,
                          onPressed: () => _checkIn(session),
                        )
                      else if (session.status.isInUse)
                        AppButton(
                          label: 'Trả phòng',
                          height: 46,
                          icon: Icons.logout_rounded,
                          onPressed: () => _checkOut(session),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
