import 'package:flutter/material.dart';

abstract final class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
}

abstract final class AppRadius {
  static const input = 12.0;
  static const card = 16.0;
  static const sheet = 20.0;
}

const appShadow = [
  BoxShadow(
    color: Color(0x141A365D),
    blurRadius: 24,
    offset: Offset(0, 8),
  ),
];
