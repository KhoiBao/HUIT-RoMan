# RoMan — Hệ thống quản lý đăng ký và khai thác phòng dùng chung (HUIT)

Đồ án nội bộ Trường Đại học Công Thương TP.HCM. 3 nhóm người dùng: **quản trị hệ thống**, **nhân sự** (thủ thư, quản lý phòng), **người dùng** (sinh viên, giảng viên). Chi tiết nghiệp vụ: `docs/nghiep-vu.md`.

## Chạy trong 4 bước (Windows)

```bat
setup.bat        :: 1 lần đầu: kiểm tra .NET 8 + Node, restore, npm install
update-db.bat    :: tạo bảng + seed tài khoản demo (cần PostgreSQL localhost:5432, DB LibraryDb)
run-backend.bat  :: API http://localhost:5056 (Swagger /swagger)
run-web.bat      :: Web http://localhost:5173
```

Đăng nhập bằng **email `@huit.edu.vn`** + mật khẩu. Không có đăng ký tự do — tài khoản demo (pass `Huit@123`): `backend/account.md`. Mẫu: `200123456@huit.edu.vn`.

## Repo map

```text
HUIT-RoMan/
  setup.bat / update-db.bat / run-backend.bat / run-web.bat
  backend/   # ASP.NET Core 8 API — setup: backend/backend_setup.markdown
             # kiến trúc: backend/backend_structure.markdown
             # đặc tả API: backend/api_documentation.md
  web/       # React + TS (Vite) — hướng dẫn: web/README.md
  docs/      # General_Info, project_scope, Developing_rules, nghiep-vu.md
```

## Quy tắc nhóm

- Làm trên nhánh `dev/<tên-bạn>` hoặc `feature/<tính-năng>`, xong mở Pull Request. Cấm push thẳng `main`.
- Backend: controller thin, rule ở Service, DB ở Infrastructure. Frontend: logic ở `src/lib/` kèm test.
- Đầy đủ: `docs/Developing_rules.markdown`.
