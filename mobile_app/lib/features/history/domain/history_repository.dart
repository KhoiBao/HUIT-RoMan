import 'violation_record.dart';

abstract class HistoryRepository {
  Future<List<ViolationRecord>> myViolations();
  Future<UserEligibility> myEligibility();
}
