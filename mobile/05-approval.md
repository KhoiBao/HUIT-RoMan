# Duyệt đơn (F-005)

## Mục đích
Nhân sự và Quản trị duyệt / từ chối đơn đặt phòng, cả duyệt toàn bộ đơn lẫn duyệt từng chi tiết phòng.

## Người dùng
Chỉ `Admin` và `Employee`.

## Luồng hoạt động

1. Xem tất cả đơn đặt phòng: `GET /api/Bookings`.
2. Chọn một đơn, xem chi tiết: `GET /api/Bookings/{id}`.
3. **Duyệt/từ chối cả đơn một lần**: `PATCH /api/Bookings/{id}/approve` với body `{ "newStatus": "Đã duyệt" }` (hoặc `Từ chối`).
4. Hoặc **duyệt/từ chối từng phòng**: `PATCH /api/Bookings/details/{detailId}/approve` → đơn tự cập nhật trạng thái tổng thể.
5. Theo dõi trạng thái đơn: `Chờ duyệt` → `Đã duyệt` / `Từ chối` / `Duyệt một phần` / `Đã hủy`.

## API

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET /api/Bookings` | Xem tất cả đơn | Admin, Employee |
| `GET /api/Bookings/{id}` | Chi tiết đơn | Đăng nhập |
| `PATCH /api/Bookings/{id}/approve` | Duyệt/từ chối cả đơn `{ newStatus }` | Admin, Employee |
| `PATCH /api/Bookings/details/{detailId}/approve` | Duyệt/từ chối từng phòng | Admin, Employee |

## Giao diện — màn hình Duyệt đơn (tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` |
| Tiêu đề màn hình | Headline, Inter, trắng |
| Danh sách đơn chờ duyệt | Mỗi đơn 1 dòng trắng: mã đơn, tên phòng, ngày, trạng thái Neutral `#75777D` |
| Nút Duyệt / Từ chối | Nền trắng, chữ Primary `#005A9E` (Duyệt) / Tertiary `#8E4302` (Từ chối), viền mỏng màu tương ứng |
| Chi tiết đơn | Thẻ trắng, mỗi phòng là 1 hàng, trạng thái căn phải, nhiều khoảng trống |

- Chỉ hiển thị đơn trong trạng thái `Chờ duyệt` cần xử lý.
- Nút Duyệt / Từ chối đặt cạnh nhau, kích thước bằng nhau, bo nhẹ.
- Không bo tròn mạnh, không đổ bóng, không gradient.

## Lưu ý nghiệp vụ

- Tất cả chi tiết "Đã duyệt" → đơn "Đã duyệt".
- Tất cả chi tiết "Từ chối" → đơn "Từ chối".
- Còn lại (kết hợp duyệt/từ chối) → đơn "Duyệt một phần".
- Đơn trạng thái `Đã hủy` không được duyệt/hủy tiếp.
- Sai nghiệp vụ → `400`; thiếu quyền → `403`.
