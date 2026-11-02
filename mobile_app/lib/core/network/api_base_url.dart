import 'package:dio/dio.dart';

import '../config/app_config.dart';

/// API base URL inject qua `--dart-define=API_BASE_URL` (override thủ công).
const _envApiBaseUrl = String.fromEnvironment('API_BASE_URL');

/// Thứ tự ưu tiên khi tự dò địa chỉ API (dừng ở cái nào phản hồi `/api/health`).
const autoCandidates = <String>[
  'http://127.0.0.1:${AppConfig.apiPort}', // adb reverse tcp:5056 qua USB
  'http://10.0.2.2:${AppConfig.apiPort}', // Android emulator
  'http://192.168.1.7:${AppConfig.apiPort}', // máy dev trong LAN (Wi-Fi)
];

/// Chọn địa chỉ API lúc khởi động.
///
/// 1. `--dart-define=API_BASE_URL=...` nếu được cung cấp — dùng trực tiếp.
/// 2. Thử từng ứng viên theo thứ tự, cái nào trả `/api/health` 200 thì lấy.
/// 3. Không ứng viên nào phản hồi → trả về mặc định của emulator để app
///    báo lỗi như thường lệ.
Future<String> resolveApiBaseUrl() async {
  if (_envApiBaseUrl.isNotEmpty) return _envApiBaseUrl;
  for (final base in autoCandidates) {
    if (await _responds(base)) return base;
  }
  return 'http://10.0.2.2:${AppConfig.apiPort}';
}

Future<bool> _responds(String base) async {
  try {
    final dio = Dio(BaseOptions(
      baseUrl: base,
      connectTimeout: const Duration(milliseconds: 1500),
      receiveTimeout: const Duration(milliseconds: 1500),
      sendTimeout: const Duration(milliseconds: 1000),
    ));
    final res = await dio.get<Object>('/api/health');
    return res.statusCode == 200;
  } catch (_) {
    return false;
  }
}
