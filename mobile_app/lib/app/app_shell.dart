import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _items = [
    (label: 'Tổng quan', icon: Icons.home_outlined, active: Icons.home_rounded),
    (label: 'Lịch', icon: Icons.calendar_month_outlined, active: Icons.calendar_month_rounded),
    (label: 'Đơn của tôi', icon: Icons.receipt_long_outlined, active: Icons.receipt_long_rounded),
    (label: 'Hồ sơ', icon: Icons.person_outline_rounded, active: Icons.person_rounded),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(top: BorderSide(color: AppColors.line)),
          boxShadow: [
            BoxShadow(
              color: AppColors.navy.withValues(alpha: 0.05),
              blurRadius: 18,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            height: 66,
            selectedIndex: navigationShell.currentIndex,
            onDestinationSelected: (index) => navigationShell.goBranch(
              index,
              initialLocation: index == navigationShell.currentIndex,
            ),
            destinations: [
              for (var i = 0; i < _items.length; i++)
                NavigationDestination(
                  icon: Icon(_items[i].icon),
                  selectedIcon: Icon(_items[i].active),
                  label: _items[i].label,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
