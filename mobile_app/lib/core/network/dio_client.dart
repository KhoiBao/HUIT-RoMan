import 'package:dio/dio.dart';
import '../config/app_config.dart';

Dio buildDio() => Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 20),
      responseType: ResponseType.json,
      headers: {'Accept': 'application/json'},
    ));
