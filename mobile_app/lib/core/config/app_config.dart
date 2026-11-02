// Server-side config for the HUIT-RoMan backend.
abstract final class AppConfig {
  static const appName = 'HUIT';
  static const university = 'Trường Đại học Công Thương TP.HCM';

  /// Cổng API chạy local (docker-compose publish `${API_PORT:-5056}`).
  static const apiPort = 5056;
}
