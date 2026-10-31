import '../../../core/storage/token_store.dart';
import '../domain/auth_repository.dart';
import '../domain/session_user.dart';
import 'auth_api.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._api, this._tokens);
  final AuthApi _api;
  final TokenStore _tokens;

  @override
  Future<SessionUser> login(String identifier, String password) async {
    final token = await _api.login(identifier, password);
    await _tokens.write(token);
    return _api.me();
  }

  @override
  Future<SessionUser> me() => _api.me();

  @override
  Future<String?> forgotPassword(String identifier) =>
      _api.forgotPassword(identifier);

  @override
  Future<void> resetPassword(
          String identifier, String resetToken, String newPassword) =>
      _api.resetPassword(identifier, resetToken, newPassword);

  @override
  Future<void> logout() => _tokens.clear();
}
