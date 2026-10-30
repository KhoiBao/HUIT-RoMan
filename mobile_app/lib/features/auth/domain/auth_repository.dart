import 'session_user.dart';

abstract class AuthRepository {
  Future<SessionUser> login(String identifier, String password);
  Future<SessionUser> me();
  Future<String?> forgotPassword(String identifier);
  Future<void> resetPassword(String identifier, String resetToken, String newPassword);
  Future<void> logout();
}
