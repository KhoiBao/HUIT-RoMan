import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/booking/application/booking_create_controller.dart';
import 'package:roman_mobile/features/booking/application/booking_providers.dart';
import 'package:roman_mobile/features/booking/domain/booking.dart';
import 'package:roman_mobile/features/booking/domain/booking_repository.dart';
import 'package:roman_mobile/features/booking/domain/booking_status.dart';
import 'package:roman_mobile/features/booking/domain/clock_time.dart';

DateTime _vnToday() => DateTime.now().toUtc().add(const Duration(hours: 7));

DateTime _tomorrow() {
  final today = _vnToday();
  return DateTime(today.year, today.month, today.day)
      .add(const Duration(days: 1));
}

AvailableRoom _room(int id, {int capacity = 30}) => AvailableRoom(
      id: id,
      name: 'Phòng $id',
      code: 'P$id',
      building: 'A',
      floor: '2',
      capacity: capacity,
      roomTypeId: 1,
      roomTypeName: 'Phòng nhóm',
      isBookingByPeriod: false,
    );

class _FakeRepository implements BookingRepository {
  _FakeRepository({
    this.eligible = true,
    this.rooms = const [],
  });

  final bool eligible;
  final List<AvailableRoom> rooms;
  BookingDraft? lastDraft;
  AvailabilityQuery? lastQuery;
  int createCalls = 0;

  BookingEligibility get _eligibility => BookingEligibility(
        isEligible: eligible,
        message: eligible ? '' : 'Tài khoản đang bị hạn chế.',
      );

  @override
  Future<List<Booking>> my() async => const [];

  @override
  Future<Booking> byId(int id) async => throw UnimplementedError();

  @override
  Future<Booking> create(BookingDraft draft) async {
    createCalls++;
    lastDraft = draft;
    final now = DateTime.now().toUtc();
    final room = draft.rooms.first;
    return Booking(
      id: 99,
      activityName: draft.activityName,
      purpose: draft.purpose,
      guestCount: draft.guestCount,
      status: BookingStatus.pending,
      requestedAt: now,
      createdAt: now,
      details: [
        BookingDetailItem(
          id: 1,
          roomId: room.id,
          roomName: room.name,
          roomCode: room.code,
          startAt: now,
          endAt: now,
          guestCount: draft.guestCount,
          purpose: draft.purpose,
          status: BookingStatus.pending,
        ),
      ],
    );
  }

  @override
  Future<Booking> checkIn(int id) async => throw UnimplementedError();

  @override
  Future<void> cancel(int id, {required String reason, String? reasonDetail}) async {}

  @override
  Future<List<ApprovalEvent>> approvalHistory(int id) async => const [];

  @override
  Future<List<Period>> periods() async => const [];

  @override
  Future<List<AvailableRoom>> availableRooms(AvailabilityQuery query) async {
    lastQuery = query;
    return rooms;
  }

  @override
  Future<BookingEligibility> eligibility() async => _eligibility;
}

ProviderContainer _container(_FakeRepository repo) {
  final container = ProviderContainer(overrides: [
    bookingRepositoryProvider.overrideWithValue(repo),
  ]);
  addTearDown(container.dispose);
  container.listen(bookingCreateControllerProvider, (_, _) {});
  return container;
}

BookingCreateController _controller(ProviderContainer container) =>
    container.read(bookingCreateControllerProvider.notifier);

Future<void> _settle() => Future<void>.delayed(Duration.zero);

void main() {
  test('walks from time step to a submitted booking', () async {
    final repo = _FakeRepository(rooms: [_room(7)]);
    final container = _container(repo);
    final controller = _controller(container);

    controller.init(const BookingPrefill());
    await _settle();

    final date = _tomorrow();
    controller.setDate(date);
    controller.setStartTime(const ClockTime(8, 0));
    controller.setEndTime(const ClockTime(10, 0));
    controller.next();

    expect(controller.state.step, 1);
    await _settle();

    expect(controller.state.rooms, hasLength(1));
    expect(repo.lastQuery?.mode, BookingMode.hourly);
    expect(repo.lastQuery?.startTime, const ClockTime(8, 0));

    controller.toggleRoom(7);
    controller.next();
    expect(controller.state.step, 2);

    controller.setActivityName('Họp nhóm đồ án');
    controller.setPurpose('Thảo luận đồ án môn học');
    controller.setGuestCount(4);
    final booking = await controller.submit();

    expect(booking, isNotNull);
    expect(controller.state.created?.id, 99);
    expect(repo.createCalls, 1);
    expect(repo.lastDraft?.rooms.single.id, 7);
    expect(repo.lastDraft?.date, date);
    expect(repo.lastDraft?.guestCount, 4);
  });

  test('blocks advancing when the time window is invalid', () async {
    final container = _container(_FakeRepository());
    final controller = _controller(container);

    controller.init(const BookingPrefill());
    await _settle();

    controller.setDate(_tomorrow());
    controller.setStartTime(const ClockTime(6, 0));
    controller.setEndTime(const ClockTime(8, 0));
    controller.next();

    expect(controller.state.step, 0);
    expect(controller.state.timeError, isNotEmpty);
  });

  test('blocks advancing when the account is restricted', () async {
    final container = _container(_FakeRepository(eligible: false));
    final controller = _controller(container);

    controller.init(const BookingPrefill());
    await _settle();

    controller.setDate(_tomorrow());
    controller.setStartTime(const ClockTime(8, 0));
    controller.setEndTime(const ClockTime(10, 0));
    controller.next();

    expect(controller.state.step, 0);
    expect(controller.state.timeError, 'Tài khoản đang bị hạn chế.');
  });

  test('requires at least one room before confirming', () async {
    final repo = _FakeRepository(rooms: [_room(3)]);
    final container = _container(repo);
    final controller = _controller(container);

    controller.init(const BookingPrefill());
    await _settle();

    controller.setDate(_tomorrow());
    controller.setStartTime(const ClockTime(8, 0));
    controller.setEndTime(const ClockTime(10, 0));
    controller.next();
    await _settle();

    controller.next();
    expect(controller.state.step, 1);
    expect(controller.state.roomsError, 'Vui lòng chọn ít nhất một phòng.');
  });

  test('validates the form before calling the repository', () async {
    final repo = _FakeRepository(rooms: [_room(5)]);
    final container = _container(repo);
    final controller = _controller(container);

    controller.init(const BookingPrefill());
    await _settle();

    controller.setDate(_tomorrow());
    controller.setStartTime(const ClockTime(8, 0));
    controller.setEndTime(const ClockTime(10, 0));
    controller.next();
    await _settle();
    controller.toggleRoom(5);
    controller.next();

    final booking = await controller.submit();

    expect(booking, isNull);
    expect(controller.state.formError, contains('Tên hoạt động'));
    expect(repo.createCalls, 0);
  });
}
