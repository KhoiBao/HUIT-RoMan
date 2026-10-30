import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AppButton extends StatefulWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
    this.icon,
    this.outlined = false,
    this.danger = false,
    this.expand = true,
    this.height = 52,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  final bool outlined;
  final bool danger;
  final bool expand;
  final double height;

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.loading;
    final fg = widget.danger
        ? AppColors.danger
        : (widget.outlined ? AppColors.primary : Colors.white);
    final bg = widget.outlined ? Colors.white : (widget.danger ? AppColors.danger : AppColors.primary);

    return AnimatedScale(
      scale: _pressed ? 0.965 : 1,
      duration: const Duration(milliseconds: 160),
      curve: Curves.easeOut,
      child: SizedBox(
        width: widget.expand ? double.infinity : null,
        height: widget.height,
        child: Material(
          color: enabled ? bg : bg.withValues(alpha: 0.55),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: widget.outlined
                ? const BorderSide(color: AppColors.line)
                : BorderSide.none,
          ),
          child: InkWell(
            onTap: enabled ? widget.onPressed : null,
            borderRadius: BorderRadius.circular(12),
            onHighlightChanged: (value) => setState(() => _pressed = value),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (widget.loading)
                    SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: widget.outlined ? AppColors.primary : Colors.white,
                      ),
                    )
                  else if (widget.icon != null)
                    Icon(widget.icon, size: 18, color: fg),
                  if (widget.loading || widget.icon != null) const SizedBox(width: 8),
                  Text(
                    widget.label,
                    style: TextStyle(
                      color: fg,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'BeVietnamPro',
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
