import 'feedback.dart';

abstract class FeedbackRepository {
  Future<Feedback?> byBooking(int bookingId);
  Future<Feedback> create({
    required int rating,
    int? bookingId,
    int? usageSessionId,
    String? comment,
  });
}
