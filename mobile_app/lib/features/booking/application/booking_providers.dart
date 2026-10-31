import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/booking_api.dart';
import '../domain/booking.dart';
import '../domain/booking_repository.dart';

final bookingApiProvider =
    Provider((ref) => BookingApi(ref.watch(apiClientProvider)));

final bookingRepositoryProvider = Provider<BookingRepository>(
    (ref) => BookingRepositoryImpl(ref.watch(bookingApiProvider)));

final myBookingsProvider = FutureProvider.autoDispose<List<Booking>>(
    (ref) => ref.watch(bookingRepositoryProvider).my());

final bookingByIdProvider = FutureProvider.autoDispose.family<Booking, int>(
    (ref, id) => ref.watch(bookingRepositoryProvider).byId(id));

final approvalHistoryProvider =
    FutureProvider.autoDispose.family<List<ApprovalEvent>, int>(
        (ref, id) => ref.watch(bookingRepositoryProvider).approvalHistory(id));

final bookingEligibilityProvider =
    FutureProvider.autoDispose<BookingEligibility>(
        (ref) => ref.watch(bookingRepositoryProvider).eligibility());

final periodsProvider = FutureProvider.autoDispose<List<Period>>(
    (ref) => ref.watch(bookingRepositoryProvider).periods());
