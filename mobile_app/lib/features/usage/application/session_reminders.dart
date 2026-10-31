import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../domain/session_time_rules.dart';
import '../domain/usage_session.dart';

class SessionReminder {
  const SessionReminder({
    required this.id,
    required this.minutes,
    required this.scheduledAt,
  });

  final int id;
  final int minutes;
  final DateTime scheduledAt;
}

abstract final class SessionReminderPlan {
  static int idFor(int sessionId, int minutes) =>
      sessionId * 10 + (minutes == 30 ? 1 : 2);

  static List<SessionReminder> build(UsageSession session, DateTime now) {
    final endAt = session.endAt.toUtc();
    final current = now.toUtc();
    return [
      for (final minutes in SessionTimeRules.reminderMinutes)
        if (endAt.subtract(Duration(minutes: minutes)).isAfter(current))
          SessionReminder(
            id: idFor(session.id, minutes),
            minutes: minutes,
            scheduledAt: endAt.subtract(Duration(minutes: minutes)),
          ),
    ];
  }
}

class SessionReminders {
  SessionReminders({FlutterLocalNotificationsPlugin? plugin})
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  static const _channelId = 'session_reminders';
  static const _channelName = 'Nhắc giờ trả phòng';

  final FlutterLocalNotificationsPlugin _plugin;
  bool _ready = false;
  bool _permissionAsked = false;

  bool get _supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  AndroidFlutterLocalNotificationsPlugin? get _android =>
      _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  Future<void> _ensureReady() async {
    if (_ready) return;
    tzdata.initializeTimeZones();
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
    );
    _ready = true;
  }

  Future<void> _requestPermission() async {
    if (_permissionAsked) return;
    _permissionAsked = true;
    await _android?.requestNotificationsPermission();
  }

  Future<AndroidScheduleMode> _scheduleMode() async {
    final exact = await _android?.canScheduleExactNotifications() ?? false;
    return exact
        ? AndroidScheduleMode.exactAllowWhileIdle
        : AndroidScheduleMode.inexactAllowWhileIdle;
  }

  Future<void> sync(List<UsageSession> sessions) async {
    if (!_supported) return;
    try {
      await _ensureReady();
      for (final session in sessions) {
        await _cancelSession(session.id);
      }
      final active =
          sessions.where((session) => session.status.isInUse).toList();
      if (active.isEmpty) return;
      await _requestPermission();
      final mode = await _scheduleMode();
      final now = DateTime.now().toUtc();
      for (final session in active) {
        for (final reminder in SessionReminderPlan.build(session, now)) {
          await _plugin.zonedSchedule(
            id: reminder.id,
            title: 'Sắp hết giờ sử dụng phòng',
            body:
                'Còn ${reminder.minutes} phút tại ${session.roomLabel}. Vui lòng sắp xếp trả phòng đúng giờ.',
            scheduledDate:
                tz.TZDateTime.from(reminder.scheduledAt, tz.UTC),
            notificationDetails: const NotificationDetails(
              android: AndroidNotificationDetails(
                _channelId,
                _channelName,
                channelDescription: 'Nhắc trước 30 và 15 phút khi hết giờ sử dụng phòng.',
                importance: Importance.high,
                priority: Priority.high,
              ),
            ),
            androidScheduleMode: mode,
            payload: 'usage:${session.id}',
          );
        }
      }
    } catch (_) {
      // Nhắc lịch là phụ trợ: lỗi plugin không được làm hỏng luồng sử dụng phòng.
    }
  }

  Future<void> cancelSession(int sessionId) async {
    if (!_supported) return;
    try {
      await _ensureReady();
      await _cancelSession(sessionId);
    } catch (_) {
      // Bỏ qua lỗi plugin.
    }
  }

  Future<void> _cancelSession(int sessionId) async {
    await _plugin.cancel(id: SessionReminderPlan.idFor(sessionId, 30));
    await _plugin.cancel(id: SessionReminderPlan.idFor(sessionId, 15));
  }
}
