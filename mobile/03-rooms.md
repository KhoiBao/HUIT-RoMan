# Quản lý phòng (F-003)

## Mục đích
Xem danh sách phòng, chi tiết phòng, thiết bị, tình trạng và phòng trống.

## Người dùng

- Xem phòng: tất cả nhóm đã đăng nhập.
- Thêm / sửa / xóa mềm phòng: chỉ `Admin` và `Employee`.

## Màn hình chính

1. **Danh sách phòng**: tên phòng, loại phòng, đơn vị, tình trạng (`Trống` / `Bảo trì`).
2. **Chi tiết phòng**: mô tả, thiết bị kèm số lượng, tình trạng hiện tại.
3. **Phòng trống**: lọc xem phòng còn trống (`GET /api/Rooms/available`).
4. **Quản lý** (Admin / Employee): thêm/sửa/xóa mềm phòng, đổi trạng thái, gán/thu hồi thiết bị.

## API

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET /api/Rooms` | Xem danh sách phòng | Đăng nhập |
| `GET /api/Rooms/{id}` | Xem chi tiết phòng | Đăng nhập |
| `POST /api/Rooms` | Thêm phòng (thuộc 1 RoomType) | Admin, Employee |
| `PUT /api/Rooms/{id}` | Sửa phòng | Admin, Employee |
| `DELETE /api/Rooms/{id}` | Xóa mềm phòng | Admin, Employee |
| `GET /api/Rooms/available` | Xem phòng trống | Đăng nhập |
| `PATCH /api/Rooms/{id}/status` | Đổi trạng thái (`Trống` / `Bảo trì`) | Admin, Employee |
| `GET /api/Rooms/{id}/schedule` | Xem lịch 1 phòng | Đăng nhập |
| `GET /api/Rooms/{roomId}/equipments` | Xem thiết bị trong phòng | Đăng nhập |
| `POST /api/Rooms/{roomId}/equipments` | Gán thêm / thay đổi số lượng thiết bị | Admin, Employee |
| `DELETE /api/Rooms/{roomId}/equipments/{equipmentId}` | Thu hồi thiết bị khỏi phòng (xóa mềm) | Admin, Employee |
| `GET /api/RoomTypes` | Danh sách loại phòng | Đăng nhập |
| `GET /api/Departments` | Danh sách đơn vị | Đăng nhập |

## Giao diện — màn hình Quản lý phòng (tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` |
| Tiêu đề màn hình | Headline, Inter, trắng |
| Danh sách phòng | Mỗi phòng là 1 dòng trắng, chữ Neutral `#75777D`, divider mỏng Neutral giữa các dòng |
| Nhãn loại phòng / đơn vị | Label, Inter, Neutral `#75777D`, cỡ nhỏ |
| Trạng thái phòng | "Trống" màu Primary `#005A9E`; "Bảo trì" màu Tertiary `#8E4302`, nhỏ, bo nhẹ |
| Nút Thêm / Sửa | Nền Primary `#005A9E`, chữ trắng, toàn chiều hoặc góc dưới phải |

- Màn hình danh sách: chỉ hiển thị tên phòng, loại phòng, đơn vị, tình trạng.
- Màn hình chi tiết: thẻ trắng, thông số căn trái, nhiều khoảng trống.
- Không hình ảnh phòng dán sẵn, chỉ dùng icon đơn giản nếu cần.

## Lưu ý nghiệp vụ

- Phòng đang trạng thái `Bảo trì` không được đặt.
- Xóa chỉ xóa mềm (`IsDeleted = true`), bản ghi biến mất khỏi mọi API nhưng vẫn nằm trong DB.
- `DELETE` ở module này không xóa thật trừ khi dùng `Repository.HardRemove` và ghi lý do trong PR.
