import 'package:dio/dio.dart';

Dio buildDio(String baseUrl) => Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 20),
      responseType: ResponseType.json,
      headers: {'Accept': 'application/json'},
    ));
