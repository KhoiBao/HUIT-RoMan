import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../features/auth/application/auth_controller.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(_bootstrap);
  }

  Future<void> _bootstrap() async {
    await ref.read(authControllerProvider.notifier).restore();
    if (!mounted) return;
    final authed = ref.read(authControllerProvider).isAuthenticated;
    context.go(authed ? '/home' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/roman-logo-icon.png',
              width: 110,
              height: 110,
            )
                .animate()
                .fadeIn(duration: 400.ms)
                .scale(begin: const Offset(0.86, 0.86), duration: 400.ms, curve: Curves.easeOut),
            const SizedBox(height: AppSpacing.lg),
            const Text(
              'RoMan',
              style: TextStyle(
                color: Colors.white,
                fontSize: 30,
                fontWeight: FontWeight.w800,
              ),
            )
                .animate()
                .fadeIn(delay: 120.ms, duration: 350.ms)
                .slideY(begin: 0.15, duration: 350.ms, curve: Curves.easeOut),
            const SizedBox(height: 6),
            Text(
              'HUIT · Đặt phòng học',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.6),
                fontSize: 13,
              ),
            ).animate().fadeIn(delay: 220.ms, duration: 350.ms),
          ],
        ),
      ),
    );
  }
}
