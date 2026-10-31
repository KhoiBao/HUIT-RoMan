import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/application/auth_controller.dart';
import '../features/auth/presentation/forgot_password_page.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/booking/application/booking_create_controller.dart';
import '../features/booking/presentation/booking_create_page.dart';
import '../features/booking/presentation/booking_detail_page.dart';
import '../features/booking/presentation/bookings_page.dart';
import '../features/chat/presentation/chat_page.dart';
import '../features/home/presentation/home_page.dart';
import '../features/notification/presentation/notifications_page.dart';
import '../features/profile/presentation/profile_page.dart';
import '../features/rooms/presentation/room_detail_page.dart';
import '../features/rooms/presentation/rooms_page.dart';
import '../features/schedule/presentation/schedule_page.dart';
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
            GoRoute(path: '/home', builder: (_, _) => const HomePage()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/schedule', builder: (_, _) => const SchedulePage()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/bookings', builder: (_, _) => const BookingsPage()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, _) => const ProfilePage()),
          ]),
        ],
      ),
      GoRoute(
          path: '/rooms',
          pageBuilder: (_, state) => _fadeSlidePage(
              state,
              RoomsPage(initialType: state.uri.queryParameters['type']))),
      GoRoute(
          path: '/rooms/:id',
          pageBuilder: (_, state) => _fadeSlidePage(
              state,
              RoomDetailPage(
                  roomId:
                      int.tryParse(state.pathParameters['id'] ?? '') ?? 0))),
      GoRoute(
          path: '/booking/new',
          pageBuilder: (_, state) => _fadeSlidePage(
              state,
              BookingCreatePage(
                  prefill:
                      BookingPrefill.fromQuery(state.uri.queryParameters)))),
      GoRoute(
          path: '/bookings/:id',
          pageBuilder: (_, state) => _fadeSlidePage(
              state,
              BookingDetailPage(
                  bookingId:
                      int.tryParse(state.pathParameters['id'] ?? '') ?? 0))),
      GoRoute(
          path: '/notifications',
          pageBuilder: (_, state) =>
              _fadeSlidePage(state, const NotificationsPage())),
      GoRoute(
          path: '/chat',
          pageBuilder: (_, state) => _fadeSlidePage(state, const ChatPage())),
    ],
  );
});

CustomTransitionPage<void> _fadeSlidePage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 220),
    reverseTransitionDuration: const Duration(milliseconds: 150),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      if (MediaQuery.disableAnimationsOf(context)) return child;
      final curved =
          CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0.06, 0),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        ),
      );
    },
  );
}
