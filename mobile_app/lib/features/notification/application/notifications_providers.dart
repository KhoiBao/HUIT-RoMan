import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/notifications_api.dart';

final notificationsApiProvider =
    Provider((ref) => NotificationsApi(ref.watch(apiClientProvider)));

final unreadCountProvider = FutureProvider.autoDispose<int>(
    (ref) => ref.watch(notificationsApiProvider).unreadCount());
