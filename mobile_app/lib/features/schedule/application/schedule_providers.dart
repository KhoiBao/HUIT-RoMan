import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/schedule_api.dart';
import '../domain/schedule_entry.dart';

final scheduleApiProvider =
    Provider((ref) => ScheduleApi(ref.watch(apiClientProvider)));

final daySchedulesProvider =
    FutureProvider.autoDispose.family<List<ScheduleEntry>, String>(
        (ref, date) => ref.watch(scheduleApiProvider).between(
              DateTime.parse(date),
              DateTime.parse(date),
            ));

final todaySchedulesProvider = FutureProvider.autoDispose<List<ScheduleEntry>>(
  (ref) {
    final today = DateTime.now();
    final key = DateTime(today.year, today.month, today.day).toIso8601String();
    return ref.watch(daySchedulesProvider(key).future);
  },
);
