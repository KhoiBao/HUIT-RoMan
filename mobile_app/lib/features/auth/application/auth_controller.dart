import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/providers.dart';
import '../domain/session_user.dart';
import 'auth_providers.dart';

class AuthState {
  const AuthState({
    this.user,
    this.restoring = true,
    this.busy = false,
    this.error,
  });

  final SessionUser? user;
  final bool restoring;
  final bool busy;
  final String? error;

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    SessionUser? user,
    bool? restoring,
    bool? busy,
    String? error,
    bool clearUser = false,
    bool clearError = false,
  }) =>
      AuthState(
        user: clearUser ? null : (user ?? this.user),
        restoring: restoring ?? this.restoring,
        busy: busy ?? this.busy,
        error: clearError ? null : (error ?? this.error),
      );
}

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> restore() async {
    final tokens = ref.read(tokenStoreProvider);
    final token = await tokens.read();
    if (token == null || token.isEmpty) {
      state = state.copyWith(restoring: false, clearUser: true);
      return;
    }
    try {
      final user = await ref.read(authRepositoryProvider).me();
      state = state.copyWith(user: user, restoring: false, clearError: true);
    } on UnauthorizedException {
      await tokens.clear();
      state = const AuthState(restoring: false);
    } catch (_) {
      state = state.copyWith(restoring: false);
    }
  }

  Future<bool> login(String identifier, String password) async {
    state = state.copyWith(busy: true, clearError: true);
    try {
      final user =
          await ref.read(authRepositoryProvider).login(identifier, password);
      state = AuthState(user: user, restoring: false);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(busy: false, error: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(busy: false, error: 'Đăng nhập thất bại');
      return false;
    }
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AuthState(restoring: false);
  }

  Future<void> sessionExpired() async {
    await ref.read(tokenStoreProvider).clear();
    state = const AuthState(restoring: false);
  }

  Future<void> refreshUser() async {
    try {
      final user = await ref.read(authRepositoryProvider).me();
      state = state.copyWith(user: user);
    } catch (_) {
      // Keep the cached profile when a refresh fails.
    }
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
