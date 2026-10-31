import 'package:dio/dio.dart';
import '../errors/app_exception.dart';

AppException mapDioError(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
      return const NetworkException();
    case DioExceptionType.badResponse:
      return _mapResponse(error.response);
    default:
      return const UnknownException();
  }
}

AppException _mapResponse(Response<dynamic>? response) {
  final status = response?.statusCode ?? 0;
  final data = response?.data;
  final message = switch (data) {
    Map m when m['message'] is String => m['message'] as String,
    Map m when m['title'] is String => m['title'] as String,
    String s when s.isNotEmpty => s,
    _ => null,
  };

  if (status == 401) {
    return UnauthorizedException((message == null || message.isEmpty)
        ? 'Phiên đăng nhập đã hết hạn'
        : message);
  }
  if (status == 403) {
    return ForbiddenException((message == null || message.isEmpty)
        ? 'Bạn không có quyền thực hiện thao tác này'
        : message);
  }
  if (status == 400 && data is Map && data['errors'] is Map) {
    final errors = <String, String>{};
    (data['errors'] as Map).forEach((k, v) {
      if (v is List && v.isNotEmpty) errors[k.toString()] = v.first.toString();
    });
    final first = errors.values.isEmpty ? 'Dữ liệu không hợp lệ' : errors.values.first;
    return BusinessException(first, fieldErrors: errors);
  }
  if (message != null && message.isNotEmpty) {
    return BusinessException(message);
  }
  if (status == 404) return const BusinessException('Không tìm thấy dữ liệu');
  if (status == 409) {
    return const BusinessException('Dữ liệu đã thay đổi, vui lòng tải lại');
  }
  return const UnknownException();
}
