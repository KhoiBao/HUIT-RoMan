import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/usage/application/usage_providers.dart';
import 'package:roman_mobile/features/usage/domain/usage_repository.dart';
import 'package:roman_mobile/features/usage/domain/usage_session.dart';
import 'package:roman_mobile/features/usage/presentation/usage_history_page.dart';

class FakeUsageRepository implements UsageRepository {
  FakeUsageRepository(this.sessions);
  final List<UsageSession> sessions;

  @override
  Future<List<UsageSession>> my() async => sessions;
  @override
  Future<UsageSession> byCode(String code) async => throw UnimplementedError();
  @override
  Future<UsageSession> checkIn({
    int? usageSessionId,
    int? bookingDetailId,
    String? confirmationCode,
    int? actualGuestCount,
    String? staffNote,
  }) async =>
      throw UnimplementedError();
  @override
  Future<UsageSession> checkOut(int usageSessionId, CheckOutResultInput input) async =>
      throw UnimplementedError();
  @override
  Future<UsageSession> extend(int usageSessionId, ExtendUsageInput input) async =>
      throw UnimplementedError();
}

UsageSession _session({
  required int id,
  required String room,
  required String status,
  DateTime? checkIn,
  DateTime? checkOut,
}) {
  final start = DateTime.utc(2026, 11, 5, 2, 0); // 09:00 VN
  return UsageSession(
    id: id,
    status: UsageStatus.fromApi(status),
    confirmationCode: 'CODE$id',
    createdAt: start,
    bookingDetailId: id,
    bookingId: id,
    activityName: 'Học nhóm',
    purpose: '',
    guestCount: 3,
    roomId: id,
    roomName: room,
    roomCode: room,
    building: 'Tòa A',
    floor: '2',
    startAt: start,
    endAt: start.add(const Duration(hours: 2)),
    actualCheckIn: checkIn,
    actualCheckOut: checkOut,
  );
}

Widget harness(List<UsageSession> sessions) => ProviderScope(
      overrides: [
        usageRepositoryProvider.overrideWithValue(FakeUsageRepository(sessions)),
      ],
      child: const MaterialApp(home: UsageHistoryPage()),
    );

void main() {
  testWidgets('renders usage sessions with room, time and status',
      (tester) async {
    await tester.pumpWidget(harness([
      _session(id: 1, room: 'Phòng A101', status: 'Hoàn thành'),
      _session(id: 2, room: 'Phòng B204', status: 'Đang sử dụng'),
    ]));
    await tester.pumpAndSettle();

    expect(find.text('Phòng A101'), findsOneWidget);
    expect(find.text('Phòng B204'), findsOneWidget);
    expect(find.text('Học nhóm'), findsNWidgets(2));
    expect(find.text('Hoàn thành'), findsOneWidget);
    expect(find.text('Đang sử dụng'), findsOneWidget);
    // Thời gian nhận/trả thực tế hiển thị khi có
    expect(find.textContaining('09:00'), findsWidgets);
  });

  testWidgets('shows actual check-in and check-out times when present',
      (tester) async {
    await tester.pumpWidget(harness([
      _session(
        id: 1,
        room: 'Phòng A101',
        status: 'Hoàn thành',
        checkIn: DateTime.utc(2026, 11, 5, 2, 5), // 09:05 VN
        checkOut: DateTime.utc(2026, 11, 5, 3, 55), // 10:55 VN
      ),
    ]));
    await tester.pumpAndSettle();

    expect(find.textContaining('Nhận phòng'), findsOneWidget);
    expect(find.textContaining('Trả phòng'), findsOneWidget);
  });

  testWidgets('shows empty state when no sessions', (tester) async {
    await tester.pumpWidget(harness([]));
    await tester.pumpAndSettle();

    expect(find.text('Chưa có phiên sử dụng phòng nào'), findsOneWidget);
  });
}
