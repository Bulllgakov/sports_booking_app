import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:allcourt/main.dart';

void main() {
  testWidgets('App loads correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const AllCourtApp());

    // Verify that our home screen loads
    expect(find.text('Привет! Найдём корт для игры?'), findsOneWidget);
  });
}