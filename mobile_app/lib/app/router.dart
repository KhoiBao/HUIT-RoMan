import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/application/auth_controller.dart';
import '../features/auth/presentation/forgot_password_page.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/placeholder_page.dart';
import 'app_shell.dart';
import 'splash_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final location = state.matchedLocation;
      if (location == '/splash') return null;
      final onAuthPage =
          location == '/login' || location == '/forgot-password';
      if (auth.restoring) return null;
      if (!auth.isAuthenticated && !onAuthPage) return '/login';
      if (auth.isAuthenticated && onAuthPage) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashPage()),
      GoRoute(path: '/login', builder: (_, _) => const LoginPage()),
      GoRoute(
          path: '/forgot-password',
          builder: (_, _) => const ForgotPasswordPage()),
      StatefulShellRoute.indexedStack(
        builder: (_, _, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/home',
                builder: (_, _) =>
                    const PlaceholderPage(title: 'Tổng quan')),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/schedule',
                builder: (_, _) => const PlaceholderPage(title: 'Lịch')),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/bookings',
                builder: (_, _) =>
                    const PlaceholderPage(title: 'Đơn của tôi')),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/profile',
                builder: (_, _) => const PlaceholderPage(title: 'Hồ sơ')),
          ]),
        ],
      ),
      GoRoute(
          path: '/rooms',
          builder: (_, _) => const PlaceholderPage(title: 'Danh sách phòng')),
      GoRoute(
          path: '/rooms/:id',
          builder: (_, state) => PlaceholderPage(
              title: 'Phòng ${state.pathParameters['id'] ?? ''}')),
      GoRoute(
          path: '/booking/new',
          builder: (_, _) => const PlaceholderPage(title: 'Đặt phòng')),
      GoRoute(
          path: '/bookings/:id',
          builder: (_, state) => PlaceholderPage(
              title: 'Đơn ${state.pathParameters['id'] ?? ''}')),
      GoRoute(
          path: '/notifications',
          builder: (_, _) => const PlaceholderPage(title: 'Thông báo')),
      GoRoute(path: '/chat', builder: (_, _) => const PlaceholderPage(title: 'Hỗ trợ')),
    ],
  );
});
