import '../../../core/network/api_client.dart';
import '../../../core/network/api_envelope.dart';
import '../domain/feedback.dart';
import '../domain/feedback_repository.dart';

class FeedbackApi {
  FeedbackApi(this._client);
  final ApiClient _client;

  Future<Feedback?> byBooking(int bookingId) async {
    final data = await _client.get('/api/Feedbacks/by-booking/$bookingId');
    final map = asMap(data);
    if (map.isEmpty) return null;
    final feedback = Feedback.fromJson(map);
    return feedback.id == 0 ? null : feedback;
  }

  Future<Feedback> create({
    required int rating,
    int? bookingId,
    int? usageSessionId,
    String? comment,
  }) async {
    final data = await _client.post('/api/Feedbacks', body: {
      'rating': rating,
      'bookingId': ?bookingId,
      'usageSessionId': ?usageSessionId,
      if (comment != null && comment.trim().isNotEmpty)
        'comment': comment.trim(),
    });
    return Feedback.fromJson(asMap(data));
  }
}

class FeedbackRepositoryImpl implements FeedbackRepository {
  FeedbackRepositoryImpl(this._api);
  final FeedbackApi _api;

  @override
  Future<Feedback?> byBooking(int bookingId) => _api.byBooking(bookingId);

  @override
  Future<Feedback> create({
    required int rating,
    int? bookingId,
    int? usageSessionId,
    String? comment,
  }) =>
      _api.create(
        rating: rating,
        bookingId: bookingId,
        usageSessionId: usageSessionId,
        comment: comment,
      );
}
