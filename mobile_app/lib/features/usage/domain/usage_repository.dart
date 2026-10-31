import 'usage_session.dart';

abstract class UsageRepository {
  Future<List<UsageSession>> my();
  Future<UsageSession> byCode(String code);
  Future<UsageSession> checkIn({
    int? usageSessionId,
    int? bookingDetailId,
    String? confirmationCode,
    int? actualGuestCount,
    String? staffNote,
  });
  Future<UsageSession> checkOut(
    int usageSessionId,
    CheckOutResultInput input,
  );
  Future<UsageSession> extend(int usageSessionId, ExtendUsageInput input);
}
