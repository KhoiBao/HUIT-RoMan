# Hồ sơ & phân quyền (F-002)

## Mục đích
Hiển thị thông tin cá nhân và giới hạn chức năng hiển thị theo nhóm người dùng.

## 3 nhóm người dùng

| Nhóm hiển thị | Role backend | Gồm ai | Được làm gì |
|---|---|---|---|
| Quản trị hệ thống | `Admin` | Admin hệ thống | Mọi thứ: quản lý user/role/status, đơn vị |
| Nhân sự | `Employee` | Thủ thư, quản lý phòng | CRUD phòng/thiết bị, duyệt đơn, xem user |
| Người dùng | `Student`, `Lecturer` | Sinh viên, giảng viên | Tạo đơn, xem đơn của mình, hủy đơn của mình |

## Luồng hoạt động

1. Sau đăng nhập, lấy `role` từ payload user trả về.
2. Màn hình hồ sơ hiển thị `fullName`, `cardCode` (email), `role`.
3. Điều hướng menu theo quyền:
   - `Admin` / `Employee`: thấy quản lý phòng, thiết bị, duyệt đơn, xem user.
   - `Student` / `Lecturer`: chỉ thấy đặt phòng, lịch phòng, đơn của mình.
4. Thao tác vượt quyền sẽ nhận `403` từ API.

## API

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET /api/Users/{id}` | Chi tiết user | Admin, Employee |
| `GET /api/Users/students` | Danh sách sinh viên | Admin, Employee |
| `GET /api/Users/lecturers` | Danh sách giảng viên | Admin, Employee |
| `PUT /api/Users/{id}` | Sửa user | Admin, Employee |
| `PATCH /api/Users/{id}/role` | Đổi role | Admin |
| `PATCH /api/Users/{id}/status?status=Active\|Inactive\|Suspended` | Khóa / mở tài khoản | Admin |
| `GET /api/Employees`, `POST`, `PUT/{id}`, `DELETE/{id}` | CRUD nhân sự (xóa mềm) | Đăng nhập / Admin |

## Giao diện — màn hình Hồ sơ & phân quyền (tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` |
| Tiêu đề màn hình | Headline, Inter, trắng |
| Thẻ thông tin (họ tên, email, role) | Nền trắng, chữ Neutral `#75777D`, viền m Neutral, khoảng trống rộng |
| Nhãn (Label) | Label, Inter, Neutral `#75777D`, cỡ nhỏ, in hoa nhẹ |
| Nút điều hướng chức năng | Nền trắng, chữ Primary `#005A9E`, viền mỏng Primary, bo tròn nhẹ |

- Menu hiển thị khác nhau theo `role`: Admin/Employee thấy quản lý; Student/Lecturer chỉ thấy đặt phòng và đơn của mình.
- Mỗi dòng menu 1 chức năng, nhiều khoảng trống giữa các dòng.
- Không bo tròn mạnh, không đổ bóng.

## Lưu ý nghiệp vụ

- Mọi API (trừ 2 API công khai) cần header `Authorization: Bearer <token>`.
- Thiếu quyền → `403`; không tìm thấy (kể cả bản ghi xóa mềm) → `404`.
- Xóa tài khoản chỉ xóa mềm, email vẫn chiếm unique index; muốn dùng lại email đó Admin xử lý trong DB.
