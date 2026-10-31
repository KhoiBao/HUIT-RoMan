import 'booking.dart';

abstract class BookingRepository {
  Future<List<Booking>> my();
  Future<Booking> byId(int id);
  Future<Booking> create(BookingDraft draft);
  Future<Booking> checkIn(int id);
  Future<void> cancel(int id, {required String reason, String? reasonDetail});
  Future<List<ApprovalEvent>> approvalHistory(int id);
  Future<List<Period>> periods();
  Future<List<AvailableRoom>> availableRooms(AvailabilityQuery query);
  Future<BookingEligibility> eligibility();
}
