import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/feedback_api.dart';
import '../domain/feedback.dart';
import '../domain/feedback_repository.dart';

final feedbackApiProvider =
    Provider((ref) => FeedbackApi(ref.watch(apiClientProvider)));

final feedbackRepositoryProvider = Provider<FeedbackRepository>(
    (ref) => FeedbackRepositoryImpl(ref.watch(feedbackApiProvider)));

final bookingFeedbackProvider =
    FutureProvider.autoDispose.family<Feedback?, int>(
        (ref, bookingId) => ref.watch(feedbackRepositoryProvider).byBooking(bookingId));
