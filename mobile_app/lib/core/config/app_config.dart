abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5056',
  );
  static const appName = 'RoMan';
  static const university = 'Trường Đại học Công nghiệp TP.HCM';
}
