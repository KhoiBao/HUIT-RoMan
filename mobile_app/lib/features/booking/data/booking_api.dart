import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../../../core/utils/date_time_x.dart';
import '../domain/booking.dart';
import '../domain/booking_repository.dart';

class BookingApi {
  BookingApi(this._client);
  final ApiClient _client;

  Future<List<Booking>> my() async =>
      asList(await _client.get('/api/Bookings/my'))
          .map(Booking.fromJson)
          .toList()
        ..sort((a, b) => b.startAt.compareTo(a.startAt));

  Future<Booking> byId(int id) async =>
      Booking.fromJson(asMap(await _client.get('/api/Bookings/$id')));

  Future<Booking> create(BookingDraft draft) async {
    final payload = _payloadFor(draft);
    return Booking.fromJson(asMap(await _client.post('/api/Bookings', body: payload)));
  }

  Future<Booking> checkIn(int id) async =>
      Booking.fromJson(asMap(await _client.post('/api/Bookings/$id/check-in')));

  Future<void> cancel(int id,
      {required String reason, String? reasonDetail}) async {
    await _client.patch(
      '/api/Bookings/$id/cancel',
      body: {
        'reason': reason,
        if (reasonDetail != null && reasonDetail.trim().isNotEmpty)
          'reasonDetail': reasonDetail.trim(),
      },
    );
  }

  Future<List<ApprovalEvent>> approvalHistory(int id) async =>
      asList(await _client.get('/api/Bookings/$id/approval-history'))
          .map(ApprovalEvent.fromJson)
          .toList()
        ..sort((a, b) => b.decidedAt.compareTo(a.decidedAt));

  Future<List<Period>> periods() async =>
      asList(await _client.get('/api/Bookings/periods'))
          .map(Period.fromJson)
          .toList();

  Future<List<AvailableRoom>> availableRooms(AvailabilityQuery query) async {
    final map = await _client.get('/api/Rooms/available', query: {
      'date': DateTimeX.dateOf(query.date),
      if (query.mode == BookingMode.period &&
          query.startPeriodId != null &&
          query.endPeriodId != null) ...{
        'startPeriodId': query.startPeriodId,
        'endPeriodId': query.endPeriodId,
      } else if (query.startTime != null && query.endTime != null) ...{
        'startTime': query.startTime!.api,
        'endTime': query.endTime!.api,
      },
    });
    return asList(map).map(AvailableRoom.fromJson).toList();
  }

  Future<BookingEligibility> eligibility() async =>
      BookingEligibility.fromJson(
          asMap(await _client.get('/api/Violations/my-eligibility')));

  Map<String, dynamic> _payloadFor(BookingDraft draft) {
    final startClock = draft.mode == BookingMode.period
        ? (draft.startPeriod?.start ?? draft.startTime)
        : draft.startTime;
    final endClock = draft.mode == BookingMode.period
        ? (draft.endPeriod?.end ?? draft.endTime)
        : draft.endTime;

    final startAt = DateTimeX.fromVietnamWallClock(DateTime(
      draft.date.year,
      draft.date.month,
      draft.date.day,
      startClock?.hour ?? 7,
      startClock?.minute ?? 0,
    ));
    final endAt = DateTimeX.fromVietnamWallClock(DateTime(
      draft.date.year,
      draft.date.month,
      draft.date.day,
      endClock?.hour ?? 8,
      endClock?.minute ?? 0,
    ));

    return {
      'activityName': draft.activityName.trim(),
      'purpose': draft.purpose.trim(),
      'guestCount': draft.guestCount,
      'note': draft.note.trim(),
      'details': [
        for (final room in draft.rooms)
          {
            'roomId': room.id,
            'startAt': startAt.toIso8601String(),
            'endAt': endAt.toIso8601String(),
            if (draft.mode == BookingMode.period) ...{
              'startPeriodId': draft.startPeriod?.id,
              'endPeriodId': draft.endPeriod?.id,
            },
            'guestCount': draft.guestCount,
            'purpose': draft.purpose.trim(),
          },
      ],
    };
  }
}

class BookingRepositoryImpl implements BookingRepository {
  BookingRepositoryImpl(this._api);
  final BookingApi _api;

  @override
  Future<List<Booking>> my() => _api.my();

  @override
  Future<Booking> byId(int id) => _api.byId(id);

  @override
  Future<Booking> create(BookingDraft draft) => _api.create(draft);

  @override
  Future<Booking> checkIn(int id) => _api.checkIn(id);

  @override
  Future<void> cancel(int id, {required String reason, String? reasonDetail}) =>
      _api.cancel(id, reason: reason, reasonDetail: reasonDetail);

  @override
  Future<List<ApprovalEvent>> approvalHistory(int id) =>
      _api.approvalHistory(id);

  @override
  Future<List<Period>> periods() => _api.periods();

  @override
  Future<List<AvailableRoom>> availableRooms(AvailabilityQuery query) =>
      _api.availableRooms(query);

  @override
  Future<BookingEligibility> eligibility() => _api.eligibility();
}
