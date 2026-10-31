import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/auth/application/auth_controller.dart';
import 'package:roman_mobile/features/auth/domain/session_user.dart';
import 'package:roman_mobile/features/auth/domain/user_role.dart';
import 'package:roman_mobile/features/notification/application/notifications_providers.dart';
import 'package:roman_mobile/features/profile/presentation/profile_page.dart';

class _FakeAuthController extends AuthController {
  _FakeAuthController(this.initial);

  final AuthState initial;
  bool logoutCalled = false;

  @override
  AuthState build() => initial;

  @override
  Future<void> logout() async {
    logoutCalled = true;
    state = const AuthState(restoring: false);
  }

  @override
  Future<void> refreshUser() async {}
}

const _student = SessionUser(
  id: 7,
  cardCode: 'SV001',
  fullName: 'Nguyễn Văn A',
  email: 'sv001@huit.edu.vn',
  role: UserRole.student,
  departmentName: 'Khoa Công nghệ Thông tin',
);

void main() {
  testWidgets('shows the signed-in profile', (tester) async {
    final auth = _FakeAuthController(
      const AuthState(user: _student, restoring: false),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(() => auth),
          unreadCountProvider.overrideWith((ref) async => 0),
        ],
        child: const MaterialApp(home: ProfilePage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Nguyễn Văn A'), findsOneWidget);
    expect(find.text('Sinh viên'), findsOneWidget);
    expect(find.text('SV001'), findsOneWidget);
    expect(find.text('sv001@huit.edu.vn'), findsOneWidget);
    expect(find.text('Khoa Công nghệ Thông tin'), findsOneWidget);
  });

  testWidgets('logout asks for confirmation before signing out', (tester) async {
    final auth = _FakeAuthController(
      const AuthState(user: _student, restoring: false),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(() => auth),
          unreadCountProvider.overrideWith((ref) async => 0),
        ],
        child: const MaterialApp(home: ProfilePage()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Đăng xuất'));
    await tester.pumpAndSettle();

    expect(find.text('Đăng xuất?'), findsOneWidget);
    expect(auth.logoutCalled, isFalse);

    await tester.tap(find.descendant(
      of: find.byType(AlertDialog),
      matching: find.text('Đăng xuất'),
    ));
    await tester.pumpAndSettle();

    expect(auth.logoutCalled, isTrue);
  });
}
