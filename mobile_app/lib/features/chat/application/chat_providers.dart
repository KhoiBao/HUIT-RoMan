import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/providers.dart';
import '../data/chat_api.dart';
import '../data/chat_realtime.dart';
import '../domain/chat_repository.dart';

final chatRepositoryProvider = Provider<ChatRepository>(
    (ref) => ChatApi(ref.watch(apiClientProvider)));

final chatRealtimeProvider = Provider<ChatRealtime>((ref) {
  final tokens = ref.watch(tokenStoreProvider);
  return ChatRealtime(AppConfig.apiBaseUrl, tokens.read);
});
