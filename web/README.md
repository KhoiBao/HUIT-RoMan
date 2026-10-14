# RoMan Web — React + TypeScript + Vite

Giao diện hệ thống quản lý phòng dùng chung (HUIT). Nghiệp vụ và phân quyền: `docs/nghiep-vu.md`.

## Chạy

```bat
run-web.bat        :: Web http://localhost:5173 (tự npm install nếu thiếu)
```

Chạy tay:

```powershell
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # build production
npm test         # vitest
```

Bắt buộc chạy backend trước (`run-backend.bat`, API `http://localhost:5056`). Địa chỉ API đổi ở `.env.development` (`VITE_API_URL`).

## Đăng nhập

- Chỉ có **đăng nhập**, không có đăng ký. Form nhập **email `@huit.edu.vn`** + mật khẩu.
- Tài khoản demo (pass `Huit@123`): `backend/account.md`.
- Sau login, điều hướng theo role: `Admin` → `/admin`, `Employee` → `/staff`, còn lại → `/home`.

## Cấu trúc `src/`

```text
src/
  lib/
    api.ts    # axios instance + interceptor gắn JWT từ localStorage
    auth.ts   # validateLoginInput, buildLoginPayload, mapRoleToGroup, getHomePathForRole (+ auth.test.ts)
  auth/
    AuthContext.tsx  # login/logout, lưu token + user vào localStorage
  pages/
    LoginPage.tsx       # trang đăng nhập duy nhất
    PlaceholderHome.tsx # khung chờ nghiệp vụ từng nhóm
  App.tsx     # BrowserRouter + RequireAuth + routes
```

## Quy ước khi thêm trang mới (clean code)

1. Logic thuần (validate, map role, gọi API) viết trong `src/lib/`, kèm test trong `*.test.ts` — không viết logic trong component.
2. Component chỉ hiển thị + gọi hàm từ `lib`/`auth`. UI copy tiếng Việt, tên biến/hàm tiếng Anh.
3. Không hardcode URL API — dùng instance `api` từ `src/lib/api.ts`.
4. Route cần đăng nhập bọc trong `<RequireAuth>`. Không tự chế cơ chế auth mới.
5. Thêm route theo nhóm: trang quản trị vào `/admin`, nhân sự vào `/staff`, người dùng vào `/home`.
