import 'package:flutter/material.dart';
import '../theme/status_palette.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.background,
    this.foreground,
    this.icon,
    this.compact = false,
  });

  final String label;
  final Color? background;
  final Color? foreground;
  final IconData? icon;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final tone = StatusPalette.forLabel(label);
    final bg = background ?? tone.background;
    final fg = foreground ?? tone.foreground;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: compact ? 11 : 13, color: fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: compact ? 11 : 12,
              fontWeight: FontWeight.w600,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
