import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../domain/usage_repository.dart';
import '../domain/usage_session.dart';

class UsageApi {
  UsageApi(this._client);
  final ApiClient _client;

  Future<List<UsageSession>> my() async =>
      asList(await _client.get('/api/UsageSessions/my'))
          .map(UsageSession.fromJson)
          .toList()
        ..sort((a, b) => b.startAt.compareTo(a.startAt));

  Future<UsageSession> byCode(String code) async => UsageSession.fromJson(
      asMap(await _client.get('/api/UsageSessions/code/${Uri.encodeComponent(code)}')));

  Future<UsageSession> checkIn({
    int? usageSessionId,
    int? bookingDetailId,
    String? confirmationCode,
    int? actualGuestCount,
    String? staffNote,
  }) async {
    final payload = <String, dynamic>{
      if (usageSessionId != null && usageSessionId > 0)
        'usageSessionId': usageSessionId,
      if (bookingDetailId != null && bookingDetailId > 0)
        'bookingDetailId': bookingDetailId,
      if (confirmationCode != null && confirmationCode.trim().isNotEmpty)
        'confirmationCode': confirmationCode.trim(),
      'actualGuestCount': ?actualGuestCount,
      if (staffNote != null && staffNote.trim().isNotEmpty)
        'staffNote': staffNote.trim(),
    };
    return UsageSession.fromJson(
        asMap(await _client.post('/api/UsageSessions/check-in', body: payload)));
  }

  Future<UsageSession> checkOut(
      int usageSessionId, CheckOutResultInput input) async {
    return UsageSession.fromJson(asMap(await _client.post(
      '/api/UsageSessions/check-out',
      body: {
        'usageSessionId': usageSessionId,
        'roomCondition': input.roomCondition,
        'devicesOk': input.devicesOk,
        'cleaned': input.cleaned,
        'lightsOff': input.lightsOff,
        if (input.staffNote != null && input.staffNote!.trim().isNotEmpty)
          'staffNote': input.staffNote!.trim(),
      },
    )));
  }
  Future<UsageSession> extend(int usageSessionId, ExtendUsageInput input) async {
    final newEndAt = input.newEndAt;
    final newEndPeriodId = input.newEndPeriodId;
    return UsageSession.fromJson(asMap(await _client.post(
      '/api/UsageSessions/$usageSessionId/extend',
      body: {
        'newEndPeriodId': ?newEndPeriodId,
        if (newEndAt != null) 'newEndAt': newEndAt.toUtc().toIso8601String(),
      },
    )));
  }
}

class UsageRepositoryImpl implements UsageRepository {
  UsageRepositoryImpl(this._api);
  final UsageApi _api;

  @override
  Future<List<UsageSession>> my() => _api.my();

  @override
  Future<UsageSession> byCode(String code) => _api.byCode(code);

  @override
  Future<UsageSession> checkIn({
    int? usageSessionId,
    int? bookingDetailId,
    String? confirmationCode,
    int? actualGuestCount,
    String? staffNote,
  }) =>
      _api.checkIn(
        usageSessionId: usageSessionId,
        bookingDetailId: bookingDetailId,
        confirmationCode: confirmationCode,
        actualGuestCount: actualGuestCount,
        staffNote: staffNote,
      );

  @override
  Future<UsageSession> checkOut(int usageSessionId, CheckOutResultInput input) =>
      _api.checkOut(usageSessionId, input);

  @override
  Future<UsageSession> extend(int usageSessionId, ExtendUsageInput input) =>
      _api.extend(usageSessionId, input);
}
