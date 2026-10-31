# RoMan Mobile

Ứng dụng Android (Flutter) dành cho **Sinh viên** và **Giảng viên** của HUIT-RoMan: đặt phòng, theo dõi đơn, nhận/trả phòng bằng mã, đánh giá phòng, thông báo và trò chuyện trực tuyến với bộ phận hỗ trợ.

Ứng dụng chỉ gọi API của backend hiện có, không sửa `backend/` hay `web/`.

## Yêu cầu

- Flutter 3.35 trở lên (đã kiểm thử với 3.47.9 / Dart 3.13.7)
- Android SDK + JDK 17
- Backend HUIT-RoMan đang chạy và truy cập được từ thiết bị/emulator

## Cấu hình API

Địa chỉ API truyền lúc build/run qua `--dart-define=API_BASE_URL`, mặc định `http://10.0.2.2:5056` (địa chỉ host của Android emulator).

```bash
# Emulator (backend chạy trên máy host, cổng 5056)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5056

# Điện thoại thật trong cùng mạng LAN (thay bằng IP máy chạy backend)
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:5056
```

SignalR dùng cùng host với `API_BASE_URL`, hub `/hubs/chat`. Manifest đã bật `INTERNET` và `usesCleartextTraffic` cho backend HTTP khi phát triển.

## Lệnh thường dùng

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:5056
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com
```

APK nằm ở `build/app/outputs/flutter-apk/`.

## Kiến trúc

Feature-first, N-layer:

```
lib/
  app/            # router (go_router), shell 4 tab, splash
  core/           # network (Dio + envelope), storage, theme, widgets dùng chung
  features/
    auth/         # đăng nhập, quên mật khẩu, hồ sơ phiên
    home/         # tổng quan, thao tác nhanh, banner nhận/trả phòng
    rooms/        # danh sách & chi tiết phòng
    schedule/     # lịch phòng theo ngày
    booking/      # tạo đơn 3 bước, danh sách & chi tiết đơn, hủy đơn
    usage/        # nhận/trả phòng, nhập mã sử dụng
    feedback/     # đánh giá phòng
    notification/ # thông báo có phân trang
    chat/         # hỗ trợ trực tuyến (REST + SignalR)
    profile/      # hồ sơ, điều hướng nhanh, đăng xuất
```

Mỗi feature chia `presentation → application → domain ← data`:

- `domain`: model và interface thuần Dart
- `data`: gọi API/SignalR, hiện thực repository
- `application`: Riverpod provider/controller
- `presentation`: màn hình, widget, animation

## Ghi chú phát triển

- UI tiếng Việt, theme sáng, font Be Vietnam Pro, màu theo bộ nhận diện RoMan.
- Thời gian từ API là UTC, hiển thị theo giờ Việt Nam (UTC+7).
- Đăng nhập lưu JWT trong `flutter_secure_storage`; hết phiên tự chuyển về trang đăng nhập.
