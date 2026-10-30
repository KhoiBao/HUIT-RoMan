import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

class PlaceholderPage extends StatelessWidget {
  const PlaceholderPage({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text(
          title,
          style: const TextStyle(color: AppColors.muted),
        ),
      ),
    );
  }
}
