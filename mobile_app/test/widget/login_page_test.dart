import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/auth/application/auth_providers.dart';
import 'package:roman_mobile/features/auth/domain/auth_repository.dart';
import 'package:roman_mobile/features/auth/domain/session_user.dart';
import 'package:roman_mobile/features/auth/domain/user_role.dart';
import 'package:roman_mobile/features/auth/presentation/login_page.dart';

class FakeAuthRepository implements AuthRepository {
  @override
  Future<SessionUser> login(String id, String password) async =>
      const SessionUser(
        id: 1,
        cardCode: 'SV01',
        fullName: 'Nguyễn An',
        email: 'a@huit.edu.vn',
        role: UserRole.student,
      );

  @override
  Future<SessionUser> me() async => throw UnimplementedError();
  @override
  Future<String?> forgotPassword(String id) async => null;
  @override
  Future<void> resetPassword(String id, String token, String password) async {}
  @override
  Future<void> logout() async {}
}

Widget harness() => ProviderScope(
      overrides: [authRepositoryProvider.overrideWithValue(FakeAuthRepository())],
      child: MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: const LoginPage(),
        ),
      ),
    );

void main() {
  testWidgets('validates empty form and shows errors', (tester) async {
    await tester.pumpWidget(harness());
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Nhập email, MSSV hoặc mã CBVC'), findsOneWidget);
    expect(find.text('Nhập mật khẩu'), findsOneWidget);
  });

  testWidgets('submits valid credentials', (tester) async {
    await tester.pumpWidget(harness());
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('login-identifier')), 'SV01');
    await tester.enterText(find.byKey(const Key('login-password')), '123456');
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Nhập mật khẩu'), findsNothing);
  });
}
