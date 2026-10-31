import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_sheet.dart';
import '../application/feedback_providers.dart';

class FeedbackSheet extends ConsumerStatefulWidget {
  const FeedbackSheet({
    super.key,
    required this.bookingId,
    this.usageSessionId,
    this.subtitle,
  });

  final int bookingId;
  final int? usageSessionId;
  final String? subtitle;

  @override
  ConsumerState<FeedbackSheet> createState() => _FeedbackSheetState();
}

class _FeedbackSheetState extends ConsumerState<FeedbackSheet> {
  static const _labels = [
    '',
    'Rất tệ',
    'Không hài lòng',
    'Bình thường',
    'Hài lòng',
    'Rất hài lòng',
  ];

  final _commentController = TextEditingController();
  int _rating = 0;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    if (_rating < 1) {
      setState(() => _error = 'Vui lòng chọn số sao đánh giá.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(feedbackRepositoryProvider).create(
            rating: _rating,
            bookingId: widget.bookingId,
            usageSessionId: widget.usageSessionId,
            comment: _commentController.text.trim(),
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
        _error = 'Không gửi được đánh giá. Vui lòng thử lại.';
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
              SheetHeader(
                title: 'Đánh giá phòng',
                subtitle: widget.subtitle ??
                    'Chia sẻ trải nghiệm của bạn để cải thiện chất lượng phục vụ.',
              ),
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (var star = 1; star <= 5; star++)
                      Semantics(
                        button: true,
                        label: '$_labels[star] ($star sao)',
                        child: InkWell(
                          onTap: () => setState(() {
                            _rating = star;
                            _error = null;
                          }),
                          borderRadius: BorderRadius.circular(999),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: AnimatedScale(
                              scale: _rating == star ? 1.12 : 1,
                              duration: const Duration(milliseconds: 160),
                              child: Icon(
                                star <= _rating
                                    ? Icons.star_rounded
                                    : Icons.star_outline_rounded,
                                size: 38,
                                color: star <= _rating
                                    ? AppColors.gold
                                    : AppColors.line,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Center(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: Text(
                    _rating == 0 ? 'Chạm để chọn sao' : _labels[_rating],
                    key: ValueKey(_rating),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color:
                          _rating == 0 ? AppColors.muted : AppColors.gold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              TextField(
                key: const Key('feedback-comment'),
                controller: _commentController,
                maxLength: 2000,
                minLines: 3,
                maxLines: 5,
                style: const TextStyle(fontSize: 13.5, color: AppColors.navy),
                decoration: InputDecoration(
                  hintText: 'Nhận xét thêm (không bắt buộc)',
                  hintStyle:
                      const TextStyle(fontSize: 13, color: AppColors.muted),
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
                label: 'Gửi đánh giá',
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
