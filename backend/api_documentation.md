# HUIT-RoMan: Tài liệu Đặc tả API (API Documentation)

> [!NOTE]
> Đây là tài liệu liệt kê toàn bộ các API hiện có trong hệ thống, bao gồm Method, Route, Mục đích và Quyền hạn (Roles) cần thiết để truy cập. Tất cả API (ngoại trừ Auth và 2 API public ghi rõ bên dưới) đều yêu cầu đính kèm JWT Token trong header.
> Bảng map role backend ra 3 nhóm hiển thị: xem `docs/nghiep-vu.md`.
> Format trả về chuẩn: `{ success, message, data }` (`ApiResponse`).

---

## 0. Quy ước chung

- **Đăng nhập bằng email.** `POST /api/Auth/login` nhận body `{ cardCode, password }` — nhập **email `@huit.edu.vn`** vào field `cardCode` (backend tự tra cứu CardCode hoặc Email hoặc UserName).
- **Lỗi nghiệp vụ** trả `400` kèm `{ success: false, message }`. Sai đăng nhập trả `401`. Thiếu quyền trả `403`.
- Trạng thái đơn đặt phòng: `Chờ duyệt` → `Đã duyệt` / `Từ chối` / `Duyệt một phần` / `Đã hủy`. Vòng đời đầy đủ: `docs/nghiep-vu.md`.

---

## 1. Module Xác thực (Auth)
Quản lý đăng nhập và cấp phát Token.

### `POST /api/Auth/login`
- **Mô tả:** Đăng nhập để nhận JWT Token.
- **Quyền hạn:** Công khai (Tất cả mọi người).
- **Body:** `LoginRequest` (gồm `CardCode` và `Password`).
- **Kết quả trả về:** JWT Token và thông tin cơ bản của User.

---

## 2. Module Quản lý Đơn vị (Departments)
Quản lý danh sách các Khoa, Phòng ban trực thuộc Trường.

### `GET /api/Departments`
- **Mô tả:** Lấy danh sách tất cả các Đơn vị.
- **Quyền hạn:** Không yêu cầu Role đặc biệt, nhưng cần đăng nhập.

### `GET /api/Departments/{id}`
- **Mô tả:** Lấy chi tiết thông tin một Đơn vị theo ID.
- **Quyền hạn:** Cần đăng nhập.

### `POST /api/Departments`
- **Mô tả:** Thêm mới một Đơn vị.
- **Quyền hạn:** Chỉ **Admin**.
- **Body:** `CreateDepartmentDto`.

### `PUT /api/Departments/{id}`
- **Mô tả:** Cập nhật thông tin Đơn vị.
- **Quyền hạn:** Chỉ **Admin**.
- **Body:** `UpdateDepartmentDto`.

### `DELETE /api/Departments/{id}`
- **Mô tả:** Xóa một Đơn vị.
- **Quyền hạn:** Chỉ **Admin**.

---

## 3. Module Quản lý Loại phòng (RoomTypes)
Quản lý danh mục mô hình phòng (Phòng tự học, Phòng hội thảo...).

### `GET /api/RoomTypes`
- **Mô tả:** Xem danh sách các Loại phòng.
- **Quyền hạn:** Cần đăng nhập (Nhân viên chỉ thấy Loại phòng thuộc Đơn vị mình).

### `GET /api/RoomTypes/{id}`
- **Mô tả:** Xem chi tiết một Loại phòng.
- **Quyền hạn:** Cần đăng nhập.

### `POST /api/RoomTypes`
- **Mô tả:** Thêm mới Loại phòng.
- **Quyền hạn:** **Admin**, **Employee**.
- **Lưu ý:** Admin có thể truyền `DepartmentId` tự do. Employee sẽ bị ép `DepartmentId` mặc định của bản thân.

### `PUT /api/RoomTypes/{id}`
- **Mô tả:** Cập nhật Loại phòng.
- **Quyền hạn:** **Admin**, **Employee**.

### `DELETE /api/RoomTypes/{id}`
- **Mô tả:** Xóa Loại phòng.
- **Quyền hạn:** **Admin**, **Employee**.

---

## 4. Module Quản lý Phòng (Rooms)
Quản lý danh sách phòng vật lý cụ thể.

### `GET /api/Rooms`
- **Mô tả:** Lấy danh sách các phòng.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Rooms/{id}`
- **Mô tả:** Xem chi tiết một Phòng.
- **Quyền hạn:** Cần đăng nhập.

### `POST /api/Rooms`
- **Mô tả:** Thêm mới một Phòng (thuộc một RoomType cụ thể).
- **Quyền hạn:** **Admin**, **Employee**.

### `PUT /api/Rooms/{id}`
- **Mô tả:** Sửa thông tin Phòng.
- **Quyền hạn:** **Admin**, **Employee**.

### `DELETE /api/Rooms/{id}`
- **Mô tả:** Xóa Phòng.
- **Quyền hạn:** **Admin**, **Employee**.

---

## 5. Module Thiết bị & Kho (Equipments & Categories)
Quản lý danh sách, danh mục và thông tin các loại thiết bị trong hệ thống.

### `GET /api/EquipmentCategories`
- **Mô tả:** Lấy danh sách toàn bộ danh mục thiết bị.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/EquipmentCategories/{id}`
- **Mô tả:** Xem chi tiết danh mục thiết bị.
- **Quyền hạn:** Cần đăng nhập.

### `POST /api/EquipmentCategories`
- **Mô tả:** Thêm danh mục thiết bị mới.
- **Quyền hạn:** **Admin**, **Employee**.

### `PUT /api/EquipmentCategories/{id}`
- **Mô tả:** Sửa thông tin danh mục thiết bị.
- **Quyền hạn:** **Admin**, **Employee**.

### `DELETE /api/EquipmentCategories/{id}`
- **Mô tả:** Xóa danh mục thiết bị.
- **Quyền hạn:** **Admin**, **Employee**.

### `GET /api/Equipments`
- **Mô tả:** Lấy danh sách toàn bộ thiết bị.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Equipments/{id}`
- **Mô tả:** Xem chi tiết thiết bị.
- **Quyền hạn:** Cần đăng nhập.

### `POST /api/Equipments`
- **Mô tả:** Thêm thiết bị mới vào kho chung.
- **Quyền hạn:** **Admin**, **Employee**.

### `PUT /api/Equipments/{id}`
- **Mô tả:** Sửa thông tin thiết bị.
- **Quyền hạn:** **Admin**, **Employee**.

### `DELETE /api/Equipments/{id}`
- **Mô tả:** Xóa thiết bị khỏi kho chung.
- **Quyền hạn:** **Admin**, **Employee**.

---

## 6. Phân bổ Thiết bị vào Phòng (Room Equipments)
*(Lưu ý: API này được gộp chung vào đường dẫn của Controller Rooms)*

### `GET /api/Rooms/{roomId}/equipments`
- **Mô tả:** Lấy danh sách các thiết bị đang có trong phòng `{roomId}`.
- **Quyền hạn:** Cần đăng nhập.

### `POST /api/Rooms/{roomId}/equipments`
- **Mô tả:** Phân bổ thêm thiết bị từ kho vào phòng, hoặc điều chỉnh số lượng.
- **Quyền hạn:** **Admin**, **Employee**.
- **Body:** `AddRoomEquipmentDto` (gồm ID thiết bị và số lượng).

### `DELETE /api/Rooms/{roomId}/equipments/{equipmentId}`
- **Mô tả:** Thu hồi / Xóa hoàn toàn một thiết bị khỏi phòng.
- **Quyền hạn:** **Admin**, **Employee**.

---

## 7. Module Người dùng & Nhân sự (Employees & Users)

### `GET /api/Users/students`
- **Mô tả:** Lấy danh sách tất cả sinh viên.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Users/lecturers`
- **Mô tả:** Lấy danh sách tất cả giảng viên.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Employees`
- **Mô tả:** Lấy danh sách toàn bộ nhân sự (Employee).
- **Quyền hạn:** Cần đăng nhập.

### `POST /api/Employees`
- **Mô tả:** Khởi tạo thông tin Nhân viên mới từ một ID User có sẵn.
- **Quyền hạn:** Cần đăng nhập (Thường dành cho Admin tạo tài khoản nội bộ).

### `PUT /api/Employees/{id}`
- **Mô tả:** Sửa thông tin Nhân viên.
- **Quyền hạn:** Cần đăng nhập.

### `DELETE /api/Employees/{id}`
- **Mô tả:** Xóa Nhân viên.
- **Quyền hạn:** Cần đăng nhập.

---

## 8. Module Đặt phòng & Duyệt (Bookings)

### `POST /api/Bookings`
- **Mô tả:** Tạo đơn đặt phòng mới (trạng thái ban đầu `Chờ duyệt`). Phòng đang `Bảo trì` thì bị từ chối.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Bookings`
- **Mô tả:** Lấy tất cả đơn đặt phòng.
- **Quyền hạn:** **Admin**, **Employee** (nhân sự).

### `GET /api/Bookings/my`
- **Mô tả:** Lấy đơn đặt phòng của chính mình.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Bookings/{id}`
- **Mô tả:** Xem chi tiết một đơn.
- **Quyền hạn:** Cần đăng nhập.

### `PATCH /api/Bookings/{id}/approve`
- **Mô tả:** Duyệt hoặc từ chối cả đơn một lần (`{ "newStatus": "Đã duyệt" }` hoặc `"Từ chối"`).
- **Quyền hạn:** **Admin**, **Employee**.

### `PATCH /api/Bookings/details/{detailId}/approve`
- **Mô tả:** Duyệt hoặc từ chối từng phòng trong đơn. Đơn tự chuyển `Đã duyệt` / `Từ chối` / `Duyệt một phần` theo kết quả chi tiết.
- **Quyền hạn:** **Admin**, **Employee**.

### `PATCH /api/Bookings/{id}/cancel`
- **Mô tả:** Hủy đơn (chuyển `Đã hủy`).
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Bookings/rooms/{roomId}/schedule?date=YYYY-MM-DD[&startPeriodId=&endPeriodId=|&startTime=&endTime=]`
- **Mô tả:** Xem lịch phòng theo ngày. Phòng đặt theo tiết thì truyền `startPeriodId/endPeriodId`, phòng theo giờ thì truyền `startTime/endTime` (`"07:00:00"`).
- **Quyền hạn:** Công khai.

### `GET /api/Bookings/periods`
- **Mô tả:** Lấy danh sách tiết học.
- **Quyền hạn:** Công khai.

---

## 9. Module Người dùng mở rộng (Users)

Ngoài `GET /api/Users/students|lecturers` ở mục 7:

### `GET /api/Users`
- **Mô tả:** Lấy tất cả người dùng.
- **Quyền hạn:** Chỉ **Admin**.

### `GET /api/Users/{id}`
- **Mô tả:** Xem chi tiết người dùng.
- **Quyền hạn:** **Admin**, **Employee**.

### `PUT /api/Users/{id}`
- **Mô tả:** Cập nhật thông tin người dùng.
- **Quyền hạn:** **Admin**, **Employee**.

### `PATCH /api/Users/{id}/role`
- **Mô tả:** Đổi role (`Student | Lecturer | Employee | Admin`).
- **Quyền hạn:** Chỉ **Admin**.

### `PATCH /api/Users/{id}/status?status=Active|Inactive|Suspended`
- **Mô tả:** Khóa/mở tài khoản. `Inactive/Suspended` khóa đăng nhập ngay.
- **Quyền hạn:** Chỉ **Admin**.

---

## 10. API Rooms mở rộng

Ngoài CRUD ở mục 4:

### `GET /api/Rooms/available`
- **Mô tả:** Lấy phòng trống.
- **Quyền hạn:** Cần đăng nhập.

### `GET /api/Rooms/{id}/schedule`
- **Mô tả:** Xem lịch một phòng.
- **Quyền hạn:** Cần đăng nhập.

### `PATCH /api/Rooms/{id}/status`
- **Mô tả:** Đổi trạng thái phòng (ví dụ `Bảo trì` — phòng này không đặt được).
- **Quyền hạn:** **Admin**, **Employee**.
