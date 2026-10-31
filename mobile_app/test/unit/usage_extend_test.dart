import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/network/api_client.dart';
import 'package:roman_mobile/features/usage/data/usage_api.dart';
import 'package:roman_mobile/features/usage/domain/usage_session.dart';

class _RecordingClient implements ApiClient {
  String? path;
  Object? body;

  @override
  Future<dynamic> post(String path,
      {Object? body, Map<String, dynamic>? query}) async {
    this.path = path;
    this.body = body;
    return <String, dynamic>{
      'id': 7,
      'status': 'Đang sử dụng',
      'roomId': 3,
      'roomName': 'Phòng học nhóm TV01',
      'startAt': '2026-10-31T03:00:00Z',
      'endAt': '2026-10-31T06:00:00Z',
    };
  }

  @override
  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      throw UnimplementedError();

  @override
  Future<dynamic> put(String path, {Object? body}) =>
      throw UnimplementedError();

  @override
  Future<dynamic> patch(String path, {Object? body}) =>
      throw UnimplementedError();

  @override
  Future<dynamic> delete(String path) => throw UnimplementedError();
}

void main() {
  test('period extension sends only the new end period id', () async {
    final client = _RecordingClient();
    final api = UsageApi(client);

    await api.extend(7, const ExtendUsageInput.byPeriod(12));

    expect(client.path, '/api/UsageSessions/7/extend');
    expect(client.body, {'newEndPeriodId': 12});
  });

  test('time extension sends the new end instant in UTC', () async {
    final client = _RecordingClient();
    final api = UsageApi(client);

    await api.extend(
      7,
      ExtendUsageInput.byTime(DateTime.utc(2026, 10, 31, 6, 30)),
    );

    expect(client.body, {'newEndAt': '2026-10-31T06:30:00.000Z'});
  });
}
