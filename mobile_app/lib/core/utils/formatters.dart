abstract final class Formatters {
  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    return parts.take(2).map((p) => p[0]).join().toUpperCase();
  }

  static String count(int value) => '$value';

  static String plural(int value, String singular, [String? plural]) =>
      '$value ${value == 1 ? singular : (plural ?? singular)}';
}
