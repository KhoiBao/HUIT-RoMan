# Đặt phòng (F-004)

## Mục đích
Người dùng tạo đơn đặt phòng, xem lịch phòng theo ngày và danh sách tiết học.

## Người dùng

- Tạo đơn / xem đơn của mình / hủy đơn của mình: tất cả nhóm đã đăng nhập.
- Xem lịch phòng theo ngày và danh sách tiết: công khai (không cần đăng nhập).

## Luồng hoạt động

1. Chọn phòng từ danh sách hoặc danh sách phòng trống.
2. Chọn hình thức đặt: **theo giờ** (`startTime` / `endTime`) hoặc **theo tiết** (`startPeriodId` / `endPeriodId`).
3. Xem lịch phòng theo ngày trước khi đặt (`GET /api/Bookings/rooms/{roomId}/schedule`).
4. Lấy danh sách tiết học (`GET /api/Bookings/periods`).
5. Gửi `POST /api/Bookings` → đơn tạo ra trạng thái `Chờ duyệt`.
6. Xem đơn của mình: `GET /api/Bookings/my`; chi tiết một đơn: `GET /api/Bookings/{id}`.
7. Hủy đơn của mình: `PATCH /api/Bookings/{id}/cancel` → đơn trạng thái `Đã hủy`.

## API công khai (không cần đăng nhập)

| Method + đường dẫn | Chức năng |
|---|---|
| `GET /api/Bookings/rooms/{roomId}/schedule?date=&startPeriodId=&endPeriodId=` (hoặc `startTime`/`endTime`) | Lịch phòng theo ngày |
| `GET /api/Bookings/periods` | Danh sách tiết học |

## API cần đăng nhập

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `POST /api/Bookings` | Tạo đơn (phòng `Bảo trì` bị từ chối) | Đăng nhập |
| `GET /api/Bookings/my` | Xem đơn của chính mình | Đăng nhập |
| `GET /api/Bookings/{id}` | Chi tiết đơn | Đăng nhập |
| `PATCH /api/Bookings/{id}/cancel` | Hủy đơn → `Đã hủy` | Đăng nhập |

## Giao diện — màn hình Đặt phòng (tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` |
| Tiêu đề màn hình | Headline, Inter, trắng |
| Chọn phòng | Danh sách trắng, mỗi phòng 1 dòng, chữ Neutral `#75777D` |
| Chọn giờ / tiết | 2 nút tương đối (theo giờ / theo tiết), nền trắng, chữ Primary `#005A9E`, viền mỏng Primary |
| Lịch phòng theo ngày | Lưới đơn giản, ô trắng, viền Neutral, ngày được chọn nền Primary chữ trắng |
| Nút Xác nhận đặt | Nền Primary `#005A9E`, chữ trắng, toàn chiều dưới màn hình |

- 1 màn hình 1 việc: chọn phòng → chọn giờ/tiết → xác nhận.
- Không gradient, không hình minh họa, không đổ bóng.
- Ngày đã có người đặt khác hiển thị màu Neutral nhạt, không cho chạm.

## Lưu ý nghiệp vụ

- Không đặt được phòng đang trạng thái `Bảo trì`.
- Đơn đã `Đã hủy` không duyệt/hủy tiếp.
- Chuẩn trả về: `{ success, message, data }`; sai nghiệp vụ → `400`.
