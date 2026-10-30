import 'package:dio/dio.dart';
import '../errors/app_exception.dart';
import 'api_envelope.dart';
import 'error_mapper.dart';

typedef TokenReader = Future<String?> Function();

class ApiClient {
  ApiClient(this._dio, this._tokenReader);

  final Dio _dio;
  final TokenReader _tokenReader;

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _request((options) => _dio.get(path, queryParameters: _clean(query), options: options));

  Future<dynamic> post(String path,
          {Object? body, Map<String, dynamic>? query}) =>
      _request((options) => _dio.post(path,
          data: body, queryParameters: _clean(query), options: options));

  Future<dynamic> put(String path, {Object? body}) =>
      _request((options) => _dio.put(path, data: body, options: options));

  Future<dynamic> patch(String path, {Object? body}) =>
      _request((options) => _dio.patch(path, data: body, options: options));

  Future<dynamic> delete(String path) =>
      _request((options) => _dio.delete(path, options: options));

  Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    return {
      for (final e in query.entries)
        if (e.value != null) e.key: e.value,
    };
  }

  Future<dynamic> _request(
      Future<Response<dynamic>> Function(Options options) send) async {
    final token = await _tokenReader();
    final options = Options(headers: {
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    });
    try {
      final response = await send(options);
      return _unwrap(response.data);
    } on DioException catch (e) {
      throw mapDioError(e);
    } on AppException {
      rethrow;
    } catch (_) {
      throw const UnknownException();
    }
  }

  dynamic _unwrap(dynamic raw) {
    if (raw is Map<String, dynamic> && raw.containsKey('success')) {
      final envelope = ApiEnvelope.fromJson(raw);
      if (!envelope.success) {
        throw BusinessException(envelope.message ?? 'Yêu cầu không thành công');
      }
      return envelope.data;
    }
    if (raw is Map) {
      final map = Map<String, dynamic>.from(raw);
      if (map.containsKey('success')) {
        final envelope = ApiEnvelope.fromJson(map);
        if (!envelope.success) {
          throw BusinessException(envelope.message ?? 'Yêu cầu không thành công');
        }
        return envelope.data;
      }
    }
    return raw;
  }
}
