# Tài khoản demo (đồ án nội bộ — login bằng email @huit.edu.vn)

Pass chung: `Huit@123`

> Login: field `CardCode` của API nhận cả email. UI chỉ nhập email + mật khẩu.

## Quản trị hệ thống (Admin) — 3 acc

- admin@huit.edu.vn / Admin@123 (seed cũ, giữ tương thích)
- admin02@huit.edu.vn / Huit@123 (ADMIN002)
- admin03@huit.edu.vn / Huit@123 (ADMIN003)

## Nhân sự (Employee) — 6 acc

Thủ thư (Thư viện):

- tv001@huit.edu.vn / Huit@123
- tv002@huit.edu.vn / Huit@123
- tv003@huit.edu.vn / Huit@123

Quản lý phòng (Phòng Đào tạo):

- qlp001@huit.edu.vn / Huit@123
- qlp002@huit.edu.vn / Huit@123
- qlp003@huit.edu.vn / Huit@123

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
