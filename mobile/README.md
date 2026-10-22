# RoMan Mobile — Tài liệu chức năng

Hệ thống quản lý đăng ký và khai thác phòng dùng chung (HUIT) — phiên bản di động.

## 1. Tổng quan

| Trích yếu | Nội dung |
|---|---|
| Dự án | CNTT-KLCN236, Trường Đại học Công Thương TP.HCM |
| Nền tảng mobile | Flutter (Dart) |
| API | REST, base URL `http://localhost:5056`, Swagger `/swagger` |
| Xác thực | JWT Bearer, token sống 7 ngày, không refresh/logout/đăng ký tự do |
| Chuẩn trả về | `{ "success": true\|false, "message": "...", "data": ... }` |
| 3 nhóm người dùng | Quản trị hệ thống (`Admin`), Nhân sự (`Employee`), Người dùng (`Student`/`Lecturer`) |

Tất cả API (trừ 2 API công khai có ghi chú) cần header `Authorization: Bearer <token>`.

## 2. Danh sách chức năng

| File | Chức năng | Ưu tiên | Trạng thái code |
|---|---|---|---|
| `01-authentication.md` | Đăng nhập / Xác thực | Must | Hoàn thiện (login JWT) |
| `02-profile-authorization.md` | Hồ sơ & phân quyền | Must | Hoàn thiện |
| `03-rooms.md` | Quản lý phòng | Must | Hoàn thiện (CRUD + trống + thiết bị) |
| `04-booking.md` | Đặt phòng | Must | Hoàn thiện (tạo/lịch/tiết/hủy) |
| `05-approval.md` | Duyệt đơn | Must | Hoàn thiện (toàn bộ + từng chi tiết) |
| `06-checkin.md` | Check-in / Check-out | Must | Dự kiến (module `Usage` chưa làm) |
| `07-notifications.md` | Thông báo | Should | Dự kiến (chưa làm) |
| `08-reports.md` | Báo cáo thống kê | Must | Dự kiến (proc có sẵn, chưa nối API) |

Nghiệp vụ chi tiết (vòng đời đơn, phân quyền, xóa mềm): `docs/nghiep-vu.md`.

## 3. Quy tắc viết tài liệu này

- Ghi theo code và API thực của backend (không bịa tính năng, không AI slop).
- Giao diện tối giản, hiện đại: ít màu, nhiều khoảng trống, mỗi màn hình 1 việc, font Inter.
- Bảng màu và typography xem chi tiết tại `mobile/design-system.md`.
