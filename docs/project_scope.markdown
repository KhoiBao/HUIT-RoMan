# Project Scope

> Version: 0.2.0
> Status: Active (cập nhật theo code ngày 14/10/2026)

# 1. In Scope

## 1.1 Must Have

- [x] Authentication (login JWT bằng email — chưa có refresh/logout/register)
- [x] Authorization (role Admin/Employee/Student/Lecturer, map ra 3 nhóm ở `docs/nghiep-vu.md`)
- [x] User management
- [x] Room management
- [x] Equipment management
- [x] Room booking / CRUD method
- [x] Room availability
- [x] Booking approval (cả đơn + từng chi tiết)
- [ ] Room usage management (module `Usage` còn trống)
- [ ] Check-in / Check-out (chưa làm)
- [ ] Search (chưa có API tìm kiếm riêng)
- [ ] Reports / Statistics (proc có sẵn, chưa nối API)

---

## 1.2 Should Have

Later Prioritize

- [ ] Notifications
- [ ] Email notification
- [ ] Booking adjustment
- [ ] Booking extension
- [ ] Violation management
- [ ] Staff duty schedule

---

## 2.3 Could Have


- [ ] Chat
- [ ] Feedback
- [ ] Rating

---

# 3. Out of Scope (đồ án này không làm)

- Tự đăng ký tài khoản (tài khoản do seeder tạo sẵn)
- Mobile app (làm sau nếu còn thời gian)

---

# 4. Functional Scope

| ID | Feature | Priority | Status | Notes |
|---|---|---|---|---|
| F-001 | Authentication | Must | Partial | Login JWT bằng email; thiếu refresh/logout |
| F-002 | Authorization | Must | Done | 4 role backend, map 3 nhóm hiển thị |
| F-003 | Room Management | Must | Done | CRUD + equipments + status + available |
| F-004 | Booking | Must | Done | CRUD + schedule + periods |
| F-005 | Approval | Must | Done | Duyệt cả đơn + từng chi tiết |
| F-006 | Check-in/out | Must | Planned | Module `Usage` còn trống |
| F-007 | Notification | Should | Planned | Module `Communication` còn trống |
| F-008 | Reports | Must | Planned | Proc có sẵn, chưa nối API |
| F-009 | Chat | Could | Dropped | Ngoài phạm vi đồ án |
| F-010 | Feedback | Could | Planned | Entity có sẵn, chưa API |


# 6. Open Questions

- [ ] Có giữ rule soft-delete không? Hiện code hard-delete toàn bộ (`Repository.Remove`), `BaseEntity.IsDeleted` không entity nào dùng — team cần chốt 1 trong 2 rồi docs theo.
