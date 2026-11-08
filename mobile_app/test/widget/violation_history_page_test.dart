import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/history/application/history_providers.dart';
import 'package:roman_mobile/features/history/data/history_api.dart';
import 'package:roman_mobile/features/history/domain/violation_record.dart';
import 'package:roman_mobile/features/history/presentation/violation_history_page.dart';

class FakeHistoryRepository implements HistoryRepository {
  FakeHistoryRepository({this.violations = const [], this.eligibility});

  final List<ViolationRecord> violations;
  final UserEligibility? eligibility;
  int eligibilityCalls = 0;

  @override
  Future<List<ViolationRecord>> myViolations() async => violations;

  @override
  Future<UserEligibility> myEligibility() async {
    eligibilityCalls++;
    return eligibility ??
        const UserEligibility(
          isEligible: true,
          message: '',
          hasActiveRestriction: false,
        );
  }
}

Map<String, dynamic> _violationJson({
  required int id,
  String status = 'Đã xử lý',
  String type = 'Vệ sinh phòng',
  String severityText = 'Nhẹ',
  String roomName = 'Phòng tự học B204',
  bool isRestricted = false,
}) =>
    {
      'id': id,
      'code': 'VP-000$id',
      'incidentTime': '2026-11-0${id + 1}T09:30:00Z',
      'description': 'Trả phòng không đúng nội quy',
      'severity': 1,
      'severityText': severityText,
      'penaltyApplied': 'Cảnh cáo',
      'status': status,
      'roomId': 5,
      'roomName': roomName,
      'violationTypeName': type,
      'isRestricted': isRestricted,
      'restrictDays': 0,
      'restrictionEndAt': null,
    };

ViolationRecord _record(Map<String, dynamic> json) =>
    ViolationRecord.fromJson(json);

Widget harness(FakeHistoryRepository repo) => ProviderScope(
      overrides: [historyRepositoryProvider.overrideWithValue(repo)],
      child: const MaterialApp(home: ViolationHistoryPage()),
    );

void main() {
  testWidgets('renders violation records with type, room and status',
      (tester) async {
    final repo = FakeHistoryRepository(violations: [
      _record(_violationJson(id: 1)),
      _record(_violationJson(id: 2, status: 'Chờ xử lý', type: 'Giữ chỗ quá lâu')),
    ]);
    await tester.pumpWidget(harness(repo));
    await tester.pumpAndSettle();

    expect(find.text('Vệ sinh phòng'), findsOneWidget);
    expect(find.text('Giữ chỗ quá lâu'), findsOneWidget);
    expect(find.text('Phòng tự học B204'), findsNWidgets(2));
    expect(find.text('Đã xử lý'), findsOneWidget);
    expect(find.text('Chờ xử lý'), findsOneWidget);
    expect(find.textContaining('VP-0001'), findsOneWidget);
  });

  testWidgets('shows restriction banner when currently restricted',
      (tester) async {
    final repo = FakeHistoryRepository(
      violations: [_record(_violationJson(id: 1))],
      eligibility: const UserEligibility(
        isEligible: false,
        message: 'Bạn bị cấm mượn phòng đến 15/11/2026',
        hasActiveRestriction: true,
        remainingDays: 7,
        reason: 'Vi phạm nhiều lần',
      ),
    );
    await tester.pumpWidget(harness(repo));
    await tester.pumpAndSettle();

    expect(find.text('Bạn bị cấm mượn phòng đến 15/11/2026'), findsOneWidget);
    expect(find.textContaining('Vi phạm nhiều lần'), findsOneWidget);
  });

  testWidgets('shows empty state when no violations', (tester) async {
    final repo = FakeHistoryRepository();
    await tester.pumpWidget(harness(repo));
    await tester.pumpAndSettle();

    expect(find.text('Chưa có biên bản vi phạm nào'), findsOneWidget);
    expect(repo.eligibilityCalls, 1);
  });
}
