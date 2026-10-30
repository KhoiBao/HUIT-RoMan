import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'network/api_client.dart';
import 'network/dio_client.dart';
import 'storage/prefs_store.dart';
import 'storage/token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());
final prefsStoreProvider = Provider<PrefsStore>((ref) => PrefsStore());
final dioProvider = Provider((ref) => buildDio());

final apiClientProvider = Provider<ApiClient>((ref) {
  final tokens = ref.watch(tokenStoreProvider);
  return ApiClient(ref.watch(dioProvider), tokens.read);
});
