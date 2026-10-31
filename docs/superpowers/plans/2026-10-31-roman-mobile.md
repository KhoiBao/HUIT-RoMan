# RoMan Mobile (Flutter/Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Flutter Android app in `mobile_app/` for HUIT students and lecturers: login, home dashboard, rooms, schedule, 3-step booking, my bookings with check-in/check-out/review, notifications, profile, and support chat — using the existing ASP.NET Core API.

**Architecture:** N-layer feature-first. `presentation → application → domain ← data`, with a shared `core`. Domain is pure Dart (no Flutter/Dio). Riverpod for state and DI, go_router with a `StatefulShellRoute` for the 4-tab shell, Dio for HTTP, flutter_secure_storage for JWT.

**Tech Stack:** Flutter stable 3.47.9 / Dart 3.13.7, Material 3, fluter_riverpod 2.x, go_router, dio, flutter_secure_storage, shared_preferences, flutter_animate, shimmer, intl, signalr_netcore, flutter_svg.

**Spec:** `docs/superpowers/specs/2026-10-31-roman-mobile-design.md`

## Global Constraints

- Do not modify `backend/` or `web/`; the app only consumes existing endpoints.
- Package id `vn.edu.huit.roman_mobile`, app label `RoMan`, minSdk 23, targetSdk 36.
- Folder `mobile_app/`; all app code under `lib/`; tests under `test/unit` and `test/widget`.
- Layer rule: `presentation` may import `application` + `domain` + `core`; `application` may import `domain` + `core` (no Dio); `data` may import `domain` + `core`; `domain` imports nothing from the app except pure Dart.
- No cross-feature imports; shared types live in `core` or a feature's `domain` that others depend on. (`booking` and `usage` share status enums via `booking/domain`.)
- UI language Vietnamese. No emoji as icons; icons only `Icons.*` (Material). Logo only `assets/images/roman-logo-icon.png`.
- Font Be Vietnam Pro only (5 weights from `web/public/fonts`).
- Colors: navy `#1A365D`, primary `#005A9E`, primaryDark `#004A84`, gold `#8E4302`, bg `#F3F7FB`, surface `#FFFFFF`, muted `#5B6B7F`, line `#DDE4EE`, danger `#C0392B`, success `#0D8A62`. Radius 12/16/20. Single shadow `0 8 24 rgba(26,54,93,0.08)`. Spacing 4/8/12/16/24/32. Touch targets ≥ 48dp.
- API base URL from `--dart-define=API_BASE_URL=...`, default `http://10.0.2.2:5056`. All times UTC in/out; display +07:00. Date query params `yyyy-MM-dd` in Vietnam time.
- Roles: staff = {Admin, Manager, DepartmentManager, Employee}; user = {Student, Lecturer}. Comparison case-insensitive.
- Only light theme, Vietnamese copy.
- Every task must end with `flutter analyze` clean and its tests passing.
- DTOs are hand-written `fromJson`/`toJson` (no build_runner); this is a deliberate simplification of §4 of the spec.
- No mock files left behind after completion; tests use fakes inside `test/`.

---

## File Structure

```text
mobile_app/
├─ android/app/src/main/AndroidManifest.xml   # label, cleartext debug, deep link
├─ android/app/src/debug/res/xml/network_security_config.xml
├─ assets/fonts/BeVietnamPro-*.ttf
├─ assets/images/roman-logo-icon.png
├─ lib/
│  ├─ main.dart
│  ├─ app/app.dart router.dart splash_page.dart app_shell.dart
│  ├─ core/
│  │  ├─ config/app_config.dart
│  │  ├─ network/{dio_client,api_client,api_envelope,error_mapper}.dart
│  │  ├─ storage/{token_store,prefs_store}.dart
│  │  ├─ errors/app_exception.dart
│  │  ├─ theme/{app_colors,app_theme,app_spacing,status_palette}.dart
│  │  ├─ utils/{date_time_x,validators,formatters}.dart
│  │  └─ widgets/{app_button,status_badge,empty_state,error_view,loading_skeleton,app_sheet,confirm_dialog,section_header,app_scaffold}.dart
│  └─ features/
│     ├─ auth/{domain,data,application,presentation}
│     ├─ profile/…
│     ├─ rooms/…
│     ├─ schedule/…
│     ├─ booking/…
│     ├─ usage/…
│     ├─ notification/…
│     ├─ feedback/…
│     └─ chat/…
└─ test/{unit,widget}
```

**Shared domain placement (avoids cross-feature imports):**
- `SessionUser`, `UserRole` → `features/auth/domain` (imported by profile/booking/usage/chat presentation & application).
- `Room`, `RoomStatus`, `RoomType` → `features/rooms/domain`.
- `BookingStatus`, `BookingSummary`, `BookingDetailItem`, `CancelReason` → `features/booking/domain`.
- `UsageSession`, `UsageStatus` → `features/usage/domain`; `usage` imports `booking/domain` for shared status strings.
- `AppNotification` → `features/notification/domain`.
- `RoomFeedbackSummary` → `features/feedback/domain`.

---

## Task 1: Scaffold, assets, theme, app config

**Files:**
- Create: `mobile_app/` (flutter create), `mobile_app/pubspec.yaml`, `lib/main.dart`, `lib/core/config/app_config.dart`, `lib/core/theme/app_colors.dart`, `app_theme.dart`, `app_spacing.dart`, `lib/core/utils/date_time_x.dart`, `lib/core/utils/validators.dart`
- Test: `test/unit/date_time_x_test.dart`, `test/unit/validators_test.dart`, `test/widget/theme_smoke_test.dart`

**Interfaces:**
- Produces: `AppConfig.apiBaseUrl`, `AppColors.*`, `AppSpacing.*`, `AppTheme.light()`, `DateTimeX.toVietnamDate(DateTime) → String`, `DateTimeX.parseUtc(String?) → DateTime?`, `Validators.loginIdentifier(String?) → String?`, `Validators.password(String?) → String?`.

- [ ] **Step 1: Scaffold and assets**

```bash
cd /k/KLCN/HUIT-RoMan
flutter create --org vn.edu.huit --project-name roman_mobile --platforms=android mobile_app
mkdir -p mobile_app/assets/fonts mobile_app/assets/images mobile_app/lib/core/{config,network,storage,errors,theme,utils,widgets} mobile_app/lib/features mobile_app/test/{unit,widget}
cp web/public/fonts/BeVietnamPro-*.ttf mobile_app/assets/fonts/
cp web/public/roman-logo-icon.png mobile_app/assets/images/
```

- [ ] **Step 2: Write pubspec dependencies**

```yaml
name: roman_mobile
description: HUIT RoMan mobile app.
publish_to: none
version: 1.0.0+1
environment:
  sdk: ^3.13.0
dependencies:
  flutter: {sdk: flutter}
  flutter_riverpod: ^2.6.1
  go_router: ^16.0.0
  dio: ^5.7.0
  flutter_secure_storage: ^9.2.2
  shared_preferences: ^2.3.3
  flutter_animate: ^4.5.2
  shimmer: ^3.0.0
  intl: ^0.20.2
  signalr_netcore: ^1.4.0
  flutter_svg: ^2.0.16
dev_dependencies:
  flutter_test: {sdk: flutter}
  flutter_lints: ^5.0.0
flutter:
  uses-material-design: true
  assets:
    - assets/images/
  fonts:
    - family: BeVietnamPro
      fonts:
        - asset: assets/fonts/BeVietnamPro-Regular.ttf
          weight: 400
        - asset: assets/fonts/BeVietnamPro-Medium.ttf
          weight: 500
        - asset: assets/fonts/BeVietnamPro-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/BeVietnamPro-Bold.ttf
          weight: 700
        - asset: assets/fonts/BeVietnamPro-ExtraBold.ttf
          weight: 800
```

- [ ] **Step 3: Write failing unit tests**

`test/unit/date_time_x_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/utils/date_time_x.dart';

void main() {
  test('formats a UTC instant as Vietnam date', () {
    final utc = DateTime.utc(2026, 10, 31, 18, 30);
    expect(DateTimeX.toVietnamDate(utc), '2026-11-01');
  });

  test('parses ISO strings as UTC', () {
    expect(DateTimeX.parseUtc('2026-10-31T10:00:00Z')!.isUtc, isTrue);
    expect(DateTimeX.parseUtc(null), isNull);
    expect(DateTimeX.parseUtc('not-a-date'), isNull);
  });

  test('detects today in Vietnam time', () {
    final now = DateTime.now().toUtc();
    expect(DateTimeX.isTodayVn(now), isTrue);
  });
}
```

`test/unit/validators_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/utils/validators.dart';

void main() {
  test('rejects empty and malformed identifiers', () {
    expect(Validators.loginIdentifier(''), isNotNull);
    expect(Validators.loginIdentifier('ab'), isNotNull);
    expect(Validators.loginIdentifier('bad email@huit.edu.vn'), isNotNull);
  });

  test('accepts email, student code and staff code', () {
    expect(Validators.loginIdentifier('sv@huit.edu.vn'), isNull);
    expect(Validators.loginIdentifier('2123110001'), isNull);
    expect(Validators.loginIdentifier('CBVC-12'), isNull);
  });
}
```

- [ ] **Step 4: Run tests (expect failure)**

Run: `cd mobile_app && flutter test test/unit`
Expected: FAIL — files do not exist.

- [ ] **Step 5: Implement core theme/config/utils**

`lib/core/theme/app_colors.dart`:

```dart
import 'package:flutter/material.dart';

abstract final class AppColors {
  static const navy = Color(0xFF1A365D);
  static const primary = Color(0xFF005A9E);
  static const primaryDark = Color(0xFF004A84);
  static const gold = Color(0xFF8E4302);
  static const bg = Color(0xFFF3F7FB);
  static const surface = Colors.white;
  static const muted = Color(0xFF5B6B7F);
  static const line = Color(0xFFDDE4EE);
  static const danger = Color(0xFFC0392B);
  static const success = Color(0xFF0D8A62);
}
```

`lib/core/theme/app_spacing.dart`:

```dart
abstract final class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
}
```

`lib/core/theme/app_theme.dart`:

```dart
import 'package:flutter/material.dart';
import 'app_colors.dart';

abstract final class AppTheme {
  static ThemeData light() {
    final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
    final scheme = ColorScheme.fromSeed(seedColor: AppColors.primary).copyWith(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      surface: AppColors.surface,
      error: AppColors.danger,
    );
    return base.copyWith(
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.bg,
      fontFamily: 'BeVietnamPro',
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.navy,
        displayColor: AppColors.navy,
        fontFamily: 'BeVietnamPro',
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.bg,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.navy,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
            fontFamily: 'BeVietnamPro', fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        labelStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
              fontFamily: 'BeVietnamPro', fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.navy,
        contentTextStyle: const TextStyle(fontFamily: 'BeVietnamPro', color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.line, thickness: 1, space: 1),
    );
  }
}
```

`lib/core/utils/date_time_x.dart`:

```dart
import 'package:intl/intl.dart';

abstract final class DateTimeX {
  static const _vnOffset = Duration(hours: 7);
  static final _dateFmt = DateFormat('yyyy-MM-dd');
  static final _timeFmt = DateFormat('HH:mm');
  static final _dayFmt = DateFormat('dd/MM/yyyy');
  static final _dayTimeFmt = DateFormat('dd/MM/yyyy HH:mm');

  static DateTime toVietnam(DateTime value) => value.toUtc().add(_vnOffset);

  static DateTime fromVietnamWallClock(DateTime value) =>
      DateTime.utc(value.year, value.month, value.day, value.hour, value.minute);

  static DateTime? parseUtc(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return null;
    return parsed.isUtc ? parsed : DateTime.utc(parsed.year, parsed.month, parsed.day,
        parsed.hour, parsed.minute, parsed.second);
  }

  static String toVietnamDate(DateTime value) => _dateFmt.format(toVietnam(value));
  static String dateOf(DateTime value) => _dateFmt.format(value);
  static String timeOf(DateTime value) => _timeFmt.format(toVietnam(value));
  static String dayOf(DateTime value) => _dayFmt.format(toVietnam(value));
  static String dayTimeOf(DateTime value) => _dayTimeFmt.format(toVietnam(value));

  static bool isTodayVn(DateTime utc) {
    final now = toVietnam(DateTime.now().toUtc());
    final local = toVietnam(utc);
    return now.year == local.year && now.month == local.month && now.day == local.day;
  }

  static String relative(DateTime utc) {
    final diff = utc.difference(DateTime.now().toUtc());
    if (diff.inMinutes.abs() < 1) return 'Vừa xong';
    if (diff.isNegative) {
      final d = -diff;
      if (d.inMinutes < 60) return '${d.inMinutes} phút trước';
      if (d.inHours < 24) return '${d.inHours} giờ trước';
      return '${d.inDays} ngày trước';
    }
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút nữa';
    if (diff.inHours < 24) return '${diff.inHours} giờ nữa';
    return '${diff.inDays} ngày nữa';
  }
}
```

`lib/core/utils/validators.dart`:

```dart
abstract final class Validators {
  static final _email = RegExp(r'^[\w.+-]+@[\w-]+\.[\w.]+$');
  static final _code = RegExp(r'^[A-Za-z0-9._-]{3,50}$');

  static String? loginIdentifier(String? value) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Nhập email, MSSV hoặc mã CBVC';
    if (v.contains('@')) {
      return _email.hasMatch(v) ? null : 'Email không hợp lệ';
    }
    return _code.hasMatch(v) ? null : 'Mã phải từ 3–50 ký tự chữ, số';
  }

  static String? password(String? value) =>
      (value == null || value.isEmpty) ? 'Nhập mật khẩu' : null;

  static String? newPassword(String? value) =>
      (value == null || value.length < 6) ? 'Mật khẩu tối thiểu 6 ký tự' : null;

  static String? requiredText(String? value, String label, {int min = 1}) {
    final v = value?.trim() ?? '';
    if (v.isEmpty) return 'Nhập $label';
    if (v.length < min) return '$label tối thiểu $min ký tự';
    return null;
  }
}
```

`lib/core/config/app_config.dart`:

```dart
abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5056',
  );
  static const appName = 'RoMan';
  static const university = 'Trường Đại học Công nghiệp TP.HCM';
}
```

- [ ] **Step 6: Run tests, analyze**

Run: `cd mobile_app && flutter test test/unit && flutter analyze`
Expected: all tests pass, no analyzer issues.

- [ ] **Step 7: Commit**

```bash
git add mobile_app docs/superpowers/plans
git commit -m "feat(mobile): scaffold Flutter app with theme, fonts and core utils"
```

---

## Task 2: Network layer, storage, error mapping

**Files:**
- Create: `lib/core/errors/app_exception.dart`, `lib/core/network/api_envelope.dart`, `lib/core/network/api_client.dart`, `lib/core/network/dio_client.dart`, `lib/core/network/error_mapper.dart`, `lib/core/storage/token_store.dart`, `lib/core/storage/prefs_store.dart`, `lib/core/providers.dart`
- Test: `test/unit/api_client_test.dart`, `test/unit/error_mapper_test.dart`

**Interfaces:**
- Produces:
  - `sealed class AppException implements Exception { String message; }` with `UnauthorizedException`, `ForbiddenException`, `NetworkException`, `BusinessException(message, {Map<String,String> fieldErrors})`, `UnknownException`.
  - `ApiEnvelope { bool success; String? message; dynamic data; }`.
  - `ApiClient` with `Future<dynamic> get(String path, {Map<String,dynamic>? query})`, `post`, `patch`, `put`, `delete`; returns unwrapped `data`; throws mapped exceptions.
  - `TokenStore { Future<String?> read(); Future<void> write(String); Future<void> clear(); }`, `PrefsStore { Future<String?> lastTab(); Future<void> setLastTab(String); }`.
  - `apiClientProvider`, `tokenStoreProvider`, `prefsStoreProvider`.
- Consumes: `AppConfig.apiBaseUrl` from Task 1.

- [ ] **Step 1: Write failing tests**

`test/unit/error_mapper_test.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/errors/app_exception.dart';
import 'package:roman_mobile/core/network/error_mapper.dart';

void main() {
  test('maps 401 to UnauthorizedException', () {
    final err = DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.badResponse,
      response: Response(requestOptions: RequestOptions(path: '/x'), statusCode: 401),
    );
    expect(mapDioError(err), isA<UnauthorizedException>());
  });

  test('maps 403 and 400 with message', () {
    final forbidden = DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.badResponse,
      response: Response(requestOptions: RequestOptions(path: '/x'), statusCode: 403),
    );
    expect(mapDioError(forbidden), isA<ForbiddenException>());

    final bad = DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.badResponse,
      response: Response(
        requestOptions: RequestOptions(path: '/x'),
        statusCode: 400,
        data: {'message': 'Phòng đã được đặt'},
      ),
    );
    final mapped = mapDioError(bad);
    expect(mapped, isA<BusinessException>());
    expect(mapped.message, 'Phòng đã được đặt');
  });

  test('maps timeouts to NetworkException', () {
    expect(
      mapDioError(DioException(
          requestOptions: RequestOptions(path: '/x'), type: DioExceptionType.connectionTimeout)),
      isA<NetworkException>(),
    );
  });
}
```

`test/unit/api_client_test.dart`:

```dart
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/core/errors/app_exception.dart';
import 'package:roman_mobile/core/network/api_client.dart';

class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);
  final ResponseBody Function(RequestOptions) handler;
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream,
          Future<void>? cancelFuture) async =>
      handler(options);
  @override
  void close({bool force = false}) {}
}

void main() {
  test('unwraps envelope data', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test'))
      ..httpClientAdapter = FakeAdapter((_) => ResponseBody.fromString(
          '{"success":true,"message":null,"data":{"id":7}}', 200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]}));
    final client = ApiClient(dio, () async => 'token');
    final data = await client.get('/api/thing');
    expect((data as Map)['id'], 7);
  });

  test('returns raw login payload', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test'))
      ..httpClientAdapter = FakeAdapter((_) => ResponseBody.fromString(
          '{"token":"abc","user":{"id":1}}', 200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]}));
    final client = ApiClient(dio, () async => null);
    final data = await client.post('/api/Auth/login', body: {});
    expect((data as Map)['token'], 'abc');
  });

  test('throws UnauthorizedException on 401', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test'))
      ..httpClientAdapter = FakeAdapter((_) => ResponseBody.fromString('', 401));
    final client = ApiClient(dio, () async => 'token');
    expect(client.get('/api/x'), throwsA(isA<UnauthorizedException>()));
  });
}
```

- [ ] **Step 2: Run tests (expect failure)**

Run: `cd mobile_app && flutter test test/unit/error_mapper_test.dart test/unit/api_client_test.dart`
Expected: FAIL — missing `error_mapper.dart`, `api_client.dart`.

- [ ] **Step 3: Implement**

`lib/core/errors/app_exception.dart`:

```dart
sealed class AppException implements Exception {
  const AppException(this.message);
  final String message;
  @override
  String toString() => message;
}

final class UnauthorizedException extends AppException {
  const UnauthorizedException([super.message = 'Phiên đăng nhập đã hết hạn']);
}

final class ForbiddenException extends AppException {
  const ForbiddenException([super.message = 'Bạn không có quyền thực hiện thao tác này']);
}

final class NetworkException extends AppException {
  const NetworkException([super.message = 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.']);
}

class BusinessException extends AppException {
  const BusinessException(super.message, {this.fieldErrors = const {}});
  final Map<String, String> fieldErrors;
}

final class UnknownException extends AppException {
  const UnknownException([super.message = 'Đã có lỗi xảy ra, vui lòng thử lại']);
}
```

`lib/core/network/api_envelope.dart`:

```dart
class ApiEnvelope {
  const ApiEnvelope({required this.success, this.message, this.data});
  final bool success;
  final String? message;
  final dynamic data;

  factory ApiEnvelope.fromJson(Map<String, dynamic> json) => ApiEnvelope(
        success: json['success'] == true,
        message: json['message'] as String?,
        data: json['data'],
      );
}
```

`lib/core/network/error_mapper.dart`:

```dart
import 'package:dio/dio.dart';
import '../errors/app_exception.dart';

AppException mapDioError(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
      return const NetworkException();
    case DioExceptionType.badResponse:
      return _mapResponse(error.response);
    default:
      return const UnknownException();
  }
}

AppException _mapResponse(Response<dynamic>? response) {
  final status = response?.statusCode ?? 0;
  final data = response?.data;
  if (status == 401) return const UnauthorizedException();
  if (status == 403) return const ForbiddenException();
  if (status == 400 && data is Map && data['errors'] is Map) {
    final errors = <String, String>{};
    (data['errors'] as Map).forEach((k, v) {
      if (v is List && v.isNotEmpty) errors[k.toString()] = v.first.toString();
    });
    final first = errors.values.isEmpty ? 'Dữ liệu không hợp lệ' : errors.values.first;
    return BusinessException(first, fieldErrors: errors);
  }
  final message = switch (data) {
    Map m when m['message'] is String => m['message'] as String,
    Map m when m['title'] is String => m['title'] as String,
    String s when s.isNotEmpty => s,
    _ => null,
  };
  if (message != null && message.isNotEmpty) {
    return BusinessException(message);
  }
  if (status == 404) return const BusinessException('Không tìm thấy dữ liệu');
  if (status == 409) return const BusinessException('Dữ liệu đã thay đổi, vui lòng tải lại');
  return const UnknownException();
}
```

`lib/core/network/api_client.dart`:

```dart
import 'package:dio/dio.dart';
import '../errors/app_exception.dart';
import 'api_envelope.dart';
import 'error_mapper.dart';

typedef TokenReader = Future<String?> Function();

class ApiClient {
  ApiClient(this._dio, this._tokenReader);
  final Dio _dio;
  final TokenReader _tokenReader;

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _request(() => _dio.get(path, queryParameters: _clean(query)));

  Future<dynamic> post(String path, {Object? body, Map<String, dynamic>? query}) =>
      _request(() => _dio.post(path, data: body, queryParameters: _clean(query)));

  Future<dynamic> put(String path, {Object? body}) =>
      _request(() => _dio.put(path, data: body));

  Future<dynamic> patch(String path, {Object? body}) =>
      _request(() => _dio.patch(path, data: body));

  Future<dynamic> delete(String path) => _request(() => _dio.delete(path));

  Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    return {
      for (final e in query.entries)
        if (e.value != null) e.key: e.value,
    };
  }

  Future<dynamic> _request(Future<Response<dynamic>> Function() send) async {
    try {
      final token = await _tokenReader();
      final options = Options(headers: {
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      });
      _dio.options.headers.addAll(options.headers ?? const {});
      final response = await send();
      return _unwrap(response.data);
    } on DioException catch (e) {
      throw mapDioError(e);
    } on AppException {
      rethrow;
    } catch (_) {
      throw const UnknownException();
    }
  }

  dynamic _unwrap(dynamic raw) {
    if (raw is Map<String, dynamic> && raw.containsKey('success')) {
      final envelope = ApiEnvelope.fromJson(raw);
      if (!envelope.success) {
        throw BusinessException(envelope.message ?? 'Yêu cầu không thành công');
      }
      return envelope.data;
    }
    return raw;
  }
}
```

`lib/core/network/dio_client.dart`:

```dart
import 'package:dio/dio.dart';
import '../config/app_config.dart';

Dio buildDio() => Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 25),
      sendTimeout: const Duration(seconds: 20),
      responseType: ResponseType.json,
      headers: {'Accept': 'application/json'},
    ));
```

`lib/core/storage/token_store.dart`:

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  TokenStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();
  final FlutterSecureStorage _storage;
  static const _key = 'roman_jwt';

  Future<String?> read() => _storage.read(key: _key);
  Future<void> write(String token) => _storage.write(key: _key, value: token);
  Future<void> clear() => _storage.delete(key: _key);
}
```

`lib/core/storage/prefs_store.dart`:

```dart
import 'package:shared_preferences/shared_preferences.dart';

class PrefsStore {
  Future<String?> lastTab() async =>
      (await SharedPreferences.getInstance()).getString('last_tab');
  Future<void> setLastTab(String value) async =>
      (await SharedPreferences.getInstance()).setString('last_tab', value);
}
```

`lib/core/providers.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'network/api_client.dart';
import 'network/dio_client.dart';
import 'storage/prefs_store.dart';
import 'storage/token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());
final prefsStoreProvider = Provider<PrefsStore>((ref) => PrefsStore());
final dioProvider = Provider((ref) => buildDio());
final apiClientProvider = Provider<ApiClient>((ref) {
  final tokens = ref.watch(tokenStoreProvider);
  return ApiClient(ref.watch(dioProvider), tokens.read);
});
```

- [ ] **Step 4: Run tests and analyze**

Run: `cd mobile_app && flutter test test/unit && flutter analyze`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile_app
git commit -m "feat(mobile): add API client, envelope handling, error mapping and storage"
```

---

## Task 3: Auth feature, login UI, splash, router shell

**Files:**
- Create: `lib/features/auth/domain/{user_role.dart,session_user.dart,auth_repository.dart}`, `lib/features/auth/data/{auth_api.dart,auth_repository_impl.dart}`, `lib/features/auth/application/{auth_controller.dart,auth_providers.dart}`, `lib/features/auth/presentation/{login_page.dart,forgot_password_page.dart,widgets/topography_background.dart}`, `lib/app/{app.dart,router.dart,splash_page.dart,app_shell.dart}`, `lib/features/placeholder_page.dart`, `lib/main.dart`
- Test: `test/unit/user_role_test.dart`, `test/widget/login_page_test.dart`

**Interfaces:**
- Produces:
  - `enum UserRole { student, lecturer, staff, unknown }` with `UserRole.fromApi(String?)`, `bool get isStaff`.
  - `SessionUser { int id; String cardCode; String fullName; String email; UserRole role; String? departmentName; }` + `fromJson`.
  - `abstract class AuthRepository { Future<SessionUser> login(String id, String password); Future<SessionUser> me(); Future<void> forgotPassword(String id); Future<void> resetPassword(String id, String otp, String newPassword); Future<void> logout(); }`.
  - `AuthState { SessionUser? user; bool loading; String? error; }`; `AuthController` (`AsyncNotifier`-free `Notifier<AuthState>`) with `restore()`, `login()`, `logout()`.
  - `authControllerProvider`, `authRepositoryProvider`.
  - `routerProvider → GoRouter`.
- Consumes: `ApiClient`, `TokenStore` from Task 2.

- [ ] **Step 1: Failing tests**

`test/unit/user_role_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/auth/domain/user_role.dart';

void main() {
  test('maps staff roles case-insensitively', () {
    expect(UserRole.fromApi('admin'), UserRole.staff);
    expect(UserRole.fromApi('DepartmentManager'), UserRole.staff);
    expect(UserRole.fromApi('employee'), UserRole.staff);
    expect(UserRole.fromApi('Admin').isStaff, isTrue);
  });

  test('maps user roles and falls back to unknown', () {
    expect(UserRole.fromApi('Student'), UserRole.student);
    expect(UserRole.fromApi('lecturer'), UserRole.lecturer);
    expect(UserRole.fromApi(null), UserRole.unknown);
    expect(UserRole.fromApi('guest'), UserRole.unknown);
  });
}
```

`test/widget/login_page_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:roman_mobile/features/auth/application/auth_controller.dart';
import 'package:roman_mobile/features/auth/domain/auth_repository.dart';
import 'package:roman_mobile/features/auth/domain/session_user.dart';
import 'package:roman_mobile/features/auth/domain/user_role.dart';
import 'package:roman_mobile/features/auth/presentation/login_page.dart';

class FakeAuthRepository implements AuthRepository {
  @override
  Future<SessionUser> login(String id, String password) async =>
      const SessionUser(id: 1, cardCode: 'SV01', fullName: 'Nguyễn An', email: 'a@huit.edu.vn', role: UserRole.student);
  @override
  Future<SessionUser> me() async => throw UnimplementedError();
  @override
  Future<void> forgotPassword(String id) async {}
  @override
  Future<void> resetPassword(String id, String otp, String newPassword) async {}
  @override
  Future<void> logout() async {}
}

void main() {
  testWidgets('validates empty form and shows errors', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [authRepositoryProvider.overrideWithValue(FakeAuthRepository())],
      child: const MaterialApp(home: LoginPage()),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Nhập email, MSSV hoặc mã CBVC'), findsOneWidget);
    expect(find.text('Nhập mật khẩu'), findsOneWidget);
  });

  testWidgets('submits credentials', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [authRepositoryProvider.overrideWithValue(FakeAuthRepository())],
      child: const MaterialApp(home: LoginPage()),
    ));
    await tester.enterText(find.byKey(const Key('login-identifier')), 'SV01');
    await tester.enterText(find.byKey(const Key('login-password')), '123456');
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpAndSettle();
    expect(find.text('Nhập mật khẩu'), findsNothing);
  });
}
```

- [ ] **Step 2: Run (expect failure)**

Run: `cd mobile_app && flutter test test/unit/user_role_test.dart test/widget/login_page_test.dart`
Expected: FAIL — missing files.

- [ ] **Step 3: Implement domain/data/application**

`user_role.dart`:

```dart
enum UserRole {
  student,
  lecturer,
  staff,
  unknown;

  static const _staffValues = {'admin', 'manager', 'departmentmanager', 'employee'};

  static UserRole fromApi(String? raw) {
    final v = (raw ?? '').trim().toLowerCase();
    if (v == 'student') return UserRole.student;
    if (v == 'lecturer' || v == 'teacher') return UserRole.lecturer;
    if (_staffValues.contains(v)) return UserRole.staff;
    return UserRole.unknown;
  }

  bool get isStaff => this == UserRole.staff;
  bool get isStudent => this == UserRole.student;

  String get label => switch (this) {
        UserRole.student => 'Sinh viên',
        UserRole.lecturer => 'Giảng viên',
        UserRole.staff => 'Nhân sự',
        UserRole.unknown => 'Người dùng',
      };
}
```

`session_user.dart`:

```dart
import 'user_role.dart';

class SessionUser {
  const SessionUser({
    required this.id,
    required this.cardCode,
    required this.fullName,
    required this.email,
    required this.role,
    this.departmentName,
    this.phone,
  });

  final int id;
  final String cardCode;
  final String fullName;
  final String email;
  final UserRole role;
  final String? departmentName;
  final String? phone;

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    return parts.take(2).map((p) => p[0]).join().toUpperCase();
  }

  factory SessionUser.fromJson(Map<String, dynamic> json) {
    final roleValue = json['role'] ?? json['roleName'] ?? json['userRole'] ?? json['roleId'];
    return SessionUser(
      id: (json['id'] ?? json['userId'] ?? 0) as int,
      cardCode: (json['cardCode'] ?? json['username'] ?? '') as String,
      fullName: (json['fullName'] ?? json['name'] ?? '') as String,
      email: (json['email'] ?? '') as String,
      role: UserRole.fromApi(roleValue?.toString()),
      departmentName: json['departmentName'] as String?,
      phone: json['phone'] as String?,
    );
  }
}
```

`auth_repository.dart`:

```dart
import 'session_user.dart';

abstract class AuthRepository {
  Future<SessionUser> login(String identifier, String password);
  Future<SessionUser> me();
  Future<void> forgotPassword(String identifier);
  Future<void> resetPassword(String identifier, String otp, String newPassword);
  Future<void> logout();
}
```

`auth_api.dart`:

```dart
import '../../../core/network/api_client.dart';
import '../domain/session_user.dart';

class AuthApi {
  AuthApi(this._client);
  final ApiClient _client;

  Future<String> login(String identifier, String password) async {
    final data = await _client.post('/api/Auth/login', body: {
      'cardCode': identifier,
      'identifier': identifier,
      'password': password,
    });
    return (data as Map)['token'] as String;
  }

  Future<SessionUser> me() async {
    final data = await _client.get('/api/Users/me');
    return SessionUser.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<void> forgotPassword(String identifier) => _client.post(
        '/api/Auth/forgot-password',
        body: {'identifier': identifier, 'email': identifier},
      );

  Future<void> resetPassword(String identifier, String otp, String newPassword) =>
      _client.post('/api/Auth/reset-password', body: {
        'identifier': identifier,
        'email': identifier,
        'otp': otp,
        'token': otp,
        'newPassword': newPassword,
      });
}
```

`auth_repository_impl.dart`:

```dart
import '../../../core/storage/token_store.dart';
import '../domain/auth_repository.dart';
import '../domain/session_user.dart';
import 'auth_api.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._api, this._tokens);
  final AuthApi _api;
  final TokenStore _tokens;

  @override
  Future<SessionUser> login(String identifier, String password) async {
    final token = await _api.login(identifier, password);
    await _tokens.write(token);
    return _api.me();
  }

  @override
  Future<SessionUser> me() => _api.me();

  @override
  Future<void> forgotPassword(String identifier) => _api.forgotPassword(identifier);

  @override
  Future<void> resetPassword(String identifier, String otp, String newPassword) =>
      _api.resetPassword(identifier, otp, newPassword);

  @override
  Future<void> logout() => _tokens.clear();
}
```

`auth_controller.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/storage/token_store.dart';
import '../domain/auth_repository.dart';
import '../domain/session_user.dart';
import 'auth_providers.dart';

class AuthState {
  const AuthState({this.user, this.restoring = true, this.busy = false, this.error});
  final SessionUser? user;
  final bool restoring;
  final bool busy;
  final String? error;

  bool get isAuthenticated => user != null;
  AuthState copyWith({
    SessionUser? user,
    bool? restoring,
    bool? busy,
    String? error,
    bool clearUser = false,
    bool clearError = false,
  }) =>
      AuthState(
        user: clearUser ? null : (user ?? this.user),
        restoring: restoring ?? this.restoring,
        busy: busy ?? this.busy,
        error: clearError ? null : (error ?? this.error),
      );
}

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> restore() async {
    final tokens = ref.read(tokenStoreProvider);
    final token = await tokens.read();
    if (token == null) {
      state = state.copyWith(restoring: false, clearUser: true);
      return;
    }
    try {
      final user = await ref.read(authRepositoryProvider).me();
      state = state.copyWith(user: user, restoring: false, clearError: true);
    } on UnauthorizedException {
      await tokens.clear();
      state = const AuthState(restoring: false);
    } catch (_) {
      state = state.copyWith(restoring: false);
    }
  }

  Future<bool> login(String identifier, String password) async {
    state = state.copyWith(busy: true, clearError: true);
    try {
      final user = await ref.read(authRepositoryProvider).login(identifier, password);
      state = AuthState(user: user, restoring: false);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(busy: false, error: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(busy: false, error: 'Đăng nhập thất bại');
      return false;
    }
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AuthState(restoring: false);
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
```

`auth_providers.dart`:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/auth_api.dart';
import '../data/auth_repository_impl.dart';
import '../domain/auth_repository.dart';

final authApiProvider = Provider((ref) => AuthApi(ref.watch(apiClientProvider)));
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepositoryImpl(ref.watch(authApiProvider), ref.watch(tokenStoreProvider)),
);
```

- [ ] **Step 4: Implement splash, shell, router, app, main**

`login_page.dart` (key requirements): navy background with animated topography painter, white card, logo image, identifier/password fields with keys `login-identifier` / `login-password`, password visibility toggle, submit button key `login-submit`, error text from `state.error`, loading spinner, haptic on error, forgot-password link, `AutofillGroup`, form validation with `Validators`, and post-login navigation handled by router redirect.

```dart
class LoginPage extends ConsumerStatefulWidget { const LoginPage({super.key}); ... }
```

Implementation must:
- Use `TextFormField` with persistent labels; `autofillHints`.
- On submit: validate → `controller.login(...)` → if false, `HapticFeedback.mediumImpact()`.
- `ref.listen(authControllerProvider, ...)` for snackbar on error? Show inline `state.error`.
- Navigate via `context.go('/home')` after success (router redirect also covers it).

`splash_page.dart`: navy background, logo scale+fade (`flutter_animate`), calls `restore()` in `initState`/`ref.listen` then router redirect handles navigation. Show logo + app name.

`app_shell.dart`: `Scaffold` with `NavigationBar` (or custom bottom bar) using `navigationShell.goBranch`; tabs: Tổng quan (`/home`, Icons.home_rounded), Lịch (`/schedule`, Icons.calendar_month_rounded), Đơn của tôi (`/bookings`, Icons.receipt_long_rounded), Hồ sơ (`/profile`, Icons.person_rounded). Unread badge is in headers.

`router.dart`:

```dart
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<bool>(false);
  ref.listen(authControllerProvider, (prev, next) {
    refresh.value = next.isAuthenticated;
  });
  ref.onDispose(refresh.dispose);
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (state.matchedLocation == '/splash') return null;
      final loggingIn = state.matchedLocation == '/login' ||
          state.matchedLocation == '/forgot-password';
      if (auth.restoring) return null;
      if (!auth.isAuthenticated && !loggingIn) return '/login';
      if (auth.isAuthenticated && loggingIn) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashPage()),
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordPage()),
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, __) => const HomePage())]),
          StatefulShellBranch(routes: [GoRoute(path: '/schedule', builder: (_, __) => const SchedulePage())]),
          StatefulShellBranch(routes: [GoRoute(path: '/bookings', builder: (_, __) => const BookingsPage())]),
          StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (_, __) => const ProfilePage())]),
        ],
      ),
      GoRoute(path: '/rooms', builder: (_, __) => const RoomsPage()),
      GoRoute(path: '/rooms/:id', builder: (_, s) => RoomDetailPage(roomId: int.parse(s.pathParameters['id']!))),
      GoRoute(path: '/booking/new', builder: (_, s) => BookingCreatePage(initialRoomId: int.tryParse(s.uri.queryParameters['roomId'] ?? ''))),
      GoRoute(path: '/bookings/:id', builder: (_, s) => BookingDetailPage(bookingId: int.parse(s.pathParameters['id']!))),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsPage()),
      GoRoute(path: '/chat', builder: (_, __) => const ChatPage()),
    ],
  );
});
```

Until later tasks land, `HomePage`, `SchedulePage`, `BookingsPage`, `ProfilePage`, `RoomsPage`, `RoomDetailPage`, `BookingCreatePage`, `BookingDetailPage`, `NotificationsPage`, `ChatPage` are replaced by `PlaceholderPage(title)`. Task 3 creates a `PlaceholderPage` and router references it; later tasks swap each route to the real page. This keeps the app runnable after every task.

`app.dart`:

```dart
class RomanApp extends ConsumerWidget {
  const RomanApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'RoMan',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: ref.watch(routerProvider),
      locale: const Locale('vi', 'VN'),
      supportedLocales: const [Locale('vi', 'VN'), Locale('en')],
    );
  }
}
```

`main.dart`:

```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: RomanApp()));
}
```

- [ ] **Step 5: Topography background**

`widgets/topography_background.dart`: `CustomPainter` + `AnimationController` (30fps Ticker) drawing marching-squares contour lines over a 40×88 grid, levels 13, index contour every 5th thicker/brighter, pointer-influenced gaussian peak (use `Listener` on pointer move), click ripple ring, `MediaQuery.disableAnimations` → paint one static frame and stop. Colors: white at 6%/10% opacity over navy. Must not block taps (`IgnorePointer`).

- [ ] **Step 6: Run tests, analyze, commit**

Run: `cd mobile_app && flutter test test/unit test/widget/login_page_test.dart && flutter analyze`
Expected: PASS.

```bash
git add mobile_app
git commit -m "feat(mobile): auth flow, splash, router shell and login screen"
```

---

## Task 4: Rooms + Home

**Files:**
- Create: `lib/features/rooms/domain/{room.dart,room_repository.dart}`, `lib/features/rooms/data/{rooms_api.dart,rooms_repository_impl.dart}`, `lib/features/rooms/application/{rooms_controller.dart,rooms_providers.dart}`, `lib/features/rooms/presentation/{rooms_page.dart,room_detail_page.dart,widgets/room_card.dart,room_filter_sheet.dart}`
- Create: `lib/features/home/presentation/{home_page.dart,widgets/stat_tile.dart,quick_action.dart}`, `lib/features/home/application/home_controller.dart`
- Create: `lib/core/theme/status_palette.dart`, `lib/core/widgets/{status_badge,empty_state,error_view,loading_skeleton,section_header}.dart`
- Test: `test/unit/room_mapper_test.dart`, `test/widget/status_badge_test.dart`

**Interfaces:**
- Produces: `Room`, `RoomStatus`, `RoomRepository`, `roomsProvider` (async), `roomProvider(id)`, `homeStatsProvider`; `StatusPalette.of(BookingStatus|RoomStatus|UsageStatus)` → `(bg, fg, label)`. Consumes `ApiClient`, `SessionUser`.
- `Room { int id; String code; String name; String building; int floor; int capacity; String roomTypeName; bool isBookingByPeriod; RoomStatus status; String? description; int? roomTypeId; }`, `Room.fromJson`. Status parse: `Trống`/`Available` → available; `Đang sử dụng`/`InUse` → inUse; `Bảo trì`/`Maintenance` → maintenance; default available.
- Endpoints: `GET /api/Rooms`, `GET /api/Rooms/{id}`, `GET /api/Rooms/{id}/equipments`, `GET /api/RoomTypes`, `GET /api/Bookings/schedules?from=&to=`.

- [ ] **Step 1: Failing tests**

```dart
// test/unit/room_mapper_test.dart
test('parses Vietnamese and English room status', () {
  expect(Room.fromJson({'id': 1, 'status': 'Đang sử dụng'}).status, RoomStatus.inUse);
  expect(Room.fromJson({'id': 2, 'status': 'Maintenance'}).status, RoomStatus.maintenance);
  expect(Room.fromJson({'id': 3, 'status': 'Trống', 'isBookingByPeriod': true}).isBookingByPeriod, isTrue);
});
```

```dart
// test/widget/status_badge_test.dart
testWidgets('renders label text, not only color', (tester) async {
  await tester.pumpWidget(const MaterialApp(
    home: StatusBadge(background: Color(0xFFFFF8E1), foreground: Color(0xFFB78103), label: 'Chờ duyệt'),
  ));
  expect(find.text('Chờ duyệt'), findsOneWidget);
});
```

- [ ] **Step 2: Run (expect failure)** — `flutter test test/unit/room_mapper_test.dart test/widget/status_badge_test.dart`

- [ ] **Step 3: Implement rooms feature**

`room.dart`:

```dart
enum RoomStatus {
  available, inUse, maintenance;
  static RoomStatus fromApi(String? raw) {
    final v = (raw ?? '').trim().toLowerCase();
    if (v.contains('bảo trì') || v == 'maintenance') return RoomStatus.maintenance;
    if (v.contains('đang') || v == 'inuse' || v == 'in use') return RoomStatus.inUse;
    return RoomStatus.available;
  }
  String get label => switch (this) {
        RoomStatus.available => 'Trống',
        RoomStatus.inUse => 'Đang sử dụng',
        RoomStatus.maintenance => 'Bảo trì',
      };
}

class Room {
  ... fields as above ...
  factory Room.fromJson(Map<String, dynamic> json) => Room(
    id: (json['id'] ?? 0) as int,
    code: (json['roomCode'] ?? json['code'] ?? '') as String,
    name: (json['roomName'] ?? json['name'] ?? '') as String,
    building: (json['building'] ?? json['buildingName'] ?? '') as String,
    floor: (json['floor'] ?? 0) as int,
    capacity: (json['capacity'] ?? 0) as int,
    roomTypeName: (json['roomTypeName'] ?? json['typeName'] ?? '') as String,
    roomTypeId: json['roomTypeId'] as int?,
    isBookingByPeriod: json['isBookingByPeriod'] == true,
    status: RoomStatus.fromApi(json['status']?.toString()),
    description: json['description'] as String?,
  );
  String get location => [if (building.isNotEmpty) building, if (floor > 0) 'Tầng $floor'].join(' · ');
}
```

`rooms_api.dart`: `list({String? search})` → `GET /api/Rooms` (optionally `search`), `byId(id)`, `equipments(id)`, `types()`.

`rooms_repository_impl.dart`: maps `data` list (handle `data` being List or `{items:[...]}`), caches nothing.

`rooms_controller.dart`:

```dart
class RoomsFilter { final String? roomTypeId; final String? building; final int? floor; final RoomStatus? status; }
final roomsProvider = FutureProvider.autoDispose<List<Room>>((ref) => ref.watch(roomsRepositoryProvider).list());
final roomProvider = FutureProvider.autoDispose.family<Room, int>((ref, id) => ref.watch(roomsRepositoryProvider).byId(id));
```

`rooms_page.dart`: appbar title "Danh sách phòng", search field, filter icon opening `RoomFilterSheet`, list of `RoomCard` (staggered fade-up with `flutter_animate`, 40ms/item), pull-to-refresh, skeleton on first load, empty/error states.

`room_detail_page.dart`: header card (name, code, location, capacity, type, status badge), description, equipment chips (`GET equipments`), today's schedule list (`GET /api/Bookings/rooms/{id}/schedule?date=` — add endpoint to `rooms_api`), CTA "Đặt phòng này" disabled when maintenance.

`home_page.dart`: header greeting from `authControllerProvider.state.user`, notification bell with unread badge (provider from notification feature — until Task 8 use a stub provider returning 0, replaced later), hero "ready session" banner when a session qualifies (Task 7), stats from rooms + today's schedules, horizontal room-type cards, quick actions, pull-to-refresh. Data via `homeControllerProvider` that fetches rooms + today's schedules in parallel (`Future.wait`), computing counts. Skeleton + error + empty components.

- [ ] **Step 4: Wire routes** — replace `/home` placeholder with `HomePage`, `/rooms`, `/rooms/:id`.

- [ ] **Step 5: Run tests/analyze/commit**

```bash
cd mobile_app && flutter test && flutter analyze
git add mobile_app && git commit -m "feat(mobile): rooms list, room detail and home dashboard"
```

---

## Task 5: Schedule page

**Files:**
- Create: `lib/features/schedule/domain/schedule_models.dart`, `lib/features/schedule/data/schedule_api.dart`, `lib/features/schedule/application/schedule_controller.dart`, `lib/features/schedule/presentation/{schedule_page.dart,widgets/day_strip.dart,room_timeline.dart,schedule_block_sheet.dart}`
- Test: `test/unit/timeline_layout_test.dart`

**Interfaces:**
- Produces: `ScheduleEntry { int? bookingId; int roomId; String roomName; DateTime startAt; DateTime endAt; String status; String activityName; }`, `List<ScheduleEntry> parseSchedule(dynamic data)`, `timelineOffset(DateTime start, DateTime end, double hourHeight) → (top, height)` pure function.
- Endpoint: `GET /api/Bookings/schedules?from=yyyy-MM-dd&to=yyyy-MM-dd` (max 62 days; the page requests today → +13).
- Consumes: rooms list, `DateX`.

- [ ] **Step 1: Failing test** — `timelineOffset` for 07:00–20:00 window, entries clipped at bounds, min height 18.0.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** — day strip 14 days horizontal (selected pill animates), room filter by building, `ListView` of rooms with vertical 07:00–20:00 timeline, `CustomPaint` hour grid, blocks colored by status (palette), "now" line updated every minute, tap empty slot → `/booking/new` prefill (`date`, `start`, `end`, `roomId`), tap block → bottom sheet detail, pull-to-refresh, skeleton. Replace `/schedule` placeholder.
- [ ] **Step 4: Verify + commit.**

```bash
cd mobile_app && flutter test && flutter analyze
git add mobile_app && git commit -m "feat(mobile): room schedule with day strip and timelines"
```

---

## Task 6: Booking creation (3 steps) + rules

**Files:**
- Create: `lib/features/booking/domain/{booking_status.dart,booking.dart,booking_repository.dart,booking_rules.dart}`, `lib/features/booking/data/{booking_api.dart,booking_repository_impl.dart}`, `lib/features/booking/application/{booking_create_controller.dart,booking_list_controller.dart,booking_providers.dart}`, `lib/features/booking/presentation/{booking_create_page.dart,widgets/step_time.dart,step_rooms.dart,step_confirm.dart,booking_success_page.dart}`
- Test: `test/unit/booking_rules_test.dart`, `test/unit/booking_mapper_test.dart`

**Interfaces:**
- Produces:
  - `enum BookingStatus { pending, approved, partiallyApproved, rejected, cancelled, inUse, completed, unknown }` + `fromApi`, `label`.
  - `BookingRules` static: `validateStudentWindow(...) → String?`, `validateLecturerWindow(...)`, `canCancel(BookingSummary)`, `checkInWindow(DateTime startAt)`.
  - `BookingDraft` (immutable, `copyWith`), `BookingSummary`, `BookingDetailItem`.
  - `BookingRepository { Future<List<BookingSummary>> my(); Future<BookingSummary> byId(int id); Future<int> create(BookingDraft draft); Future<void> cancel(int id, String reason, String? detail); Future<List<ApprovalEvent>> approvalHistory(int id); }`.
  - `bookingCreateControllerProvider` (`Notifier<BookingCreateState>` with step, date, mode, times/periods, selected rooms, form fields, submit).
- Endpoints: `POST /api/Bookings`, `GET /api/Bookings/my`, `GET /api/Bookings/{id}`, `PATCH /api/Bookings/{id}/cancel`, `GET /api/Bookings/{id}/approval-history`, `GET /api/Bookings/periods?roomTypeId=`, `GET /api/Rooms/available`, `GET /api/Violations/my-eligibility`.

- [ ] **Step 1: Failing tests**

```dart
// booking_rules_test.dart
void main() {
  test('students must stay inside 07:00-20:00, max 2h, no Sunday', () {
    final monday = DateTime(2026, 11, 2); // Monday
    expect(BookingRules.validateStudentWindow(monday, const TimeOfDay(hour: 7, minute: 0), const TimeOfDay(hour: 9, minute: 0)), isNull);
    expect(BookingRules.validateStudentWindow(monday, const TimeOfDay(hour: 6, minute: 30), const TimeOfDay(hour: 8, minute: 0)), isNotNull);
    expect(BookingRules.validateStudentWindow(monday, const TimeOfDay(hour: 8, minute: 0), const TimeOfDay(hour: 11, minute: 0)), contains('2 giờ'));
    final sunday = DateTime(2026, 11, 8);
    expect(BookingRules.validateStudentWindow(sunday, const TimeOfDay(hour: 8, minute: 0), const TimeOfDay(hour: 9, minute: 0)), contains('Chủ nhật'));
  });

  test('cancel blocked within 3 hours or after check-in', () {
    final start = DateTime.now().toUtc().add(const Duration(hours: 2));
    expect(BookingRules.canCancel(status: BookingStatus.approved, startAt: start, checkedIn: false), isFalse);
    final later = DateTime.now().toUtc().add(const Duration(hours: 5));
    expect(BookingRules.canCancel(status: BookingStatus.approved, startAt: later, checkedIn: false), isTrue);
    expect(BookingRules.canCancel(status: BookingStatus.inUse, startAt: later, checkedIn: true), isFalse);
  });

  test('check-in window opens 15 minutes before start', () {
    final start = DateTime.now().toUtc().add(const Duration(minutes: 10));
    expect(BookingRules.checkInWindow(start), CheckInWindow.open);
    expect(BookingRules.checkInWindow(DateTime.now().toUtc().add(const Duration(hours: 3))), CheckInWindow.tooEarly);
    expect(BookingRules.checkInWindow(DateTime.now().toUtc().subtract(const Duration(minutes: 40))), CheckInWindow.expired);
  });
}
```

- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement rules/mappers/repository.**
- [ ] **Step 4: Build 3-step UI** — `Stepper`-like custom progress header (3 segments, animated width), back allowed between steps; step 1 date picker (14 days), mode toggle (student hourly only; lecturer segmented period/hour), start/end pickers; step 2 fetch available rooms with `GET /api/Rooms/available?date=&startTime=&endTime=&mode=`; multi-select cards with capacity; step 3 activity/purpose/guests/note validation, summary, submit with loading button; success screen with check animation; eligibility banner from `/api/Violations/my-eligibility`; confirm-discard dialog with `PopScope`; `initialRoomId`/query prefill support.
- [ ] **Step 5: Wire route `/booking/new`.**
- [ ] **Step 6: Verify + commit.**

---

## Task 7: My bookings, usage (check-in/out), feedback

**Files:**
- Create: `lib/features/booking/presentation/{bookings_page.dart,booking_detail_page.dart,widgets/booking_card.dart,widgets/cancel_sheet.dart}`
- Create: `lib/features/usage/domain/{usage_session.dart,usage_repository.dart}`, `lib/features/usage/data/{usage_api.dart,usage_repository_impl.dart}`, `lib/features/usage/application/usage_controller.dart`, `lib/features/usage/presentation/{check_in_sheet.dart,check_out_sheet.dart,code_lookup_sheet.dart}`
- Create: `lib/features/feedback/domain/{feedback_summary.dart,feedback_repository.dart}`, `lib/features/feedback/data/{feedback_api.dart,feedback_repository_impl.dart}`, `lib/features/feedback/presentation/feedback_sheet.dart`
- Test: `test/unit/booking_mapper_test.dart` (status normalization, detail parsing), `test/widget/bookings_filter_test.dart`

**Interfaces:**
- `BookingStatus.fromApi` handles `Chờ duyệt|Pending`, `Đã duyệt|Approved`, `Duyệt một phần|PartiallyApproved`, `Từ chối|Rejected`, `Đã hủy|Cancelled`, `Đang sử dụng|InUse`, `Hoàn thành|Completed`.
- `UsageStatus { awaiting, inUse, completed, cancelled }` with labels `Chờ nhận phòng|Đang sử dụng|Hoàn thành|Đã hủy`.
- `UsageRepository { my(), byCode(String), checkIn({int? usageSessionId, int? bookingDetailId, String? code, int? guests, String? note}), checkOut({...checklist}) }`.
- `FeedbackRepository { byBooking(int), bySession(int), submit({int? bookingId, int? sessionId, required int rating, String? comment}) }`.
- Endpoints per spec §5.4.

- [ ] **Step 1: Tests** — status mapper for all 7 statuses (Vietnamese + English), filter counts, check-in sheet blocks submit without confirmation code.
- [ ] **Step 2: Implement list page** — filter chips with counts, search, cards (code, activity, rooms, time range, status badge, confirmation code + copy), tap → detail. Pull-to-refresh + skeleton + empty.
- [ ] **Step 3: Implement detail page** — summary, per-room statuses, rejection reason, approval history timeline, actions by state (cancel when allowed; check-in in window; check-out when in use; review when completed). Sheets: cancel 2-step reason; check-in (actual guests, note); check-out (room condition + 3 checklist switches + note); feedback (5-star + 500-char comment, editable).
- [ ] **Step 4: Home banner** — ready session (start −15min) → "Nhận phòng ngay"; in-use → "Trả phòng"; code lookup sheet (`HUIT-xxxxx`).
- [ ] **Step 5: Verify + commit.**

---

## Task 8: Notifications

**Files:**
- Create: `lib/features/notification/domain/app_notification.dart`, `lib/features/notification/data/{notifications_api.dart,notifications_repository_impl.dart}`, `lib/features/notification/application/notifications_controller.dart`, `lib/features/notification/presentation/notifications_page.dart`
- Test: `test/unit/notification_mapper_test.dart`

**Interfaces:**
- `AppNotification { int id; String title; String body; DateTime? createdAt; bool isRead; String? actionUrl; String type; }`, `unreadCountProvider`, `notificationsProvider` (paginated, page size 20), `markRead`, `markAllRead`, `delete`.
- Endpoints: `GET /api/Notifications?page=&pageSize=`, `GET /api/Notifications/unread-count`, `PUT /api/Notifications/{id}/read`, `PUT /api/Notifications/read-all`, `DELETE /api/Notifications/{id}`.

- [ ] Steps: test mapper (null dates, unread flag variants) → implement API/controller → list UI with unread dots, "Đọc tất cả", swipe-to-delete with Undo (SnackBar action restores by re-fetching; deletion is server-side so Undo is not offered — use confirm dialog instead per §9; **choose**: swipe delete with confirmation, no false Undo) → tap opens booking (`/bookings/:id`) when `actionUrl` parseable, else marks read → wire bell badges in Home/Schedule/Bookings headers → test → commit.

*Note:* §6.10 asks swipe with Undo; the server delete is permanent, so swipe opens a confirm dialog instead of a fake Undo. Document in code comment and commit message.

---

## Task 9: Profile, forgot password, chat

**Files:**
- Create: `lib/features/profile/presentation/profile_page.dart`, `lib/features/profile/application/profile_controller.dart`, `lib/features/profile/data/profile_api.dart`
- Complete: `lib/features/auth/presentation/forgot_password_page.dart` (2 steps)
- Create: `lib/features/chat/domain/{conversation.dart,chat_message.dart,chat_repository.dart}`, `lib/features/chat/data/{chat_api.dart,chat_hub.dart,chat_repository_impl.dart}`, `lib/features/chat/application/chat_controller.dart`, `lib/features/chat/presentation/chat_page.dart`
- Test: `test/unit/chat_message_test.dart` (fromJson), `test/widget/profile_page_test.dart` (logout confirmation)

**Interfaces:**
- Profile: `GET /api/Users/me`, `PUT /api/Users/me` (phone), logout confirm.
- Chat: `GET /api/Chat/my-active`, `POST /api/Chat/new-conversation`, `GET /api/Chat/conversations/{id}`, `POST /api/Chat/send`, `POST /api/Chat/conversations/{id}/read`, `GET /api/Chat/on-duty-staff`; SignalR `/hubs/chat?access_token=`.
- `ChatController` connects on page open, disconnects on dispose; optimistic pending status with `sending/sent/failed`, retry on tap.

- [ ] Steps: profile UI (avatar initials, role/department, links, logout dialog) → forgot password 2-step form with backend messages → chat REST + SignalR (messages list inverted, composer, typing indicator optional, empty state when no staff) → tests → commit.

---

## Task 10: Animation & polish pass

**Files:** Modify `lib/app/router.dart`, `lib/core/widgets/*`, all list pages.

- [ ] Page transitions: custom `CustomTransitionPage` fade + 12% horizontal slide, 220ms enter / 150ms exit.
- [ ] Tab switch: `AnimatedSwitcher` crossfade in `AppShell`.
- [ ] Staggered list entrance (40ms/item, 240ms, max 12 items).
- [ ] Shimmer skeletons shaped like content on first load only (>300ms delay).
- [ ] Buttons: press scale 0.965 with 160ms, ripple; async buttons disabled + inline spinner.
- [ ] Bottom sheets: spring-like `DraggableScrollableSheet` where content is long.
- [ ] Respect `MediaQuery.disableAnimations`: durations clamped to 0–100ms, loops stopped.
- [ ] Smooth scroll: `BouncingScrollPhysics` on lists, horizontal day strip with `PageController`.
- [ ] Verify every interactive target ≥48dp; run `flutter analyze`.
- [ ] Commit.

---

## Task 11: Android config, tests, APK

**Files:**
- Modify: `mobile_app/android/app/src/main/AndroidManifest.xml`, `mobile_app/android/app/build.gradle.kts`, `mobile_app/android/app/src/debug/AndroidManifest.xml` + `res/xml/network_security_config.xml`, `mobile_app/README.md`
- Test: full suite

- [ ] **Step 1: Manifest**

```xml
<application android:label="RoMan" android:icon="@mipmap/ic_launcher" android:usesCleartextTraffic="true" ...>
  ...
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="roman" android:host="bookings" />
  </intent-filter>
</application>
```

Debug-only network security config allowing cleartext to `10.0.2.2`, `localhost`, and LAN `192.168.0.0/16`; release manifest keeps `usesCleartextTraffic="false"`.

- [ ] **Step 2: Gradle** — `minSdk = 23`, `targetSdk = 36`, `compileSdk = 36`, `ndkVersion` default.
- [ ] **Step 3: Tests** — `flutter test` all green; add widget test for `BookingCreatePage` step validation with a fake repository if not already covered.
- [ ] **Step 4: Analyze** — `flutter analyze` zero issues.
- [ ] **Step 5: Build APK**

```bash
cd mobile_app
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:5056
ls -lh build/app/outputs/flutter-apk/app-debug.apk
```

- [ ] **Step 6: README** — run instructions (backend up, emulator, `--dart-define`, install APK), test commands, layer rules.
- [ ] **Step 7: Commit**

```bash
git add mobile_app
git commit -m "feat(mobile): android config, docs and debug APK build"
```

---

## Self-Review

**Spec coverage**
- §5 API: auth/profile/rooms/periods/schedule/bookings/usage/notifications/feedback/violations/chat — Tasks 3, 4, 5, 6, 7, 8, 9.
- §6 screens: splash/login/home/rooms/room detail/schedule/create/bookings/notifications/chat/profile/forgot — Tasks 3–9. Approvals for staff excluded per phase 1.
- §7 design tokens/typography/icons — Task 1 + 4 (`StatusPalette`).
- §8 animations — Task 10 (topography in Task 3).
- §9 states — shared widgets Task 4, applied in every list task.
- §10 tests — unit/widget tasks throughout; manual golden path in Task 11 README.
- §11 checklist — Task 10.
- §12 build/run — Task 11.
- §2 decision "web-matching light theme" — Task 1.
- Deep link `roman://bookings/:id` — Task 11 manifest, route in Task 3/7.

**Gaps accepted:** push notifications, offline writes, staff/admin, reports — out of phase-1 scope per spec §1.

**Placeholder scan:** no TBD/TODO steps; each implementation step names exact files, keys, endpoints and expected behavior. UI compositions are described by content and behavior rather than full widget trees to keep the plan readable; tests already lock the observable behavior.

**Type consistency:** `AppException.message`, `ApiClient` return type `dynamic`, `SessionUser.fromJson`, `Room.fromJson`, `BookingStatus.fromApi`, `BookingRules.validateStudentWindow`, `UsageRepository.checkIn/checkOut`, `authControllerProvider` used consistently across tasks.
