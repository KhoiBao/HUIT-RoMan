import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../../../core/utils/date_time_x.dart';
import '../domain/schedule_entry.dart';

class ScheduleApi {
  ScheduleApi(this._client);
  final ApiClient _client;

  Future<List<ScheduleEntry>> between(DateTime from, DateTime to) async {
    final data = await _client.get('/api/Bookings/schedules', query: {
      'from': DateTimeX.dateOf(from),
      'to': DateTimeX.dateOf(to),
    });
    return asList(data).map(ScheduleEntry.fromJson).toList();
  }
}
