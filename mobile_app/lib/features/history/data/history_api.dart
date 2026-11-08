import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../domain/history_repository.dart';
import '../domain/violation_record.dart';

export '../domain/history_repository.dart';
export '../domain/violation_record.dart' show UserEligibility;

class HistoryApi {
  HistoryApi(this._client);
  final ApiClient _client;

  Future<List<ViolationRecord>> myViolations() async =>
      asList(await _client.get('/api/Violations/my-violations'))
          .map(ViolationRecord.fromJson)
          .toList(growable: false);

  Future<UserEligibility> myEligibility() async => UserEligibility.fromJson(
      asMap(await _client.get('/api/Violations/my-eligibility')));
}

class HistoryRepositoryImpl implements HistoryRepository {
  HistoryRepositoryImpl(this._api);
  final HistoryApi _api;

  @override
  Future<List<ViolationRecord>> myViolations() => _api.myViolations();

  @override
  Future<UserEligibility> myEligibility() => _api.myEligibility();
}
