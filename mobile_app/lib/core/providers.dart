import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'network/api_client.dart';
import 'network/dio_client.dart';
import 'storage/prefs_store.dart';
import 'storage/token_store.dart';

/// Địa chỉ API đã dò xong lúc khởi động — `main()` override giá trị này.
final apiBaseUrlProvider = Provider<String>(
  (ref) => throw UnimplementedError('apiBaseUrlProvider must be overridden in main()'),
);

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());
final prefsStoreProvider = Provider<PrefsStore>((ref) => PrefsStore());
final dioProvider = Provider((ref) => buildDio(ref.watch(apiBaseUrlProvider)));

final apiClientProvider = Provider<ApiClient>((ref) {
  final tokens = ref.watch(tokenStoreProvider);
  return ApiClient(ref.watch(dioProvider), tokens.read);
});
