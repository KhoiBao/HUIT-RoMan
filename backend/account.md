# Tài khoản demo (đồ án nội bộ — login bằng email @huit.edu.vn)

Pass chung: `Huit@123`

> Login: field `CardCode` của API nhận cả email. UI chỉ nhập email + mật khẩu.

## Quản trị hệ thống (Admin) — 3 acc

- admin@huit.edu.vn / Admin@123 (seed cũ, giữ tương thích)
- admin02@huit.edu.vn / Huit@123 (ADMIN002)
- admin03@huit.edu.vn / Huit@123 (ADMIN003)

## Quản lý đơn vị (Manager) — Phân công nhân viên & Quản lý phòng đơn vị

- tv001@huit.edu.vn / Huit@123 (TV001 - Trưởng Đơn vị Thư viện, quản lý phân công thủ thư)
- qlp001@huit.edu.vn / Huit@123 (QLP001 - Trưởng Phòng Đào tạo, quản lý phân công nhân sự phòng)

## Nhân sự (Employee) — 4 acc

Nhân viên Thư viện:
- tv002@huit.edu.vn / Huit@123 (TV002 - Thủ thư)
- tv003@huit.edu.vn / Huit@123 (TV003 - Thủ thư)

Nhân viên Phòng Đào tạo:
- qlp002@huit.edu.vn / Huit@123 (QLP002 - Quản lý phòng)
- qlp003@huit.edu.vn / Huit@123 (QLP003 - Quản lý phòng)

## Người dùng (Student / Lecturer) — 8 acc

Sinh viên (Khoa CNTT):

- 200123456@huit.edu.vn / Huit@123
- 200123457@huit.edu.vn / Huit@123
- 200123458@huit.edu.vn / Huit@123
- 200123459@huit.edu.vn / Huit@123
- 200123460@huit.edu.vn / Huit@123

Giảng viên (Khoa CNTT):

- 10010001@huit.edu.vn / Huit@123
- 10010002@huit.edu.vn / Huit@123
- 10010003@huit.edu.vn / Huit@123

## Ghi chú

- Không có đăng ký tự do: tài khoản do seeder tạo sẵn (`ApplicationDbSeeder`).
- Role hiển thị 3 nhóm: quản trị / nhân sự / người dùng (backend giữ `Admin, Employee, Student, Lecturer` để không vỡ `Authorize`).
