import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/errors/app_exception.dart';
import 'package:roman_mobile/core/network/api_client.dart';

class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);
  final ResponseBody Function(RequestOptions) handler;

  @override
  Future<ResponseBody> fetch(RequestOptions options,
          Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async =>
      handler(options);

  @override
  void close({bool force = false}) {}
}

Dio dioWith(FakeAdapter adapter) =>
    Dio(BaseOptions(baseUrl: 'http://test'))..httpClientAdapter = adapter;

ResponseBody jsonBody(String body, [int status = 200]) =>
    ResponseBody.fromString(body, status, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });

void main() {
  test('unwraps envelope data', () async {
    final client = ApiClient(
      dioWith(FakeAdapter((_) => jsonBody('{"success":true,"data":{"id":7}}'))),
      () async => 'token',
    );
    final data = await client.get('/api/thing');
    expect((data as Map)['id'], 7);
  });

  test('returns raw login payload', () async {
    final client = ApiClient(
      dioWith(FakeAdapter((_) => jsonBody('{"token":"abc","user":{"id":1}}'))),
      () async => null,
    );
    final data = await client.post('/api/Auth/login', body: {});
    expect((data as Map)['token'], 'abc');
  });

  test('sends bearer token', () async {
    late RequestOptions seen;
    final client = ApiClient(
      dioWith(FakeAdapter((options) {
        seen = options;
        return jsonBody('{"success":true,"data":[]}');
      })),
      () async => 'jwt-token',
    );
    await client.get('/api/rooms');
    expect(seen.headers['Authorization'], 'Bearer jwt-token');
  });

  test('throws UnauthorizedException on 401', () async {
    final client = ApiClient(
      dioWith(FakeAdapter((_) => ResponseBody.fromString('', 401))),
      () async => 'token',
    );
    expect(client.get('/api/x'), throwsA(isA<UnauthorizedException>()));
  });

  test('throws BusinessException when success is false', () async {
    final client = ApiClient(
      dioWith(FakeAdapter(
          (_) => jsonBody('{"success":false,"message":"Không hợp lệ","data":null}'))),
      () async => null,
    );
    expect(
      client.get('/api/x'),
      throwsA(isA<BusinessException>()
          .having((e) => e.message, 'message', 'Không hợp lệ')),
    );
  });
}
