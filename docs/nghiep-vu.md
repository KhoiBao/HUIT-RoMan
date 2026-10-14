# Nghiệp vụ hệ thống RoMan (nguồn sự thật)

> Mọi docs khác chỉ được link tới file này khi nhắc tới quyền, vai trò, vòng đời đơn. Không tự định nghĩa lại.

## 1. Ba nhóm người dùng

Hệ thống có 3 nhóm hiển thị. Backend (Identity) giữ 4 role kỹ thuật để không vỡ các `[Authorize]` hiện có:

| Nhóm hiển thị     | Role backend          | Gồm ai                                |
|---|---|---|
| Quản trị hệ thống | `Admin`               | Admin hệ thống                        |
| Nhân sự           | `Employee`            | Thủ thư (Thư viện), quản lý phòng (Phòng Đào tạo) |
| Người dùng        | `Student`, `Lecturer` | Sinh viên, giảng viên (Khoa CNTT)     |

Quy tắc nhớ: chỗ nào docs ghi "nhân sự" nghĩa là role `Employee`; "người dùng" nghĩa là `Student` hoặc `Lecturer`.

## 2. Vòng đời đơn đặt phòng

```
Người dùng tạo đơn (POST /api/Bookings) ──> "Chờ duyệt"
  ├─ Nhân sự/Quản trị duyệt từng phòng (PATCH /api/Bookings/details/{id}/approve)
  │    ├─ tất cả "Đã duyệt"      ──> đơn "Đã duyệt"
  │    ├─ tất cả "Từ chối"       ──> đơn "Từ chối"
  │    └─ còn lại                ──> đơn "Duyệt một phần"
  ├─ Duyệt/từ chối cả đơn một lần (PATCH /api/Bookings/{id}/approve)
  └─ Người dùng hủy đơn của mình (PATCH /api/Bookings/{id}/cancel) ──> "Đã hủy"
```

Lưu ý:

- Không đặt được phòng đang `"Bảo trì"` (`BookingService.cs:52`).
- Đơn đã `"Đã hủy"` không duyệt/hủy tiếp.
- Phòng đặt theo tiết (`IsBookingByPeriod=true`) dùng `startPeriodId/endPeriodId`; phòng đặt theo giờ dùng `startTime/endTime`. Danh sách tiết: `GET /api/Bookings/periods`. Lịch phòng theo ngày: `GET /api/Bookings/rooms/{roomId}/schedule` (không cần đăng nhập).
- Check-in/out (`UsageSession`) thuộc module `Usage`, chưa làm — xem mục 4.

## 3. Entities theo module

| Module | Entities | Trạng thái code |
|---|---|---|
| `Identity` | `User`, `Department`, `Employee`, `UserRestriction` | Xong CRUD + login JWT |
| `Room` | `Room`, `RoomType`, `RoomEquipment`, `Equipment`, `EquipmentCategory`, `EquipmentConditionLog`, `MaintenanceRecord`, `UsageCondition`, `RoomTypeCondition` | Xong CRUD + xem lịch + phòng trống |
| `Booking` | `Booking`, `BookingDetail` | Xong tạo/duyệt/hủy/lịch/tiết |
| `Usage` | `UsageSession`, `Period`, `Shift`, `ShiftLog` | Chưa có Service/Controller |
| `Violation` | `ViolationType`, `ViolationRecord`, `Feedback` | Chưa làm (Should/Could) |
| `Communication` | `Notification`, `ChatConversation`, `ChatMessage` | Chưa làm (Could) |
| `Reporting` | Dùng stored proc `GetBookingSummary` | Chưa nối vào API |

`ApprovalHistory` đã bỏ (migration `SyncDomainModelsFromBE` drop bảng), không dùng nữa.

## 4. Quy ước tài khoản demo

- Đăng nhập bằng **email `@huit.edu.vn`** + mật khẩu. Field API vẫn tên `CardCode` (tương thích ngược) — UI chỉ nhập email.
- Pass chung: `Huit@123`. Tài khoản do seeder (`ApplicationDbSeeder`) tạo sẵn khi backend chạy lần đầu.
- Không có đăng ký tự do. Khóa tài khoản: `PATCH /api/Users/{id}/status?status=Suspended` (chỉ Admin).
- Danh sách đầy đủ: `backend/account.md`.
