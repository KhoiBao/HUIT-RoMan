import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app/app.dart';
import 'core/network/api_base_url.dart';
import 'core/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi');

  // Dò địa chỉ API trước khi dựng app: chỉ cần `flutter run`,
  // không cần --dart-define (vẫn được ưu tiên nếu có truyền vào).
  final apiBaseUrl = await resolveApiBaseUrl();
  runApp(ProviderScope(
    overrides: [apiBaseUrlProvider.overrideWithValue(apiBaseUrl)],
    child: const RomanApp(),
  ));
}
