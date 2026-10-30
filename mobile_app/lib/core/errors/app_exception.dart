sealed class AppException implements Exception {
  const AppException(this.message);
  final String message;
  @override
  String toString() => message;
}

final class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Phiên đăng nhập đã hết hạn']);
}

final class ForbiddenException extends AppException {
  const ForbiddenException([super.message = 'Bạn không có quyền thực hiện thao tác này']);
}

final class NetworkException extends AppException {
  const NetworkException(
      [super.message = 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.']);
}

class BusinessException extends AppException {
  const BusinessException(super.message, {this.fieldErrors = const {}});
  final Map<String, String> fieldErrors;
}

final class UnknownException extends AppException {
  const UnknownException([super.message = 'Đã có lỗi xảy ra, vui lòng thử lại']);
}
