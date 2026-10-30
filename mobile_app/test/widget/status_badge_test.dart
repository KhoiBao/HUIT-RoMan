import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/widgets/status_badge.dart';

void main() {
  testWidgets('renders label text, not only color', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: StatusBadge(label: 'Chờ duyệt'),
      ),
    ));
    expect(find.text('Chờ duyệt'), findsOneWidget);
  });
}
