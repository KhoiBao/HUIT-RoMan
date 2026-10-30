# RoMan Mobile (Flutter/Android) — Thiết kế

- **Ngày:** 2026-10-31
- **Trạng thái:** Chờ duyệt
- **Phạm vi:** App Android cho Sinh viên / Giảng viên; nhân sự & quản trị làm ở giai đoạn 2
- **Nền tảng:** Flutter (Dart), Android; backend ASP.NET Core hiện có, không sửa backend
- **Thư mục dự án:** `mobile_app/` (tài liệu nghiệp vụ vẫn ở `mobile/`)

## 0. Nguồn sự thật & đính chính tài liệu cũ

Thứ tự ưu tiên khi có mâu thuẫn:

1. Hợp đồng API thực tế trong `backend/src/API/Controllers` + DTO.
2. Hành vi đang chạy của web `web/src` (đã kiểm chứng với backend).
3. Bộ tài liệu `mobile/*.md` (chỉ tham khảo; đã lỗi thời ở một số mục).

Các sai sót đã phát hiện trong `mobile/*.md`:

| Tài liệu | Nội dung cũ | Thực tế |
|---|---|---|
| `mobile/06-checkin.md` | “module Usage chưa làm, chưa có API” | `UsageSessionsController` đã có check-in, check-out, no-show, extend, my/active/summary/code |
| `mobile/07-notifications.md` | “chưa làm, chưa có API” | `NotificationsController` đã có list, unread-count, read, read-all, delete |
| `mobile/08-reports.md` | “chưa nối API” | `ReportsController` đã có overview/bookings/room-usage/violations + export CSV (giai đoạn 2) |
| `mobile/design-system.md` | Font Inter | Web dùng **Be Vietnam Pro** (5 weight, `web/public/fonts`) |
| `mobile/01-authentication.md` | Chỉ email `@huit.edu.vn` | Web và backend nhận **email, MSSV hoặc mã CBVC** (`cardCode`) |
| `mobile/03-rooms.md` | Trạng thái `Trống`/`Bảo trì` | Còn có `Đang sử dụng`; phòng có thiết bị bảo trì tự thành `Bảo trì` |
| `mobile/04-booking.md` | “theo giờ hoặc theo tiết” chung | Sinh viên **chỉ theo khung giờ** (07:00–20:00, tối đa 2h, nghỉ Chủ nhật); giảng viên được chọn cả hai |

## 1. Bối cảnh & mục tiêu

Web (`web/`) đã hoàn thiện nghiệp vụ. App mobile tái sử dụng đúng hợp đồng API của backend cho nhóm người dùng cuối, tối ưu màn hình dọc, thao tác một tay, thông báo in-app.

Mục tiêu giai đoạn 1:

1. Đăng nhập bằng email/MSSV/mã CBVC, giữ phiên 7 ngày.
2. Xem phòng, lịch phòng theo ngày, tình trạng trống/đang dùng/bảo trì.
3. Tạo đơn đặt phòng theo giờ hoặc theo tiết, nhiều phòng, có kiểm tra phòng trống.
4. Theo dõi đơn của mình: hủy, check-in, check-out, đánh giá.
5. Nhận thông báo in-app và chat hỗ trợ thời gian thực.
6. Giao diện đồng bộ web: navy/xanh HUIT, Be Vietnam Pro, chuyển động nhẹ có mục đích.

Ngoài phạm vi: push notification (backend chưa có FCM), offline ghi dữ liệu, thanh toán, đăng ký tài khoản, nhân sự/admin, báo cáo/biểu đồ.

## 2. Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Phạm vi | Sinh viên/Giảng viên đầy đủ; nhân sự duyệt đơn ở giai đoạn 2 |
| Môi trường | Flutter stable 3.47.9 đã cài tại `C:\flutter`; Android SDK 34–36 + JDK 21 có sẵn; build APK debug, kiểm thử trên emulator/máy thật |
| Giao diện | Theo web hiện tại, chỉ light theme |
| Tổ chức code | N-layer feature-first, Riverpod, go_router, Dio |
| Ngôn ngữ UI | Tiếng Việt |

## 3. Kiến trúc N-layer

### 3.1 Quy tắc phụ thuộc

```text
presentation  →  application  →  domain
                                     ↑
                    data  ───────────┘
```

- `domain`: Dart thuần, không import Flutter/Dio. Chứa entity, enum, validation nghiệp vụ, interface repository.
- `data`: DTO + mapper + repository impl. Không rò rỉ DTO ra ngoài tầng data.
- `application`: Riverpod notifier/controller và use case. Không biết Dio, không biết widget.
- `presentation`: screen/widget. Chỉ đọc state qua provider, gọi action của application.
- `core`: hạ tầng dùng chung (network, storage, theme, widget chung, lỗi).
- Không import chéo giữa các feature; giao tiếp qua `domain` hoặc `core`.

### 3.2 Cấu trúc thư mục

```text
mobile_app/
├─ android/
├─ assets/
│  ├─ fonts/BeVietnamPro-*.ttf
│  └─ images/roman-logo-icon.png
├─ lib/
│  ├─ main.dart
│  ├─ app/
│  │  ├─ app.dart                 # MaterialApp.router
│  │  ├─ router.dart              # go_router + redirect theo auth
│  │  └─ splash_page.dart
│  ├─ core/
│  │  ├─ config/app_config.dart   # API_BASE_URL từ --dart-define
│  │  ├─ network/dio_client.dart  # Dio + interceptors
│  │  ├─ network/api_envelope.dart
│  │  ├─ network/error_mapper.dart
│  │  ├─ storage/token_store.dart
│  │  ├─ storage/prefs_store.dart
│  │  ├─ errors/app_exception.dart
│  │  ├─ theme/app_colors.dart
│  │  ├─ theme/app_theme.dart
│  │  ├─ theme/app_spacing.dart
│  │  ├─ utils/date_time_x.dart   # UTC ↔ local (+7), định dạng ngày
│  │  └─ widgets/                 # AppButton, StatusBadge, EmptyState, ErrorView, LoadingSkeleton, AppSheet, ConfirmDialog
│  └─ features/
│     ├─ auth/
│     │  ├─ domain/               # UserRole, SessionUser, AuthRepository
│     │  ├─ data/                 # AuthApi, LoginDto, AuthRepositoryImpl
│     │  ├─ application/          # auth_controller.dart, auth_providers.dart
│     │  └─ presentation/         # login_page.dart, forgot_password_page.dart
│     ├─ profile/
│     ├─ rooms/
│     ├─ schedule/
│     ├─ booking/
│     ├─ usage/
│     ├─ notification/
│     ├─ feedback/
│     └─ chat/
├─ test/
│  ├─ unit/
│  └─ widget/
└─ pubspec.yaml
```

### 3.3 Mẫu một feature

```text
features/booking/
├─ domain/
│  ├─ entities/booking.dart, booking_detail.dart, booking_status.dart
│  ├─ repositories/booking_repository.dart
│  └─ services/booking_rules.dart        # hủy T-3h, cửa sổ check-in, validate
├─ data/
│  ├─ booking_api.dart
│  ├─ dto/booking_dto.dart
│  ├─ mappers/booking_mapper.dart
│  └─ booking_repository_impl.dart
├─ application/
│  ├─ booking_list_controller.dart
│  ├─ booking_create_controller.dart
│  └─ booking_providers.dart
└─ presentation/
   ├─ booking_list_page.dart
   ├─ booking_create_page.dart
   ├─ booking_detail_sheet.dart
   └─ widgets/booking_card.dart
```

## 4. Stack

| Thư viện | Mục đích |
|---|---|
| `flutter_riverpod` | State, DI |
| `go_router` | Điều hướng có tên, deep link, `StatefulShellRoute` giữ state tab |
| `dio` | HTTP + interceptor |
| `flutter_secure_storage` | JWT |
| `shared_preferences` | Lựa chọn UI (tab cuối, gợi ý đã đọc) |
| `json_annotation` + `json_serializable` + `build_runner` | DTO |
| `flutter_animate` | Animation khai báo |
| `shimmer` | Skeleton |
| `intl` | Định dạng ngày/giờ tiếng Việt |
| `signalr_netcore` | Chat realtime `/hubs/chat` |
| `flutter_svg` | Icon/logo vector nếu cần |

Không dùng thư viện UI bên thứ ba (Material 3 thuần + theme riêng) để giữ đúng phong cách web.

## 5. Hợp đồng tích hợp API

### 5.1 Cấu hình

- `API_BASE_URL` truyền qua `--dart-define`; mặc định `http://10.0.2.2:5056` (emulator), máy thật dùng IP LAN.
- Backend dev chạy HTTP, không HTTPS → Android debug cần `network_security_config` cho phép cleartext với `10.0.2.2` và dải LAN; release không bật cleartext.
- Mọi request gắn `Authorization: Bearer <token>` (kể cả endpoint public, để backend lọc theo role/khoa).

### 5.2 Envelope & lỗi

- Đọc `{ success, message, data }`; login trả object trần `{ token, user }`.
- 401 (body rỗng) → `UnauthorizedException`: xóa token, điều hướng `/login`, hiện “Phiên đăng nhập đã hết hạn”.
- 403 → màn “Không có quyền” + quay lại.
- 400/404 → `BusinessException(message)` hiển thị message backend.
- Timeout/lỗi mạng → `NetworkException`, có nút thử lại.
- Model validation 400 (`ProblemDetails.errors`) → lấy message đầu tiên để hiển thị dưới field nếu map được, còn lại Snackbar.

### 5.3 Thời gian & trạng thái

- API dùng UTC ISO-8601; app hiển thị giờ Việt Nam (+7). `date` của `/available`, `/schedule` là ngày Việt Nam (`yyyy-MM-dd`).
- Enum nội bộ cho trạng thái đơn/chi tiết/phiên phòng; mapper chịu được cả tiếng Việt và biến thể tiếng Anh.
- Role chuẩn hóa: `staff = {Admin, Manager, DepartmentManager, Employee}`; `user = {Student, Lecturer}` (so khớp không phân biệt hoa/thường).
- Status đơn/chi tiết: `Chờ duyệt`, `Đã duyệt`, `Duyệt một phần`, `Từ chối`, `Đã hủy`, `Đang sử dụng`, `Hoàn thành`. Status phiên: `Chờ nhận phòng`, `Đang sử dụng`, `Hoàn thành`, `Đã hủy`.

### 5.4 Endpoint sử dụng

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /api/Auth/login`, `POST /api/Auth/forgot-password`, `POST /api/Auth/reset-password` |
| Profile | `GET /api/Users/me`, `PUT /api/Users/me` |
| Phòng | `GET /api/Rooms`, `GET /api/Rooms/{id}`, `GET /api/Rooms/available`, `GET /api/Rooms/{id}/equipments`, `GET /api/RoomTypes`, `GET /api/Departments` |
| Tiết | `GET /api/Bookings/periods?roomTypeId=` |
| Lịch | `GET /api/Bookings/rooms/{roomId}/schedule?date=`, `GET /api/Bookings/schedules?from=&to=` (tối đa 62 ngày) |
| Đặt phòng | `POST /api/Bookings`, `GET /api/Bookings/my`, `GET /api/Bookings/{id}`, `PATCH /api/Bookings/{id}/cancel`, `GET /api/Bookings/{id}/approval-history` |
| Sử dụng | `GET /api/UsageSessions/my`, `GET /api/UsageSessions/code/{code}`, `POST /api/UsageSessions/check-in`, `POST /api/UsageSessions/check-out` |
| Thông báo | `GET /api/Notifications`, `GET /api/Notifications/unread-count`, `PUT /api/Notifications/{id}/read`, `PUT /api/Notifications/read-all`, `DELETE /api/Notifications/{id}` |
| Đánh giá | `POST /api/Feedbacks`, `GET /api/Feedbacks/by-booking/{id}`, `GET /api/Feedbacks/by-session/{id}`, `GET /api/Feedbacks/room-summary/{roomId}` |
| Vi phạm | `GET /api/Violations/my-eligibility` (banner bị cấm mượn) |
| Chat | `GET /api/Chat/my-active`, `POST /api/Chat/new-conversation`, `GET /api/Chat/conversations/{id}`, `POST /api/Chat/send`, `POST /api/Chat/conversations/{id}/read`, `GET /api/Chat/on-duty-staff`; SignalR `/hubs/chat` (`?access_token=`) |

Payload quan trọng:

- Tạo đơn: `{ activityName, purpose, guestCount, note, details: [{ roomId, startAt, endAt, startPeriodId?, endPeriodId?, guestCount, purpose }] }`.
  - `startAt/endAt` là UTC. Phòng `isBookingByPeriod = true` bắt buộc `startPeriodId/endPeriodId`; phòng theo giờ không gửi period.
- Hủy: `{ reason: "CHANGE_PLAN" | "NO_LONGER_NEEDED" | "OTHER", reasonDetail }`; `OTHER` bắt buộc có chi tiết.
- Check-in: `{ usageSessionId?, bookingDetailId?, confirmationCode?, actualGuestCount?, staffNote? }` — ít nhất một định danh.
- Check-out: `{ usageSessionId?, bookingDetailId?, roomCondition: "Trống" | "Bảo trì", devicesOk, cleaned, lightsOff, staffNote? }`.
- Đánh giá: `{ bookingId?, usageSessionId?, rating: 1..5, comment? }`.

## 6. Đặc tả màn hình

### 6.1 Điều hướng

```text
/splash → /login (chưa có token)
        → /home (đã có token)

Shell (bottom nav, StatefulShellRoute): /home · /schedule · /bookings · /profile
Push: /rooms, /rooms/:id, /booking/new, /bookings/:id, /notifications, /chat, /forgot-password
```

- Bottom nav 4 tab, icon + label, indicator trượt; giữ state từng tab; badge số chưa đọc đặt trên chuông thông báo ở header, không đặt trên tab.
- FAB “Đặt phòng” nổi trên tab bar ở Home/Schedule (một primary CTA mỗi màn hình).
- `go_router.redirect`: chưa đăng nhập → `/login`; đã đăng nhập vào `/login` → `/home`.
- Deep link: `roman://bookings/:id` mở chi tiết đơn; thông báo trỏ đúng màn hình.
- Back: Android predictive back; không reset stack; giữ scroll/filter khi quay lại.

### 6.2 Splash

Logo HUIT (asset có sẵn), fade + scale 400ms. Đọc token, điều hướng.

### 6.3 Đăng nhập

- Nền navy, card trắng, logo, tiêu đề “Đăng nhập”.
- Ô “Email hoặc MSSV/Mã CBVC” (bàn phím text/email), Mật khẩu (hiện/ẩn), “Quên mật khẩu?”.
- Validate: email phải `@huit.edu.vn`; mã 3–50 ký tự chữ/số; mật khẩu không rỗng. Lỗi đỏ dưới ô, rung nhẹ ô sai, focus ô lỗi đầu tiên khi submit.
- Nút “Đăng nhập” full-width, loading spinner trong nút, chặn double-submit, haptic nhẹ khi lỗi.
- Lỗi 401 hiện message backend dưới form.
- Quên mật khẩu: 2 bước (gửi định danh → OTP + mật khẩu mới ≥ 6 ký tự), hiển thị đúng message backend.

### 6.4 Home

- Header: lời chào `fullName`, vai trò, chuông thông báo kèm badge số chưa đọc.
- Banner phiên: nếu có phiên “Chờ nhận phòng” trong cửa sổ T-15' → nút “Nhận phòng ngay”; nếu “Đang sử dụng” → “Trả phòng”.
- 4 số liệu: phòng trống, sắp sử dụng, đang dùng, bảo trì (tính từ rooms + lịch hôm nay).
- Card loại phòng (tên, sức chứa, theo tiết/theo giờ, số phòng trống) → chạm mở danh sách phòng đã lọc.
- Lối tắt: “Đặt phòng”, “Lịch phòng”, “Đơn của tôi”.
- Pull-to-refresh; skeleton lần đầu; lỗi có nút thử lại.
- Tải một lần bằng `GET /api/Rooms` + `GET /api/Bookings/schedules?from=to` (một request, không N+1).

### 6.5 Danh sách phòng

- Search theo tên/mã; filter bottom sheet: loại phòng, tòa, tầng, trạng thái.
- Card: tên, mã, tòa/tầng, sức chứa, badge trạng thái, loại đặt (tiết/giờ).
- Chạm card → chi tiết.

### 6.6 Chi tiết phòng

- Thông số, mô tả, thiết bị kèm số lượng.
- Lịch hôm nay của phòng (dạng timeline dọc), nút “Đặt phòng này”.
- Badge trạng thái; phòng “Bảo trì” ẩn/khoá nút đặt.

### 6.7 Lịch phòng

- Dải ngày ngang (7 ngày, vuốt; chọn ngày bất kỳ trong 14 ngày tới).
- Danh sách phòng kèm timeline 07:00–20:00 dạng dọc, block lịch màu theo trạng thái; vạch “Hiện tại”.
- Chạm khoảng trống → mở đặt phòng với giờ gợi ý; chạm block → bottom sheet chi tiết.
- Filter: tòa, tầng, loại phòng, trạng thái; pull-to-refresh.

### 6.8 Tạo đơn (3 bước, progress bar, cho phép quay lại)

1. **Thời gian & chế độ**
   - Sinh viên: chỉ theo khung giờ 07:00–20:00, tối đa 2 giờ, không Chủ nhật; chỉ phòng nhóm/thuyết trình (backend tự lọc).
   - Giảng viên: chọn “Theo tiết” hoặc “Theo khung giờ”.
   - Chọn ngày (hôm nay → +14 ngày), giờ/tiết bắt đầu–kết thúc.
2. **Chọn phòng trống**: gọi `/api/Rooms/available` theo ngày + giờ/tiết; nhóm theo loại/tòa/tầng; chọn nhiều phòng; hiển thị sức chứa; empty state hướng dẫn đổi giờ/ngày.
3. **Thông tin & xác nhận**: tên hoạt động (≥ 3 ký tự), số người (≤ sức chứa nhỏ nhất), mục đích (≥ 3 ký tự), ghi chú; tóm tắt; “Gửi đơn”.
   - Thành công: 201 → màn thành công (check-mark animation) + nút “Xem đơn của tôi”.

Chặn gửi khi tài khoản bị cấm mượn (`/api/Violations/my-eligibility`); hiện banner lý do và ngày hết hạn. Rời form giữa chừng khi đã nhập → hộp thoại xác nhận.

### 6.9 Đơn của tôi

- Filter chip trạng thái kèm số lượng: Tất cả, Chờ duyệt, Đã duyệt, Đang sử dụng, Hoàn thành, Đã hủy; search theo phòng/mã/hoạt động.
- Card: mã đơn + hoạt động, phòng, khung giờ, badge trạng thái, mã nhận phòng (copy).
- Bottom sheet chi tiết: các phòng, trạng thái từng phòng, lý do từ chối, lịch sử duyệt.
- Hành động theo trạng thái:
  - Hủy: chỉ khi đã duyệt, chưa check-in, còn > 3 giờ; 2 bước (lý do → xác nhận).
  - Check-in: khi cửa sổ `Open`, nhập số người thực tế + ghi chú.
  - Check-out: sau khi đang sử dụng; checklist 3 mục + tình trạng phòng.
  - Đánh giá: sau khi hoàn thành; 5 sao + nhận xét ≤ 500 ký tự; cho sửa.
- Nhập mã `HUIT-xxxxx` để tra cứu phiên nhanh.

### 6.10 Thông báo

- Danh sách phân trang; chấm chưa đọc; chạm để đọc và mở liên kết liên quan (đơn/phiên).
- “Đọc tất cả”, xóa từng mục (vuốt kèm Undo), badge số chưa đọc trên Home/tab.
- Loại thông báo: quyết định đơn, nhắc check-in, nhắc trả phòng, vi phạm.

### 6.11 Chat hỗ trợ

- Nút chat ở Home/Profile; hội thoại đang mở hoặc tạo mới.
- Tin nhắn realtime qua SignalR, typing indicator, trạng thái gửi; lịch sử qua REST.

### 6.12 Hồ sơ

- Avatar chữ cái, họ tên, email, vai trò, đơn vị.
- Liên kết: Thông báo, Chat, Đổi mật khẩu (dùng forgot/reset nếu backend cho), Đăng xuất (xác nhận, tách khỏi nhóm điều hướng).

## 7. Design system (tổng hợp UI/UX Pro Max + thương hiệu web)

UI/UX Pro Max gợi ý **Minimalism & Swiss Style** (sạch, nhiều khoảng trống, tương phản cao, lưới rõ) — phù hợp app tiện ích và trùng hướng web. Hai điểm lệch có chủ đích vì ràng buộc thương hiệu:

- Bảng màu: giữ navy/xanh HUIT thay vì palette sky-blue mặc định.
- Font: giữ **Be Vietnam Pro** thay vì Inter.

Pattern áp dụng là **app shell 4 tab** cho tác vụ hằng ngày, không dùng landing/app-store pattern.

### 7.1 Màu (semantic token, không hard-code trong widget)

| Token | Mã | Dùng |
|---|---|---|
| `navy` | `#1A365D` | Nền header, chữ chính |
| `primary` | `#005A9E` | Nút chính, active, link |
| `primaryDark` | `#004A84` | Pressed |
| `gold` | `#8E4302` | Cảnh báo, nhấn phụ |
| `bg` | `#F3F7FB` | Nền màn hình |
| `surface` | `#FFFFFF` | Card, sheet |
| `muted` | `#5B6B7F` | Chữ phụ, label |
| `line` | `#DDE4EE` | Divider, viền |
| `danger` | `#C0392B` | Lỗi, từ chối |
| `success` | `#0D8A62` | Đã duyệt, đang dùng |

Badge trạng thái dùng nền pastel + chữ đậm + **icon hoặc nhãn chữ** (không chỉ dựa vào màu): Chờ duyệt `#FFF8E1/#B78103`, Đã duyệt `#E8F5E9/#2E7D32`, Duyệt một phần `#E3F2FD/#1565C0`, Từ chối `#FFEBEE/#C62828`, Đã hủy `#F5F5F5/#757575`, Đang sử dụng `#ECFDF5/#059669`, Hoàn thành `#F0F9FF/#0284C7`, Bảo trì `#FFF3E0/#8E4302`. Kiểm tra tương phản ≥ 4.5:1 cho chữ nhỏ, ≥ 3:1 cho icon lớn.

### 7.2 Typography (Be Vietnam Pro)

| Vai trò | Size/Weight | Ghi chú |
|---|---|---|
| Display | 28 / 700 | Số liệu lớn, tiêu đề chào |
| Headline | 22 / 700 | Tiêu đề màn hình |
| Title | 16 / 600 | Tiêu đề card, section |
| Body | 14–16 / 400 | Nội dung; line-height 1.5 |
| Label | 12 / 500 | Nhãn, caption, trạng thái |

Hỗ trợ Dynamic Type: dùng `textScaler` của hệ thống, tránh cắt chữ; giới hạn tối đa hợp lý để không vỡ layout.

### 7.3 Hình khối & nhịp

- Spacing 4/8/12/16/24/32; lưới 8dp.
- Radius: input 12, card 16, sheet 20 (hai góc trên).
- Shadow duy nhất: `0 8 24 rgba(26,54,93,0.08)`.
- Không gradient; tối đa 1 màu nhấn/màn hình.
- Touch target ≥ 48dp (Material) với khoảng cách ≥ 8dp; safe area cho tai thỏ/gesture bar.
- Icon: Material Symbols/Icons, một bộ duy nhất, size token 20/24/28; **không emoji làm icon**; logo chỉ dùng file `roman-logo-icon.png`.

## 8. Animation

| Thành phần | Hiệu ứng | Thời lượng |
|---|---|---|
| Route push | fade + slide 12% ngang, ease-out | 220ms (exit ~150ms) |
| Tab switch | crossfade + slide nhẹ | 180ms |
| Danh sách | staggered fade-up 40ms/item | 240ms |
| Skeleton | shimmer | lặp, chỉ khi tải > 300ms |
| Status badge | màu + scale nhẹ | 200ms |
| Chấm live | pulse opacity | 1.6s lặp (chỉ trạng thái live) |
| Check-in thành công | vẽ check-mark + haptic | 400ms |
| Countdown | vòng tròn tiến trình | mỗi giây |
| Bottom sheet | kéo thả, spring nhẹ | mặc định |

Quy ước: chỉ animate `transform`/`opacity`; mỗi màn tối đa 1–2 phần tử động; animation không chặn thao tác; tôn trọng `MediaQuery.disableAnimations` (bỏ hiệu ứng lặp, rút ngắn còn 0–100ms).

## 9. Trạng thái màn hình & phản hồi

Mỗi màn hình dùng chung bộ trạng thái:

- `loading` lần đầu: skeleton đúng hình dạng nội dung (không spinner toàn màn).
- `empty`: icon vector + câu ngắn + hành động gợi ý (ví dụ “Chưa có đơn — Đặt phòng”).
- `error`: cause + cách xử lý + “Thử lại”; timeout có retry.
- `refreshing`: pull-to-refresh giữ dữ liệu cũ.
- Hành động ghi: chờ server rồi cập nhật danh sách + Snackbar 3–5s; không optimistic update.
- Hành động phá hủy: dialog xác nhận, nút nguy hiểm tách khỏi CTA chính; xóa thông báo có Undo.
- Nút async: disabled + spinner trong nút, chặn double-tap.
- Lỗi form: hiển thị dưới field, validate khi blur hoặc submit, focus field lỗi đầu tiên.

## 10. Kiểm thử

- Unit: mapper DTO↔entity, role/status normalizer, UTC↔local, validation đặt phòng, luật hủy T-3h, cửa sổ check-in.
- Widget: Login (thành công/lỗi 401/sai định dạng), Đặt phòng 3 bước với repository giả, Đơn của tôi (filter theo trạng thái), Home (skeleton/empty/error).
- Repository: `MockDio` cho envelope, lỗi 400/401/403.
- Manual: backend Docker + emulator; golden path đặt → duyệt (bằng web) → check-in → check-out → đánh giá.

## 11. Chất lượng UI/UX — checklist nghiệm thu

Trước khi báo hoàn thành mỗi batch:

**Tương tác**
- [ ] Mọi vùng chạm ≥ 48dp, cách nhau ≥ 8dp, có ripple/pressed feedback.
- [ ] Micro-interaction 150–300ms; không animation > 500ms; exit nhanh hơn enter.
- [ ] Nút async disable + spinner; không double-submit.
- [ ] Gesture không xung đột (cuộn dọc là chính; không swipe ngang trên nội dung).

**Biểu mẫu**
- [ ] Mỗi input có label thường trực (không chỉ placeholder).
- [ ] Lỗi dưới field, nêu nguyên nhân + cách sửa; focus field lỗi đầu tiên.
- [ ] Bàn phím đúng loại (email/số), có nút hiện/ẩn mật khẩu.
- [ ] Multi-step có progress + quay lại; cảnh báo mất dữ liệu khi thoát.

**Điều hướng**
- [ ] Bottom nav 4 mục có icon + nhãn; tab active rõ ràng; giữ state tab.
- [ ] Back dự đoán được, không reset stack; deep link mở đúng màn.
- [ ] Badge chỉ dùng cho chưa đọc/chờ xử lý và xóa sau khi xem.

**Hiển thị**
- [ ] Không emoji làm icon; một bộ icon nhất quán; logo đúng file gốc.
- [ ] Điểm chạm và nội dung không bị tai thỏ/gesture bar che.
- [ ] Tương phản đạt 4.5:1 (chữ) / 3:1 (icon); trạng thái không chỉ dựa vào màu.
- [ ] Dynamic text 200% không vỡ layout; reduced motion được tôn trọng.
- [ ] Kiểm tra 360dp (điện thoại nhỏ) và xoay ngang.

**Hiệu năng**
- [ ] Danh sách dùng builder + `ValueKey(item.id)`; ảnh/asset khai báo kích thước.
- [ ] Không N+1 API ở Home/Lịch; debounce tìm kiếm 300ms.
- [ ] Skeleton xuất hiện khi tải > 300ms; không nhảy layout khi dữ liệu về.

## 12. Build & vận hành

1. `flutter create --org vn.edu.huit --project-name roman_mobile --platforms=android mobile_app`
2. Copy font và logo từ `web/public/` vào `assets/`.
3. Chấp nhận Android licenses: `flutter doctor --android-licenses`.
4. Build debug: `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:5056`
5. Cài: `adb install -r build/app/outputs/flutter-apk/app-debug.apk`
6. Release: dùng keystore riêng (ngoài phạm vi giai đoạn 1), tắt cleartext, `API_BASE_URL` trỏ https.

Không sửa `backend/` và `web/`. Làm trên nhánh `dev/Khoi`, commit theo quy ước hiện có.

## 13. Rủi ro & giả định

| Rủi ro | Xử lý |
|---|---|
| Backend chưa có push notification | Thông báo in-app + pull-to-refresh; không giả lập push |
| `GET /api/UsageSessions/{id}` và `/code/{code}` không kiểm tra chủ sở hữu | App chỉ hiển thị phiên của mình; ghi chú lỗi backend |
| Forgot-password trả OTP trong response, không kiểm tra OTP | Giữ luồng như web; ghi chú bảo mật, không coi OTP là bảo vệ thật |
| Token 7 ngày, không refresh | 401 → về Login; không lưu mật khẩu |
| HTTP cleartext khi dev | Chỉ cho phép trong build debug qua network security config |
| Flutter 3.47.9 đã cài; Android licenses chưa chấp nhận | Chạy `flutter doctor --android-licenses` trước khi build |
| Sinh viên chỉ được đặt nhóm/thuyết trình, theo giờ | Áp luật ở `booking_rules` và ẩn phòng không hợp lệ |
| Tài liệu `mobile/*.md` lỗi thời | Spec này là nguồn tham chiếu; cập nhật docs sau khi code xong |

## 14. Giai đoạn 2 (không làm bây giờ)

Nhân sự/Admin: duyệt đơn (toàn bộ/từng phòng), phiên sử dụng, check-in hộ, no-show, vi phạm, báo cáo, quản lý phòng/thiết bị. Dùng lại `core` + các domain hiện có; thêm feature `staff`.
