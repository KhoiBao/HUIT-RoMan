import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/history_api.dart';
import '../domain/violation_record.dart';

final historyApiProvider =
    Provider((ref) => HistoryApi(ref.watch(apiClientProvider)));

final historyRepositoryProvider = Provider<HistoryRepository>(
    (ref) => HistoryRepositoryImpl(ref.watch(historyApiProvider)));

final myViolationsProvider = FutureProvider.autoDispose<List<ViolationRecord>>(
    (ref) => ref.watch(historyRepositoryProvider).myViolations());

final myEligibilityProvider = FutureProvider.autoDispose<UserEligibility>(
    (ref) => ref.watch(historyRepositoryProvider).myEligibility());
