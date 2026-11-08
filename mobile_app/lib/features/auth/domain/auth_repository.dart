import 'session_user.dart';

abstract class AuthRepository {
  Future<SessionUser> login(String identifier, String password);
  Future<SessionUser> me();
  Future<void> forgotPassword(String identifier);
  Future<void> resetPassword(String identifier, String resetToken, String newPassword);
  Future<void> changePassword(String currentPassword, String newPassword);
  Future<void> logout();
}
