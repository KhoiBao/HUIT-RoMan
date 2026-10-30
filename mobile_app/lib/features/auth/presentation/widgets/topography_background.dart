import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Animated topographic contour lines used behind the login card.
class TopographyBackground extends StatefulWidget {
  const TopographyBackground({
    super.key,
    this.color = Colors.white,
    this.animate = true,
  });

  final Color color;
  final bool animate;

  @override
  State<TopographyBackground> createState() => _TopographyBackgroundState();
}

class _TopographyBackgroundState extends State<TopographyBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  Offset? _pointer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 24),
    );
    if (widget.animate) _controller.repeat();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (reduced) {
      _controller.stop();
    } else if (widget.animate && !_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Listener(
          behavior: HitTestBehavior.translucent,
          onPointerHover: (event) =>
              setState(() => _pointer = event.localPosition),
          onPointerMove: (event) =>
              setState(() => _pointer = event.localPosition),
          onPointerUp: (_) => setState(() => _pointer = null),
          onPointerCancel: (_) => setState(() => _pointer = null),
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => CustomPaint(
              size: Size(constraints.maxWidth, constraints.maxHeight),
              painter: _TopographyPainter(
                phase: _controller.value,
                pointer: _pointer,
                color: widget.color,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _TopographyPainter extends CustomPainter {
  _TopographyPainter({
    required this.phase,
    required this.pointer,
    required this.color,
  });

  final double phase;
  final Offset? pointer;
  final Color color;

  static const _levels = 17;
  static const _samples = 52;

  @override
  void paint(Canvas canvas, Size size) {
    final t = phase * math.pi * 2;
    for (var level = 0; level < _levels; level++) {
      final isIndex = level % 5 == 0;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = isIndex ? 1.35 : 0.9
        ..color = color.withValues(alpha: isIndex ? 0.16 : 0.075);

      final path = Path();
      for (var i = 0; i <= _samples; i++) {
        final x = size.width * i / _samples;
        final baseY = size.height * (level / (_levels - 1));
        var y = baseY +
            math.sin(x * 0.011 + t + level * 0.55) * 16 +
            math.sin(x * 0.027 - t * 1.35 + level * 0.9) * 6;

        if (pointer != null) {
          final dx = (x - pointer!.dx) / 120;
          final dy = (baseY - pointer!.dy) / 120;
          final influence = math.exp(-(dx * dx + dy * dy));
          y -= influence * 34;
        }

        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_TopographyPainter oldDelegate) =>
      oldDelegate.phase != phase || oldDelegate.pointer != pointer;
}
