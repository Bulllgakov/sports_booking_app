import 'package:flutter/material.dart';
import 'bottom_navigation.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  final String location;

  const AppShell({
    super.key,
    required this.child,
    required this.location,
  });

  int get _getCurrentIndex {
    switch (location) {
      case '/':
        return 0;
      case '/find-game':
        return 1;
      case '/my-bookings':
        return 2;
      case '/profile':
        return 3;
      default:
        return 0;
    }
  }

  bool get _shouldShowBottomNav {
    return ['/', '/find-game', '/my-bookings', '/profile'].contains(location);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: _shouldShowBottomNav
          ? BottomNavigation(currentIndex: _getCurrentIndex)
          : null,
    );
  }
}