class ClockTime implements Comparable<ClockTime> {
  const ClockTime(this.hour, this.minute);

  final int hour;
  final int minute;

  int get minutes => hour * 60 + minute;

  String get label => '${_two(hour)}:${_two(minute)}';

  String get api => '$label:00';

  static String _two(int value) => value.toString().padLeft(2, '0');

  static ClockTime? tryParse(String? raw) {
    if (raw == null) return null;
    final parts = raw.trim().split(':');
    if (parts.length < 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return ClockTime(hour, minute);
  }

  ClockTime addMinutes(int value) {
    final total = (minutes + value) % (24 * 60);
    return ClockTime(total ~/ 60, total % 60);
  }

  @override
  int compareTo(ClockTime other) => minutes.compareTo(other.minutes);

  bool operator <(ClockTime other) => minutes < other.minutes;
  bool operator <=(ClockTime other) => minutes <= other.minutes;
  bool operator >(ClockTime other) => minutes > other.minutes;
  bool operator >=(ClockTime other) => minutes >= other.minutes;

  @override
  bool operator ==(Object other) =>
      other is ClockTime && other.hour == hour && other.minute == minute;

  @override
  int get hashCode => Object.hash(hour, minute);

  @override
  String toString() => label;
}
