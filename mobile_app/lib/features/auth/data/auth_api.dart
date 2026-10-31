import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../domain/session_user.dart';

class AuthApi {
  AuthApi(this._client);
  final ApiClient _client;

  Future<String> login(String identifier, String password) async {
    final data = await _client.post('/api/Auth/login', body: {
      'cardCode': identifier,
      'password': password,
    });
    return (data as Map)['token'] as String;
  }

  Future<SessionUser> me() async {
    final data = await _client.get('/api/Users/me');
    return SessionUser.fromJson(asMap(data));
  }

  Future<String?> forgotPassword(String identifier) async {
    final data = await _client.post(
      '/api/Auth/forgot-password',
      body: {'identifier': identifier},
    );
    return asMap(data)['resetToken'] as String?;
  }

  Future<void> resetPassword(
          String identifier, String resetToken, String newPassword) =>
      _client.post('/api/Auth/reset-password', body: {
        'identifier': identifier,
        'resetToken': resetToken,
        'newPassword': newPassword,
      });
}
