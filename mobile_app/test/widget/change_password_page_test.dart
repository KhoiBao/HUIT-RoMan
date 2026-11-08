import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:roman_mobile/core/errors/app_exception.dart';
import 'package:roman_mobile/features/auth/application/auth_providers.dart';
import 'package:roman_mobile/features/auth/domain/auth_repository.dart';
import 'package:roman_mobile/features/auth/domain/session_user.dart';
import 'package:roman_mobile/features/auth/presentation/change_password_page.dart';

class RecordingAuthRepository implements AuthRepository {
  @override
  Future<SessionUser> login(String id, String password) async =>
      throw UnimplementedError();
  @override
  Future<SessionUser> me() async => throw UnimplementedError();
  @override
  Future<void> forgotPassword(String id) async {}
  @override
  Future<void> resetPassword(String id, String token, String password) async {}
  @override
  Future<void> logout() async {}

  List<(String, String)> changePasswordCalls = [];
  Object? changePasswordError;

  @override
  Future<void> changePassword(String currentPassword, String newPassword) async {
    changePasswordCalls.add((currentPassword, newPassword));
    if (changePasswordError != null) throw changePasswordError!;
  }
}

(Widget, GoRouter) harness(RecordingAuthRepository repo) {
  final router = GoRouter(
    initialLocation: '/start',
    routes: [
      GoRoute(
          path: '/start',
          builder: (_, _) => const Scaffold(body: SizedBox())),
      GoRoute(
        path: '/change-password',
        builder: (_, _) => const ChangePasswordPage(),
      ),
    ],
  );
  final widget = ProviderScope(
    overrides: [authRepositoryProvider.overrideWithValue(repo)],
    child: MaterialApp.router(
      routerConfig: router,
      builder: (context, child) => MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: child!,
      ),
    ),
  );
  return (widget, router);
}

Future<void> _fillAndSubmit(WidgetTester tester) async {
  await tester.enterText(
      find.byKey(const Key('change-current')), 'OldPass@123');
  await tester.enterText(find.byKey(const Key('change-new')), 'NewPass@456');
  await tester.enterText(find.byKey(const Key('change-confirm')), 'NewPass@456');
  await tester.tap(find.byKey(const Key('change-submit')));
  await tester.pumpAndSettle();
}

void main() {
  Future<void> pumpPage(WidgetTester tester, RecordingAuthRepository repo) async {
    final (widget, router) = harness(repo);
    await tester.pumpWidget(widget);
    router.push('/change-password');
    await tester.pumpAndSettle();
  }

  testWidgets('validates required fields and confirmation mismatch',
      (tester) async {
    final repo = RecordingAuthRepository();
    await pumpPage(tester, repo);

    await tester.tap(find.byKey(const Key('change-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Nhập mật khẩu hiện tại'), findsOneWidget);
    expect(find.text('Mật khẩu tối thiểu 6 ký tự'), findsOneWidget);
    expect(repo.changePasswordCalls, isEmpty);

    await tester.enterText(
        find.byKey(const Key('change-current')), 'OldPass@123');
    await tester.enterText(find.byKey(const Key('change-new')), 'NewPass@456');
    await tester.enterText(find.byKey(const Key('change-confirm')), 'Diff@456');
    await tester.tap(find.byKey(const Key('change-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Mật khẩu xác nhận không khớp'), findsOneWidget);
    expect(repo.changePasswordCalls, isEmpty);
  });

  testWidgets('submits current and new password then pops back',
      (tester) async {
    final repo = RecordingAuthRepository();
    await pumpPage(tester, repo);

    await _fillAndSubmit(tester);

    expect(repo.changePasswordCalls,
        [('OldPass@123', 'NewPass@456')]);
    expect(find.text('Đổi mật khẩu thành công.'), findsOneWidget);
    expect(find.byType(ChangePasswordPage), findsNothing);
  });

  testWidgets('shows server error when current password is wrong',
      (tester) async {
    final repo = RecordingAuthRepository();
    repo.changePasswordError =
        const BusinessException('Mật khẩu hiện tại không đúng.');
    await pumpPage(tester, repo);

    await _fillAndSubmit(tester);

    expect(find.text('Mật khẩu hiện tại không đúng.'), findsOneWidget);
    expect(find.byType(ChangePasswordPage), findsOneWidget);
  });
}
