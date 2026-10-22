# Đăng nhập / Xác thực (F-001)

## Mục đích
Người dùng đăng nhập bằng email `@huit.edu.vn` để nhận JWT và truy cập các chức năng theo phân quyền.

## Người dùng
Tất cả 3 nhóm: Quản trị hệ thống (`Admin`), Nhân sự (`Employee`), Người dùng (`Student`, `Lecturer`).

## Luồng hoạt động

1. Màn hình chào (minimal): logo + 2 ô nhập (email, mật khẩu) + 1 nút "Đăng nhập".
2. Người dùng nhập email `@huit.edu.vn` + mật khẩu.
3. App gọi `POST /api/Auth/login` với body `{ "cardCode": "<email>", "password": "<mật khẩu>" }`.
4. Nhận `{ token, user: { id, cardCode, fullName, role } }`, lưu JWT vào secure storage.
5. Điều hướng màn hình chính theo `role` của người dùng.
6. Mọi request sau đó kèm header `Authorization: Bearer <token>`.
7. Token sống 7 ngày.

## API

| Method + đường dẫn | Chức năng | Quyền |
|---|---|---|
| `POST /api/Auth/login` | Đăng nhập bằng email, nhận JWT | Công khai |

## Lưu ý nghiệp vụ

- Không có đăng ký tự do, không có logout/refresh trong nhóm Must Have.
- Tài khoản demo: email `@huit.edu.vn`, mật khẩu chung `Huit@123`.
- Sai đăng nhập → `401`.
- Field API vẫn tên `CardCode` (tương thích ngược), UI chỉ hiển thị nhãn "Email".

## Giao diện — màn hình Đăng nhập (tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` (toàn màn hình) |
| Tiêu đề | Headline, Inter, trắng, căn giữa |
| Ô nhập email / mật khẩu | Nền trắng, chữ Neutral `#75777D`, viền mỏng Neutral, bo tròn nhẹ |
| Nút "Đăng nhập" | Nền Primary `#005A9E`, chữ trắng, Inter Body, toàn chiều màn hình |
| Lỗi đăng nhập | Chữ Tertiary `#8E4302`, nhỏ, dưới ô nhập |

- 1 màn hình làm 1 việc: chỉ có 2 ô nhập + 1 nút.
- Không gradient, không đổ bóng dư, không hình minh họa dán sẵn.
- Ngôn ngữ Tiếng Việt, ngắn gọn.
