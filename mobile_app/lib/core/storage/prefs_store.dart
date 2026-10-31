import 'package:shared_preferences/shared_preferences.dart';

class PrefsStore {
  Future<String?> lastTab() async =>
      (await SharedPreferences.getInstance()).getString('last_tab');

  Future<void> setLastTab(String value) async =>
      (await SharedPreferences.getInstance()).setString('last_tab', value);

  Future<Set<int>> readNotificationIds() async =>
      (await SharedPreferences.getInstance())
          .getStringList('read_notifications')
          ?.map(int.tryParse)
          .whereType<int>()
          .toSet() ??
      <int>{};

  Future<void> setReadNotificationIds(Set<int> ids) async =>
      (await SharedPreferences.getInstance())
          .setStringList('read_notifications', ids.map((e) => e.toString()).toList());
}
