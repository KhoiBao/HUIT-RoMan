import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/errors/app_exception.dart';
import 'package:roman_mobile/core/network/error_mapper.dart';

void main() {
  test('maps 401 to UnauthorizedException with server message', () {
    final err = DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.badResponse,
      response: Response(
        requestOptions: RequestOptions(path: '/x'),
        statusCode: 401,
        data: {'message': 'Sai mật khẩu'},
      ),
    );
    final mapped = mapDioError(err);
    expect(mapped, isA<UnauthorizedException>());
    expect(mapped.message, 'Sai mật khẩu');
  });

  test('maps 403 and 400 with message', () {
    final forbidden = DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.badResponse,
      response: Response(requestOptions: RequestOptions(path: '/x'), statusCode: 403),
    );
    expect(mapDioError(forbidden), isA<ForbiddenException>());

    final bad = DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.badResponse,
      response: Response(
        requestOptions: RequestOptions(path: '/x'),
        statusCode: 400,
        data: {'message': 'Phòng đã được đặt'},
      ),
    );
    final mapped = mapDioError(bad);
    expect(mapped, isA<BusinessException>());
    expect(mapped.message, 'Phòng đã được đặt');
  });

  test('maps timeouts to NetworkException', () {
    expect(
      mapDioError(DioException(
          requestOptions: RequestOptions(path: '/x'),
          type: DioExceptionType.connectionTimeout)),
      isA<NetworkException>(),
    );
  });
}
