import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/usage_api.dart';
import '../domain/usage_repository.dart';
import '../domain/usage_session.dart';
import 'session_reminders.dart';

final usageApiProvider =
    Provider((ref) => UsageApi(ref.watch(apiClientProvider)));

final usageRepositoryProvider = Provider<UsageRepository>(
    (ref) => UsageRepositoryImpl(ref.watch(usageApiProvider)));

final sessionRemindersProvider =
    Provider<SessionReminders>((ref) => SessionReminders());

final myUsageProvider = FutureProvider.autoDispose<List<UsageSession>>(
    (ref) => ref.watch(usageRepositoryProvider).my());

final usageByCodeProvider =
    FutureProvider.autoDispose.family<UsageSession, String>(
        (ref, code) => ref.watch(usageRepositoryProvider).byCode(code));
