# RoMan API — chức năng, đường dẫn, nghiệp vụ (1 file duy nhất)

> File tổng duy nhất cho team. Nghiệp vụ chi tiết (vòng đời đơn, xóa mềm): `nghiep-vu.md`.
> `backend/api_documentation.md` chỉ còn là lối tắt trỏ về đây.

- Base URL: `http://localhost:5056` — Swagger: `http://localhost:5056/swagger` — Health: `GET /api/health`
- Auth: login `POST /api/Auth/login` body `{ "cardCode": "<email @huit.edu.vn>", "password": "Huit@123" }` → `{ "token", "user": { id, cardCode, fullName, role } }`. Mọi API khác (trừ 2 API public có ghi chú) gắn header `Authorization: Bearer <token>`.
- Token sống 7 ngày. Không có đăng ký/logout/refresh.
- Chuẩn trả về: `{ "success": true/false, "message": "...", "data": ... }`. Sai nghiệp vụ → `400`, sai đăng nhập → `401`, thiếu quyền → `403`, không tìm thấy (kể cả bản ghi đã xóa mềm) → `404`.

## Quyền (role backend → nhóm hiển thị)

| Role | Nhóm | Được làm gì |
|---|---|---|
| `Admin` | Quản trị hệ thống | Mọi thứ, gồm quản lý user/role/status, đơn vị |
| `Employee` | Nhân sự | CRUD phòng/thiết bị, duyệt đơn, xem user |
| `Student`, `Lecturer` | Người dùng | Tạo đơn, xem đơn của mình, hủy đơn của mình |

## 1. Xác thực — `AuthController`

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `POST /api/Auth/login` | Đăng nhập bằng email, nhận JWT | Công khai |

## 2. Đơn vị — `DepartmentsController` (`/api/Departments`)

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET /api/Departments`, `GET /api/Departments/{id}` | Xem danh sách/chi tiết | Đăng nhập |
| `POST /api/Departments` | Thêm đơn vị `{ name, type }` | Admin |
| `PUT /api/Departments/{id}` | Sửa đơn vị | Admin |
| `DELETE /api/Departments/{id}` | Xóa mềm đơn vị (chặn nếu còn user/loại phòng thuộc đơn vị) | Admin |

## 3. Loại phòng — `RoomTypesController` (`/api/RoomTypes`)

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET`, `GET/{id}` | Xem | Đăng nhập (nhân sự chỉ thấy loại thuộc đơn vị mình) |
| `POST`, `PUT/{id}`, `DELETE/{id}` | Thêm/sửa/xóa mềm (Admin truyền `departmentId` tự do, nhân sự bị ép theo đơn vị mình) | Admin, Employee |

## 4. Phòng — `RoomsController` (`/api/Rooms`)

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET`, `GET/{id}` | Xem danh sách/chi tiết | Đăng nhập |
| `POST`, `PUT/{id}`, `DELETE/{id}` | Thêm/sửa/xóa mềm (thuộc 1 RoomType) | Admin, Employee |
| `GET /api/Rooms/available` | Phòng trống | Đăng nhập |
| `GET /api/Rooms/{id}/schedule` | Lịch 1 phòng | Đăng nhập |
| `PATCH /api/Rooms/{id}/status` | Đổi trạng thái (`Trống`/`Bảo trì` — phòng `Bảo trì` không đặt được) | Admin, Employee |
| `GET /api/Rooms/{roomId}/equipments` | Thiết bị trong phòng | Đăng nhập |
| `POST /api/Rooms/{roomId}/equipments` | Gán thêm/thay đổi số lượng `{ equipmentId, quantity }` | Admin, Employee |
| `DELETE /api/Rooms/{roomId}/equipments/{equipmentId}` | Thu hồi thiết bị khỏi phòng (xóa mềm) | Admin, Employee |

## 5. Thiết bị — `EquipmentCategoriesController` + `EquipmentsController`

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET /api/EquipmentCategories`, `GET/{id}` | Xem danh mục | Đăng nhập |
| `POST`, `PUT/{id}`, `DELETE/{id}` (cả 2 controller) | Thêm/sửa/xóa mềm danh mục và thiết bị kho chung | Admin, Employee |

## 6. Đặt phòng + duyệt — `BookingsController` (`/api/Bookings`)

Vòng đời: `Chờ duyệt` → `Đã duyệt` / `Từ chối` / `Duyệt một phần` / `Đã hủy` (chi tiết ở `nghiep-vu.md` mục 2).

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `POST /api/Bookings` | Tạo đơn (phòng `Bảo trì` bị từ chối) | Đăng nhập |
| `GET /api/Bookings` | Tất cả đơn | Admin, Employee |
| `GET /api/Bookings/my` | Đơn của chính mình | Đăng nhập |
| `GET /api/Bookings/{id}` | Chi tiết đơn | Đăng nhập |
| `PATCH /api/Bookings/{id}/approve` | Duyệt/từ chối cả đơn `{ "newStatus": "Đã duyệt" }` | Admin, Employee |
| `PATCH /api/Bookings/details/{detailId}/approve` | Duyệt/từ chối từng phòng (đơn tự lật trạng thái) | Admin, Employee |
| `PATCH /api/Bookings/{id}/cancel` | Hủy đơn → `Đã hủy` | Đăng nhập |
| `GET /api/Bookings/rooms/{roomId}/schedule?date=&startPeriodId=&endPeriodId=` (hoặc `startTime/endTime`) | Lịch phòng theo ngày | Công khai |
| `GET /api/Bookings/periods` | Danh sách tiết học | Công khai |

## 7. Người dùng + nhân sự — `UsersController` + `EmployeesController`

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET /api/Users` | Tất cả user | Admin |
| `GET /api/Users/{id}` | Chi tiết user | Admin, Employee |
| `GET /api/Users/students`, `GET /api/Users/lecturers` | Danh sách SV/GV | Admin, Employee |
| `PUT /api/Users/{id}` | Sửa user | Admin, Employee |
| `PATCH /api/Users/{id}/role` | Đổi role | Admin |
| `PATCH /api/Users/{id}/status?status=Active\|Inactive\|Suspended` | Khóa/mở (khóa chặn login ngay) | Admin |
| `GET /api/Employees`, `POST`, `PUT/{id}`, `DELETE/{id}` | CRUD nhân sự (xóa = xóa mềm) | Đăng nhập / Admin |

## 8. Quản lý sử dụng phòng & Trả phòng — `UsageSessionsController` (`/api/UsageSessions`)

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `GET /api/UsageSessions?status=&roomId=&date=&search=` | Lấy danh sách phiên sử dụng phòng | Admin, Employee |
| `GET /api/UsageSessions/active` | Danh sách phòng đang sử dụng thời gian thực | Admin, Employee |
| `GET /api/UsageSessions/summary` | Thống kê nhanh tình hình sử dụng phòng hôm nay | Admin, Employee |
| `GET /api/UsageSessions/my` | Xem lịch sử/phiên sử dụng phòng của chính mình | Đăng nhập |
| `GET /api/UsageSessions/{id}` | Chi tiết phiên sử dụng theo ID | Đăng nhập |
| `GET /api/UsageSessions/code/{code}` | Tra cứu thông tin phiên theo Mã xác nhận nhận phòng | Đăng nhập |
| `POST /api/UsageSessions/check-in` | Check-in nhận phòng (chuyển trạng thái sang "Đang sử dụng") | Admin, Employee |
| `POST /api/UsageSessions/check-out` | Xác nhận trả phòng & Khảo sát thiết bị (hoàn tất phiên, đổi trạng thái phòng về "Trống" hoặc "Bảo trì") | Admin, Employee |
| `PATCH /api/UsageSessions/{id}/no-show` | Hủy ca do quá giờ không nhận phòng (No-show >15p) | Admin, Employee |

## Ghi chú xóa mềm

`DELETE` ở mọi module chỉ set `IsDeleted = true` — bản ghi biến mất khỏi mọi API nhưng vẫn nằm trong DB. Muốn dùng lại email đã xóa thì Admin xử lý trong DB.
