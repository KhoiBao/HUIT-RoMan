# BÁO CÁO TIẾN ĐỘ DỰ ÁN — HỆ THỐNG QUẢN LÝ PHÒNG HỌP THƯ VIỆN HUIT

**Hệ thống quản lý phòng họp thư viện HUIT — Trường Đại học Công Thương TP.HCM**

- **Mã đề tài:** CNTT-KLCN236
- **Ngày review:** 08/11/2026 (cập nhật từ bản 28/10/2026)
- **Nhánh hiện tại:** `dev/Khoi` — HEAD `324608a` (07/11/2026); working tree còn các thay đổi 08/11 chưa commit (miễn phòng hội thảo khỏi giờ thư viện, trang Quy định, đổi tên hệ thống)
- **Phạm vi review:** backend ASP.NET Core, web React, mobile Flutter, database PostgreSQL, Docker, CI và tài liệu
- **Rubric đối chiếu:** `rubric_ch_m_i_m.md` (STT 6, CLO3–CLO4)

> Báo cáo được cập nhật từ việc đối chiếu trực tiếp mã nguồn ngày 08/11/2026 và rà từng dòng rubric chấm mới, không dựa trên báo cáo cũ. Các số liệu build/test/Docker bên dưới được chạy lại trong ngày 08/11/2026.

---

## 1. TÓM TẮT ĐIỀU HÀNH

| Nội dung | Kết quả |
|---|---|
| **Tiến độ tổng thể** | **~97%** phần mềm (CLO3–CLO4); còn quyển báo cáo + slide (CLO5) |
| Nhóm nghiệp vụ đã hoàn thành | 15 nhóm chính: xác thực (đổi mật khẩu + OTP an toàn), người dùng, phòng/thiết bị/báo cố, đặt phòng (idempotency + R-codes + quota sinh viên), duyệt nhiều cấp + điều chỉnh khi duyệt, lịch phòng, sử dụng/trả phòng, gia hạn có giới hạn, vi phạm + cấm mượn, ca trực, báo cáo (có tỷ lệ phòng trống theo khung giờ), feedback/đánh giá, Notification Center & chat realtime, **mobile Flutter đầy đủ** |
| Nhóm còn thiếu hoặc dở dang | Tự khóa tài khoản khi sai mật khẩu liên tiếp (hiện chỉ chặn khi đăng nhập); phân quyền anonymous trên file đính kèm biên bản vi phạm; E2E/kiểm thử tải |
| **Backend** | **19 controller, 163 endpoint**, **21 migration**, 9 function/procedure; 2 background service (no-show + nhắc lịch); **196 test pass** (26 file xUnit + SQLite) |
| Web | 7 route (thêm `/quy-dinh`), 13 tab quản trị + trang Quy định; 16 file test / **136 test pass** |
| Mobile Flutter | Ứng dụng đầy đủ: **~19 màn hình, 4 tab**, ánh xạ toàn bộ API; 23 file test / **68 test pass** |
| Hạ tầng | Docker Compose 3 service (`db`, `api`, `web`), 3 container healthy; CI GitHub Actions 2 job |
| Build hiện tại (08/11) | Backend `dotnet test` **196/196**; Web `tsc` sạch, vitest **136/136**, build pass; Mobile `flutter test` **68/68** |
| Rủi ro còn lại | Không tự khóa tài khoản khi sai mật khẩu liên tiếp; anonymous đọc file đính kèm biên bản vi phạm; JWT secret/CORS vẫn rộng cho môi trường demo |

**Điểm nổi bật**

- Luồng nghiệp vụ chính đã chạy end-to-end: đăng nhập → đặt phòng → duyệt → nhận phòng → trả phòng → xử lý vi phạm → báo cáo.
- Có JWT + phân quyền 4 role, soft-delete, chống trùng lịch ở tầng ứng dụng và exclusion constraint trong PostgreSQL.
- **Quy định nhận phòng mới:** chỉ được check-in trong cửa sổ `[T − 15 phút, T)`; quá T mà chưa check-in thì background service tự động hủy đơn, ghi lý do `NO_SHOW`, nguồn `AUTO`, giải phóng phòng và tạo bản ghi thông báo.
- **Ma trận quyền đặt phòng theo vai trò** được enforce ở backend: sinh viên chỉ đặt phòng học nhóm/thuyết trình; giảng viên đặt được thêm phòng lý thuyết, thực hành, hội thảo/hội trường.
- **Danh mục phòng mới:** 99 phòng seed theo mô hình HUIT (11 phòng thực hành A101–A111 + 88 phòng lý thuyết A201–A511/B201–B511); hai loại phòng lý thuyết/thực hành có bộ 16 tiết riêng.
- **UI đặt phòng dạng bảng** có lọc ngày/trạng thái/tìm kiếm, nút Nhận phòng/Chi tiết/Hủy và luồng hủy 2 bước có lý do.
- **Trang lịch phòng** hỗ trợ chế độ Ngày/Tuần/Tháng, timeline 07:00–20:00 (tự mở rộng nếu có lịch sớm/muộn), KPI, bộ lọc và bảng chi tiết.
- **Báo cáo** bổ sung thống kê hủy theo nguồn (sinh viên / no-show / nhân sự / không rõ) và theo lý do.
- **Đổi mật khẩu self-service + quên mật khẩu OTP an toàn:** OTP CSPRNG lưu SHA-256 hash, hạn 10 phút, tối đa 5 lần thử, không trả OTP trong response; chặn đăng nhập khi tài khoản khóa/đình chỉ.
- **Duyệt nhiều cấp cho phòng đặc biệt:** `RoomType.RequiresSecondApproval`, trạng thái "Chờ duyệt cấp 2", điều chỉnh phòng/thời gian ngay khi duyệt, email + thông báo theo từng cấp, ApprovalHistory ghi Level.
- **Nghiệp vụ đặt phòng tự động hóa:** R-codes từ chối R01–R13, trùng lịch → từ chối kèm email gợi ý phòng/khung khác, quota sinh viên 2 lượt/tuần, gia hạn tối đa 60 phút cho mỗi đơn, idempotency key chống tạo trùng đơn.
- **Báo cáo tỷ lệ phòng trống theo từng thời điểm** (endpoint `vacancy` + sub-tab riêng trên Web, xuất CSV).
- **Mobile Flutter đầy đủ** cho sinh viên/giảng viên: tra cứu, đặt, gia hạn, check-in, lịch sử sử dụng/vi phạm, thông báo, chat, đánh giá, đổi mật khẩu.
- **Phòng hội thảo/hội trường được miễn khung giờ thư viện** (không bị chặn Chủ Nhật/giờ phục vụ 07:00–20:00); phòng thư viện giữ nguyên quy định.
- **Trang Quy định `/quy-dinh`** (Hướng dẫn sử dụng + Nội quy + quy định thư viện) thay cho section "Quy trình 4 bước"; hệ thống đổi tên "Hệ thống quản lý phòng họp thư viện HUIT".
- **Kiểm thử 3 nền tảng pass (08/11):** backend 196/196, web 136/136, mobile 68/68.

**Việc còn thiếu để nghiệm thu**

1. Tự khóa tài khoản: tăng `AccessFailedCount`/set `LockoutEnd` khi sai mật khẩu liên tiếp (hiện chỉ kiểm tra khi đăng nhập).
2. Phân quyền file đính kèm biên bản vi phạm (hiện anonymous truy cập được).
3. E2E + kiểm thử tải; đưa `dotnet test`/lint vào CI (web test đã có trong CI).
4. Dọn warning nullable backend + lint web; tách file UI lớn.
5. Quyển báo cáo + slide thuyết trình (CLO5) — phần còn lại của đề tài.

---

## 2. BẢNG TIẾN ĐỘ TỔNG HỢP

| Hạng mục | Trạng thái | % | Căn cứ / ghi chú |
|---|---|---|---|
| Xác thực & phân quyền | Hoàn thành | **95%** | Đổi mật khẩu + OTP an toàn (hash, hạn 10 phút, max 5 lần), chặn lockout/đình chỉ khi đăng nhập; thiếu cơ chế tự set `LockoutEnd` |
| Quản lý người dùng & danh mục | Hoàn thành | **100%** | Users, Employees, Departments; CRUD, tìm kiếm, đổi role/trạng thái |
| Quản lý phòng, loại phòng, thiết bị | Hoàn thành | **100%** | CRUD phòng/loại phòng/thiết bị + phân bổ theo phòng; phòng hội thảo miễn giờ thư viện (08/11) |
| Theo dõi thiết bị & báo cố | Hoàn thành | **100%** | IncidentReports 10 endpoint + AdminIncidentsTab; phòng "Bảo trì" khi trả phòng có bất thường |
| Đặt phòng & duyệt đơn | Hoàn thành | **100%** | Idempotency, R-codes R01–R13, quota sinh viên, **duyệt nhiều cấp + điều chỉnh phòng/thời gian khi duyệt** |
| Lịch phòng & phòng trống | Hoàn thành | **100%** | Ngày/Tuần/Tháng; API lịch theo khoảng ngày; timeline, KPI |
| Quản lý sử dụng, check-in/out | Hoàn thành | **100%** | Cửa sổ [T−15m, T); no-show tự động; checklist trả phòng; gia hạn ≤ 60 phút cho mỗi đơn |
| Xử lý vi phạm & cấm mượn | Hoàn thành | **100%** | Biên bản + thông báo/email, lệnh cấm, eligibility, quota 2 lượt/tuần sinh viên |
| Ca trực & nhật ký trực | Hoàn thành | **100%** | CRUD ca, phân nhiều nhân sự, nhật ký bàn giao, thống kê |
| Tìm kiếm hợp nhất | Hoàn thành | **100%** | API search phòng/người/phiếu/biên bản + Ctrl+K |
| Báo cáo & thống kê | Hoàn thành | **100%** | 4 API + **vacancy theo khung giờ** + CSV; breakdown hủy |
| Chat realtime | Hoàn thành | **100%** | SignalR + REST; Nginx proxy `/hubs`; Redis đã bỏ (in-memory) |
| Thông báo, email, nhắc lịch | Hoàn thành | **100%** | Notification Center, email SMTP kết quả duyệt/vi phạm, nhắc lịch 30'/15' chạy nền |
| Feedback & đánh giá | Hoàn thành | **100%** | Feedback API + modal sao trên Web + sheet trên Mobile |
| Giao diện Web React | Hoàn thiện | **100%** | 7 route, 13 tab quản trị + trang Quy định; đổi mật khẩu qua UserProfileModal |
| Mobile Flutter | Hoàn thành chức năng | **90%** | ~19 màn hình, 4 tab, đủ luồng đặt/phòng/viễn/đánh giá; 68 test pass; chưa chạy thiết bị thật/E2E |
| Kiểm thử | Tốt | **85%** | Backend 196, web 136, mobile 68 — pass; chưa E2E/tải |
| Docker & CI | Hoàn thiện | **90%** | 3 container healthy; CI chưa chạy `dotnet test`/lint |
| Tài liệu | Cập nhật 08/11 | **85%** | tienDo.md đối chiếu rubric mới; README tốt |
| Bảo mật & hardening | Cần bổ sung nhỏ | **75%** | OTP fix, lockout check, role guards (SecurityGuardsTests 13 test); còn auto-lockout, attachment anon, CORS/secret |

---

## 3. KIẾN TRÚC & CÔNG NGHỆ

### 3.1. Backend

- **.NET 8 Web API**, tổ chức Clean Architecture 4 project:
  - `Domain`: 34 file entity/hằng số nghiệp vụ (mới so với 26 cũ: IncidentReport, SessionReminder, UserRestriction, ViolationAttachment, BookingExtension, ApprovalHistory, Feedback, Notification…).
  - `Application`: service + DTO, nghiệp vụ theo module.
  - `Infrastructure`: EF Core, repository, migration, seeder, stored procedure.
  - `API`: controller mỏng, JWT, Swagger, SignalR hub, background service.
- **Project test riêng:** `backend/tests/HUIT-RoMan.Tests` dùng xUnit + SQLite in-memory.
- **PostgreSQL 16** qua Npgsql EF Core 8; **21 migration** đã áp trên DB Docker hiện tại (gần nhất: `AddBookingIdempotencyKey` 07/11; `AddPasswordOtpFields`, `AddMultiLevelApproval`, `RemoveUnusedIdentityColumns` 08/11).
- **19 controller, 163 endpoint**; Identity cho user/role; JWT Bearer; Swagger có nút Authorize.
- **SignalR** cho chat realtime; có code Redis backplane tùy chọn.
- **Soft-delete** bằng global query filter cho entity kế thừa `ISoftDelete`.
- **Background service (2):** `BookingNoShowWatcher` (tự hủy đơn quá giờ chưa check-in) và `BookingReminderWatcher` (nhắc trước 30 phút khi bắt đầu phiên, 15 phút khi kết thúc) — chạy nền định kỳ, idempotent.
- **Policy nghiệp vụ tách riêng:** `StudentBookingPolicy`, `BookingRoomPermissionPolicy`, `BookingCheckInPolicy`, `BookingCancelPolicy`.
- **Múi giờ:** DB lưu UTC; client gửi UTC; service chuyển sang giờ Việt Nam (UTC+7) khi xác định ngày/khoảng tiết rồi đổi lại UTC trước khi lưu.
- **Stored procedure/function (9):** kiểm tra trùng lịch, lịch phòng, phòng trống, duyệt đơn, cập nhật trạng thái phòng, tổng hợp báo cáo, ghi vi phạm + cấm mượn, kiểm tra eligibility, xử lý trả phòng. Code hiện chỉ gọi 2 function/procedure (`fn_get_available_rooms`, `sp_process_room_checkout`); 7 phần còn lại là SQL định nghĩa sẵn nhưng chưa dùng.

### 3.2. Frontend

- **React 19 + TypeScript 6 + Vite 8**.
- **React Router 7**, Axios, `@microsoft/signalr`.
- **Vitest** cho logic thuần trong `web/src/lib/`.
- Cấu trúc: `pages/`, `components/`, `components/admin/`, `lib/`, `auth/`.
- 7 route: `/login`, `/home`, `/quy-dinh`, `/dat-phong`, `/lich-phong`, `/staff`, `/admin`; 13 tab quản trị; đổi mật khẩu qua `UserProfileModal` mở từ header; trang Quy định thay "Quy trình 4 bước" trên trang chủ.
- Logic validate/tính toán đặt phòng, lịch, báo cáo, chat nằm trong `lib/` và có test.
- Các màn hình lớn: `BookingPage.tsx` (3.026 dòng), `AdminDashboardPage.tsx` (2.223 dòng), `SchedulePage.tsx` (1.724 dòng).

### 3.3. Hạ tầng

```text
Trình duyệt
    │
    ▼
web (Nginx :80) ──/api/*──▶ api (.NET 8 :8080) ──▶ db (PostgreSQL :5432)
    │                                      │
    └── React SPA                          └── tự migration + seed + no-show watcher
```

- `docker-compose.yml`: `db` (postgres:16-alpine), `api` (.NET 8), `web` (Nginx 1.27).
- API tự chạy migration và seed khi `Database__AutoMigrate=true`.
- `web/nginx.conf` hiện chỉ proxy `/api/` và `/swagger`; `/hubs/` chưa được proxy (xem mục 5.11).
- CI GitHub Actions: build backend + validate EF model; npm ci/test/build frontend (chưa chạy `dotnet test`, lint, E2E).

---

## 4. HIỆN TRẠNG MÃ NGUỒN TẠI THỜI ĐIỂM REVIEW

### 4.1. Trạng thái repository

- HEAD: `cdd07f8` — “rework: fix Room History and Room Order for both Students and Teachers” (28/10/2026 16:48 +07:00).
- Nhánh `dev/Khoi` **sạch**, đồng bộ với `origin/dev/Khoi`; không còn file sửa/untracked.
- Commit gần nhất thay đổi **32 file**, **+8.000 / −1.603 dòng**, gồm 3 nhóm chính:
  1. **Backend:** ma trận quyền đặt phòng theo vai trò; `Period.RoomTypeId`; kiểm tra tiết thuộc đúng loại phòng; API `GET /api/Bookings/schedules?from&to`; API `GET /api/Rooms/paged`; sửa quy đổi múi giờ; bỏ `[AllowAnonymous]` khỏi API lịch phòng.
  2. **Dữ liệu & migration:** migration `20261027163838_AddPeriodRoomType`; `RoomCatalogSeed`; seed 99 phòng + 2 bộ 16 tiết; unique index `IX_Rooms_RoomCode` (lọc `IsDeleted = false`).
  3. **Frontend:** đặt phòng dạng bảng + hủy 2 bước; lịch Ngày/Tuần/Tháng; card loại phòng theo trạng thái thực; 5 ảnh phòng mới; CSS/theme.
- Các phần check-in, hủy đơn, no-show, báo cáo hủy và test backend đã nằm trong commit trước `f19646f` (27/10/2026).

### 4.2. Kết quả kiểm chứng

| Lệnh / hạng mục | Kết quả |
|---|---|
| `dotnet build backend/HUIT-RoMan.sln --no-incremental` | **Build succeeded — 0 error, 296 warning** nullable (CS8618, CS8601, CS8625, …). Không có warning nào chặn build. |
| `dotnet test backend/tests/HUIT-RoMan.Tests` | **57/57 pass**, 0 failed, 5 file test |
| `cd web && npm test -- --run` | **7 file / 87 test pass** |
| `cd web && npm run build` | **Pass**; bundle `868.94 kB` (gzip `220.85 kB`), Vite cảnh báo chunk > 500 kB |
| `cd web && npm run lint` | **0 error, 58 warning** hooks/React |
| `docker compose up -d --build` | 3 container chạy; `db` và `api` healthy; web phục vụ HTTP 200 |
| Migration trên volume hiện tại | `__EFMigrationsHistory` có **8 migration**, gồm `20261027163838_AddPeriodRoomType`; cột `Periods.RoomTypeId` và unique index `IX_Rooms_RoomCode` tồn tại |
| Dữ liệu danh mục phòng | **105 phòng / 105 mã phòng unique**, 7 loại phòng; **16 tiết lý thuyết + 16 tiết thực hành** |
| API smoke test | `/api/health` OK; đăng nhập giảng viên OK; `periods?roomTypeId=1` trả 16 tiết (06:30–07:20…), `roomTypeId=2` trả 16 tiết (07:00–07:50…); `Rooms/paged` trả tổng 105; `Bookings/schedules` trả 200 |
| Kiểm tra ma trận quyền qua API thật | Sinh viên đặt phòng lý thuyết A201 bị chặn đúng thông báo: “Sinh viên chỉ được đặt phòng học nhóm và phòng thuyết trình của Thư viện.” |

### 4.3. Ghi nhận từ lần kiểm chứng này

- **Ảnh hero cũ đã được sửa:** `HomeHero.tsx` dùng 4 ảnh có sẵn; `RoomTypesSection.tsx` dùng 6 ảnh loại phòng; thư mục `web/public/images/` có 12 ảnh. Không còn lỗi ảnh trắng như báo cáo 24/10.
- **Số liệu “0 warning” của báo cáo cũ không còn đúng:** build tăng dần (incremental) có thể không biên dịch lại nên hiện 0 warning; build sạch cho **296 warning nullable**. Đây là nợ kỹ thuật có thật, cần dọn dần.
- **Migration mới áp thành công trên dữ liệu cũ:** không có lỗi unique index, dù volume đã có dữ liệu seed từ trước.
- **Không còn thay đổi chưa commit:** khối WIP lớn trước đây đã được commit và push trong `cdd07f8`.

### 4.4. Kiểm chứng bổ sung ngày 08/11/2026

| Lệnh / hạng mục | Kết quả |
|---|---|
| `dotnet test tests/HUIT-RoMan.Tests` | **196/196 pass**, 0 failed, 26 file test |
| `npx tsc --noEmit && npx vitest run && npm run build` (web) | tsc sạch; **136/136 test** (16 file); build pass |
| `flutter test` (mobile_app) | **68/68 pass** (23 file: 17 unit + 6 widget) |
| `docker compose ps` + curl | db/api/web healthy; `/home`, `/quy-dinh`, `/swagger` HTTP 200 |
| API nghiệp vụ trên container thật | HT01 (phòng hội thảo) Chủ Nhật đặt được → "Chờ duyệt"; TV01 (phòng thư viện) Chủ Nhật bị chặn `R11_NGOAI_GIO_THU_VIEN` |
| Migrations trên volume | 21 migration, gồm `AddPasswordOtpFields`, `AddMultiLevelApproval`, `RemoveUnusedIdentityColumns` (08/11) |
| Rubric STT 6 (CLO3) | 16/16 dòng chức năng có mã nguồn + UI; chi tiết tại mục 6 |

---

## 5. CHI TIẾT TỪNG PHÂN HỆ

### 5.1. Xác thực & phân quyền

**Đã có**

- Đăng nhập bằng email/MSSV/mã cán bộ (`POST /api/Auth/login`), cấp JWT 7 ngày.
- 4 role kỹ thuật: `Admin`, `Employee`, `Student`, `Lecturer`; UI gom thành 3 nhóm.
- Quản lý trạng thái tài khoản: Hoạt động / Không hoạt động / Đình chỉ.
- Quên mật khẩu + đặt lại mật khẩu qua OTP.
- Frontend: `LoginPage`, `ForgotPasswordModal`, `AuthContext`, `RequireAuth`, `RequireStaff`.

**Đã sửa (07–08/11/2026)**

- `ResetPasswordAsync` giờ **bắt buộc OTP**: OTP CSPRNG 6 số, lưu SHA-256 hash, hạn 10 phút, tối đa 5 lần thử, KHÔNG trả OTP trong response (chỉ gửi email mask).
- `LoginAsync` kiểm tra `Status` + `LockoutEnd`: tài khoản khóa/đình chỉ không đăng nhập được (test trong `SecurityGuardsTests`).
- Bổ sung đổi mật khẩu self-service: `POST /api/Auth/change-password` (AuthController.cs:80-100) + modal `UserProfileModal` (Web) + `ChangePasswordPage` (Mobile).

**Còn lại**

- Chưa có cơ chế tự tăng `AccessFailedCount`/set `LockoutEnd` khi sai mật khẩu liên tiếp (kiểm tra có, tự khóa chưa có).
- Chưa có refresh token, thu hồi token, đăng xuất phía server.
- JWT secret đang dùng giá trị mặc định trong `appsettings.json`/compose.
- CORS đang cho phép **mọi origin** kèm credentials (`SetIsOriginAllowed(_ => true)` + `AllowCredentials()`), phục vụ LAN/tunnel nhưng quá rộng cho production.

### 5.2. Quản lý người dùng & danh mục

**Đã có**

- CRUD người dùng, sinh viên, giảng viên, nhân viên, khoa/đơn vị.
- Tìm kiếm theo tên, mã, email, role, trạng thái, đơn vị.
- Đổi role, khóa/mở khóa tài khoản.
- UI: `AdminUsersTab`, `AdminEmployeesTab`, `AdminDepartmentsTab`.

**Ghi chú**

- Nghiệp vụ khóa tài khoản ghi `LockoutEnd`; login đã kiểm tra và chặn (xem 5.1). Còn thiếu: tự set `LockoutEnd` khi sai mật khẩu liên tiếp.

### 5.3. Phòng, loại phòng & thiết bị

**Đã có**

- CRUD loại phòng, phòng, kho thiết bị, danh mục thiết bị.
- Phân bổ/thu hồi thiết bị theo phòng; theo dõi tổng số, sẵn sàng, đã phân bổ.
- Cập nhật trạng thái phòng: Trống / Đang sử dụng / Bảo trì.
- API phòng trống theo ngày, tiết hoặc khung giờ.

**Danh mục phòng mới (từ `cdd07f8`)**

- `RoomCatalogSeed` tập trung toàn bộ mã phòng/giờ tiết:
  - **11 phòng thực hành** A101–A111, sức chứa 40.
  - **88 phòng lý thuyết** A201–A511 và B201–B511, sức chứa 60.
  - 99 phòng seed mới; cộng với 6 phòng thư viện/sự kiện có sẵn thành **105 phòng** trên DB hiện tại.
- 7 loại phòng trên DB: Lý thuyết (88), Thực hành (11), Học nhóm (4), Thuyết trình (1), Hội thảo (1), Hội trường (0), Phòng họp (0).
- **Hai bộ tiết riêng:** lý thuyết 16 tiết (06:30–21:30), thực hành 16 tiết (07:00–21:20); mỗi bộ gắn với `RoomTypeId`.
- Migration `AddPeriodRoomType` thêm `Periods.RoomTypeId` (nullable) + FK; seeder “nhận” các tiết cũ chưa gắn loại phòng về bộ lý thuyết để không mất dữ liệu lịch sử.
- Unique index `IX_Rooms_RoomCode` có filter `IsDeleted = false`; đã kiểm tra 105/105 mã phòng không trùng.
- **API `GET /api/Rooms/paged`:** phân trang (mặc định 10, tối đa 100) + lọc `keyword`, `roomType`, `building`, `floor`, `status`, `minCapacity`, `date`; nhân sự bị giới hạn theo đơn vị, sinh viên chỉ thấy loại phòng được phép đặt.
- UI: `AdminRoomsManagementTab`, `AdminRoomTypesTab`, `AdminEquipmentsManagementTab`, `AdminEquipmentsModal`; `RoomTypesSection` hiển thị trạng thái thực (trống/đang dùng/đã đặt/bảo trì) và ảnh theo loại phòng.

**Hạn chế**

- `GetPagedAsync` đang load toàn bộ phòng rồi lọc/phân trang trong bộ nhớ; với 105 phòng thì ổn, nhưng chưa phải phân trang ở tầng DB.
- Chưa có ràng buộc DB đảm bảo mỗi bộ tiết là duy nhất theo `(RoomTypeId, Name/StartTime)`; hiện dựa vào seeder.
- Ma trận quyền nhận diện loại phòng bằng chuỗi tiếng Việt (`Contains("nhóm")`, `Contains("lý thuyết")`…), dễ lệch nếu đổi tên loại phòng.

### 5.4. Đặt phòng

**Đã có**

- Tạo đơn một hoặc nhiều phòng; hỗ trợ đặt theo tiết HUIT và theo khung giờ.
- Kiểm tra phòng tồn tại, phòng bảo trì, trùng lịch; chặn nếu người dùng đang bị cấm mượn.
- **Ma trận quyền theo vai trò** (backend `BookingRoomPermissionPolicy`):
  - Sinh viên: chỉ phòng học nhóm và phòng thuyết trình của Thư viện.
  - Giảng viên: thư viện, lý thuyết, thực hành, hội thảo/hội trường.
  - Admin/Employee: giữ quyền hiện có.
- Quy định sinh viên được enforce ở **cả backend và frontend**: 07:00–20:00, tối đa 2 giờ/lượt, không Chủ nhật, không đặt thời gian đã qua, trong cùng một ngày.
- **Kiểm tra tiết theo loại phòng:** tiết bắt đầu/kết thúc phải thuộc đúng `RoomTypeId` của phòng; không được trộn bộ tiết lý thuyết với thực hành.
- **Quy đổi múi giờ:** client gửi UTC; service đổi sang UTC+7 để xác định ngày/khoảng tiết rồi lưu UTC, tránh lệch 7 giờ so với các API khác.
- **Hủy đơn trực tuyến:**
  - Chỉ đơn đã duyệt, chưa check-in và `now <= T − 3 giờ`.
  - Lý do bắt buộc: `CHANGE_PLAN`, `NO_LONGER_NEEDED`, `OTHER` (OTHER phải nhập chi tiết).
  - Admin/Employee hủy được không cần lý do, nguồn hủy `STAFF`.
  - Lưu `CancelReason`, `CancelReasonDetail`, `CancelSource` trên booking.
- **UI “Lịch sử đơn & Nhận phòng”**:
  - Bộ lọc ngày: Tất cả / Hôm nay / 7 ngày qua / Tháng này / khoảng ngày tùy chọn `dd/mm/yyyy`.
  - Tab trạng thái kèm số lượng: Tất cả, Đã duyệt, Đang sử dụng, Chờ duyệt, Hoàn thành, Đã hủy.
  - Tìm kiếm theo hoạt động, phòng, mã nhận phòng.
  - Bảng gồm: Đơn/Hoạt động, Tên phòng, Khung giờ, Mã nhận phòng, Trạng thái, Thao tác.
  - Thao tác theo dòng: Nhận phòng (chỉ khi đủ điều kiện), Chi tiết, Hủy (chỉ khi đã duyệt và chưa check-in).
  - Hủy 2 bước: chọn lý do → xác nhận → gọi API → tải lại danh sách.
- Ràng buộc chống trùng lịch ở DB bằng exclusion constraint.
- Test: 14 test check-in, 14 test hủy, 18 test vai trò/tiết.

**Hạn chế**

- Đã bổ sung kiểm tra quyền/role guards cho GET đơn + phiên kèm `SecurityGuardsTests` (08/11).

### 5.5. Duyệt đơn

**Đã có**

- Duyệt/từ chối cả đơn hoặc từng chi tiết phòng.
- **Duyệt nhiều cấp cho phòng đặc biệt (mới 08/11):** `RoomType.RequiresSecondApproval` — đơn mới tạo ở "Chờ duyệt" (cấp 1), duyệt cấp 1 xong chuyển "Chờ duyệt cấp 2", cấp 2 duyệt mới hoàn tất. Email + Notification có nội dung khác nhau theo cấp; ApprovalHistory ghi Level.
- **Điều chỉnh khi duyệt (mới 08/11):** chấp nhận `NewRoomId` (đổi phòng) và `NewStartAt`/`NewEndAt` (đổi thời gian) khi duyệt từng chi tiết; UI `AdminBookingApprovalTab` cho chọn phòng thay thế + sửa giờ.
- **R-codes từ chối R01–R13** (`BookingReasonCodes`); trùng lịch → tạo đơn "Từ chối" kèm email gợi ý phòng/khung giờ khác.
- Tự tính lại trạng thái đơn: Đã duyệt / Duyệt một phần / Từ chối.
- UI: `AdminBookingApprovalTab` (kèm bulk duyệt nhiều đơn).

### 5.6. Lịch phòng

**Đã có**

- **Chế độ xem Ngày / Tuần / Tháng** trên `SchedulePage` (1.724 dòng), lưu `?view=day|week|month` trên URL.
- **API mới `GET /api/Bookings/schedules?from&to`**: trả lịch của tất cả phòng trong khoảng ngày, nhận ngày theo giờ Việt Nam.
- **API `GET /api/Rooms/paged`** cấp danh mục phòng có phân trang cho chế độ Ngày/Tuần; chế độ Tháng dùng toàn bộ danh mục đã lọc.
- Bộ lọc: từ khóa, loại phòng, tòa, tầng, trạng thái (còn trống / đang sử dụng / bảo trì).
- Timeline matrix 07:00–20:00, tự mở rộng nếu có lịch sớm/muộn; cột giờ, đường thời gian hiện tại, badge trạng thái, thống kê ngày, KPI.
- Gợi ý khung giờ trống, bảng chi tiết khi bấm vào segment, điều hướng ngày/tuần/tháng.
- `GET /api/Bookings/rooms/{roomId}/schedule` **không còn `[AllowAnonymous]`** — bắt buộc đăng nhập.
- `GET /api/Bookings/periods?roomTypeId=` trả đúng bộ 16 tiết theo loại phòng.
- UI: `SchedulePage`, helper `web/src/lib/schedule.ts` (timeline, KPI, month grid, grouping, gợi ý slot).

**Hạn chế**

- Lịch tháng dùng toàn bộ danh mục phòng và tính thống kê theo từng ngày; khi dữ liệu lớn cần theo dõi hiệu năng.

### 5.7. Quản lý sử dụng, check-in/check-out

**Đã có**

- Tự đồng bộ `UsageSession` cho các booking detail đã duyệt.
- Check-in bằng session ID, mã xác nhận hoặc booking detail ID.
- **Cửa sổ check-in `[T − 15 phút, T)`**:
  - Trước `T − 15 phút`: chưa mở.
  - Trong `[T − 15 phút, T)`: được nhận phòng.
  - Từ `T` trở đi: hết hạn; không có thời gian gia hạn.
- Check-in theo đơn (tất cả phòng) hoặc theo từng chi tiết; kiểm tra quyền: Admin toàn quyền, Employee theo đơn vị, người dùng chỉ check-in đơn của mình.
- **Tự động hủy no-show:**
  - `BookingNoShowWatcher` chạy nền mỗi 30 giây, chạy ngay một lượt khi khởi động.
  - Chỉ xử lý đơn `Đã duyệt` / `Duyệt một phần`, chưa check-in và đã qua T.
  - Claim nguyên tử bằng UPDATE có điều kiện → không hủy lặp, không gửi trùng thông báo khi nhiều instance.
  - Chuyển đơn + chi tiết sang `Đã hủy`, lý do `NO_SHOW`, nguồn `AUTO`; hủy phiên chờ; giải phóng khung giờ; tạo bản ghi `Notification`.
- Trả phòng kèm checklist thiết bị/vệ sinh, cập nhật trạng thái phòng và đơn.
- UI: `AdminUsageSessionsTab`, tab “Lịch sử đơn & Nhận phòng” trong `BookingPage`; modal check-in/check-out.
- Test: 14 test check-in, 8 test no-show.
- Đã smoke test end-to-end trên PostgreSQL ngày 27/10: tạo đơn → quá giờ → watcher tự hủy → trạng thái `Đã hủy`, lý do `NO_SHOW`, nguồn `AUTO`, chi tiết bị hủy, bản ghi thông báo được thêm.

**Hạn chế**

- Một số GET (ví dụ danh sách session, summary) gọi `SyncApprovedBookingDetailsAsync()` và tạo dữ liệu — hành vi ghi trong GET, không thân thiện với cache/retry.
- Đã bổ sung kiểm tra quyền/role guards cho `GET /api/UsageSessions/{id}` (08/11).
- Thông báo no-show đã hiển thị qua Notification Center (API + chuông thông báo trên Web).

### 5.8. Vi phạm & cấm mượn phòng

**Đã có**

- CRUD loại vi phạm; lập/sửa/xóa biên bản; mức độ nghiêm trọng; chế tài.
- Tự tạo lệnh cấm mượn theo số ngày (0/3/14 ngày), có thể gỡ cấm sớm kèm lý do.
- Kiểm tra eligibility trước khi đặt phòng.
- Thống kê vi phạm, tìm kiếm hợp nhất toàn hệ thống (`Ctrl + K`).
- UI: `AdminViolationsTab`, `AdminGlobalSearchModal`.

### 5.9. Ca trực & nhật ký trực

**Đã có**

- CRUD ca trực, phân nhiều nhân sự, trạng thái ca, ca của tôi, thống kê.
- Nhật ký bàn giao ca, sự cố, kiểm tra an ninh/vệ sinh.
- UI: `AdminShiftsTab` với lịch tuần, bảng chi tiết, modal phân ca và nhật ký.

### 5.10. Báo cáo & thống kê

**Đã có**

- `GET /api/Reports/overview`, `/bookings`, `/room-usage`, `/violations`, `/export`.
- Xuất CSV UTF-8 có BOM, mở tốt bằng Excel (bookings/room-usage/violations/vacancy).
- **Tỷ lệ phòng trống theo từng thời điểm (mới 08/11):** `GET /api/Reports/vacancy` → `GetVacancyReportAsync` (ReportService.cs:762-823) trả HourSlots, AvgVacancyRooms, VacancyRate; UI sub-tab "vacancy" trong AdminReportsTab (bảng + highlight khung giờ trống cao/thấp).
- UI: 4 KPI, lọc 7/30/90 ngày, quý, năm, tùy chọn; biểu đồ và bảng xếp hạng.
- **Breakdown hủy đơn mới:**
  - `CancelledByStudent`, `CancelledByNoShow`, `CancelledByStaff`, `CancelledUnknownSource`.
  - `CancellationReasonStats` theo lý do; đơn cũ không suy đoán lý do.
  - UI hiển thị breakdown trong `AdminReportsTab`.
- Test: 3 test báo cáo hủy (`ReportCancellationTests`).

**Hạn chế**

- Phần lớn báo cáo tổng hợp in-memory sau khi load dữ liệu; với dữ liệu lớn sẽ chậm và tốn RAM.
- Chưa có phân trang cho các danh sách lớn.

### 5.11. Chat realtime

**Đã có**

- `ChatHub` (`/hubs/chat`) xác thực JWT qua query `access_token`.
- Quản lý hội thoại, tin nhắn, trạng thái đọc, typing, đóng hội thoại.
- Xác định nhân viên đang trực theo ca để hiển thị cho người dùng.
- UI người dùng: `LiveChatWidget`; UI nhân sự: `AdminChatTab`.

**Đã xử lý (30/10/2026)**

- Đã bỏ Redis: xoá gói SignalR backplane + section cấu hình; chat chạy in-memory (một instance API).
- `web/nginx.conf` đã proxy `/hubs/` (kèm `Upgrade`/`Connection`) — chat realtime hoạt động qua Docker.

### 5.12. Các phần bổ sung sau review 28/10 (trạng thái đến 08/11)

| Phần | Hiện trạng |
|---|---|
| Email thông báo kết quả duyệt | Đã hoàn thành: `IEmailService`, `EmailService` (SMTP), mẫu HTML chuyên nghiệp, tự động gửi khi duyệt/từ chối/hủy |
| Notification Center | Đã hoàn thành: `NotificationsController` + UI chuông thông báo & popover trên Web React |
| Nhắc lịch sắp đến/sắp kết thúc | Đã hoàn thành: `BookingReminderService` + `BookingReminderWatcher` quét nền định kỳ |
| Feedback/đánh giá sau sử dụng | Đã hoàn thành: `FeedbacksController` + `FeedbackService` + `FeedbackModal.tsx` trên Web React |
| Lịch sử duyệt | Đã hoàn thành: `ApprovalHistory` audit trail ghi nhận tự động + `ApprovalHistoryModal.tsx` trên Web React |
| Bảo trì/báo cố thiết bị | Đã hoàn thành qua `IncidentReports` (10 endpoint + AdminIncidentsTab, migration `AddIncidentReports` + `AddIncidentReportDetails`); `MaintenanceRecord`/`EquipmentConditionLog` còn ở mức entity, chưa có API |
| Mobile Flutter | Đã hoàn thành: `mobile_app/` (Flutter, `roman_mobile` 1.0.0+1), ~19 màn hình, 4 tab, ánh xạ toàn bộ API; 23 file test / 68 test |
| Duyệt nhiều cấp + điều chỉnh khi duyệt | Đã hoàn thành (08/11): migration `AddMultiLevelApproval` + service 2 cấp + UI điều chỉnh phòng/thời gian |
| Báo cáo tỷ lệ phòng trống theo thời điểm | Đã hoàn thành (08/11): endpoint `vacancy` + sub-tab UI + CSV |
| Đổi mật khẩu self-service + OTP an toàn | Đã hoàn thành (07–08/11): endpoint change-password, OTP hash/hạn/max 5 lần, migration `AddPasswordOtpFields` |
| Trang Quy định + đổi tên hệ thống | Đã hoàn thành (08/11): route `/quy-dinh`, đổi tên "Hệ thống quản lý phòng họp thư viện HUIT" trên web + email + SenderName |

---

## 6. ĐỐI CHIẾU RUBRIC CHẤM MỚI (`rubric_ch_m_i_m.md` — STT 6, CLO3/CLO4)

| Dòng rubric | Nội dung | Trạng thái | Bằng chứng chính |
|---|---|---|---|
| CLO3 – 0.5 | Đăng nhập, đăng xuất, đổi mật khẩu, phân quyền người dùng | **Đạt** | `POST /api/Auth/login`, `POST /api/Auth/change-password` (AuthController.cs:80-100); OTP an toàn (AuthService.cs:142-216); 50+ `[Authorize(Roles=...)]`; UI LoginPage / UserProfileModal (Web) / ChangePasswordPage (Mobile) |
| CLO3 – 0.25 | Quản lý danh mục thiết bị, quản lý thiết bị theo từng phòng | **Đạt** | EquipmentsController (6 endpoint) + EquipmentCategoriesController; gán/thu hồi thiết bị theo phòng (RoomsController.cs:106-123, RoomEquipmentService); AdminEquipmentsManagementTab + AdminEquipmentsModal |
| CLO3 – 0.25 | Theo dõi sử dụng thiết bị – tình trạng thiết bị – ghi nhận hư hỏng sửa chữa | **Đạt** | IncidentReportsController.cs:23-107 (10 endpoint) + AdminIncidentsTab; trả phòng có bất thường → phòng "Bảo trì" (UsageService.cs:537-565); `MaintenanceRecord` chỉ còn entity |
| CLO3 – 0.25 | Quản lý trạng thái phòng (trống/đang sử dụng/bảo trì), đăng ký sử dụng, kiểm tra phòng trống, kiểm tra trùng lịch | **Đạt** | PATCH `{id}/status` (RoomsController.cs:139-144) + `GET available` (:157); R01_TRUNG_LICH (BookingService.cs:281-286); exclusion constraint `EX_BookingDetails_Room_NoOverlap` |
| CLO3 – 0.25 | Duyệt/từ chối yêu cầu, quy trình duyệt nhiều cấp → điều chỉnh phòng/thời gian → email + thông báo di động | **Đạt** | `RoomType.RequiresSecondApproval` (RoomType.cs:29); 2 cấp (BookingService.cs:607-758); NewRoomId/NewStartAt/NewEndAt (BookingService.cs:660-682, BookingDTOs.cs:144-145); email theo cấp (BookingService.cs:1976-2071); UI AdminBookingApprovalTab.cs:549-623; Mobile nhận Notification |
| CLO3 – 0.25 | Gửi thông báo nhắc nhở khi người sử dụng vi phạm nội quy sử dụng phòng | **Đạt** | Lập biên bản → Notification + email (ViolationService.cs:519-551) |
| CLO3 – 0.25 | Nhắc lịch sắp đến / sắp kết thúc | **Đạt** | BookingReminderService.cs:46-178 (trước 30 phút bắt đầu, 15 phút kết thúc) + BookingReminderWatcher chạy nền |
| CLO3 – gộp | Xác nhận nhận phòng / trả phòng (ghi nhận bất thường) + gia hạn thời gian sử dụng | **Đạt** | Check-in [T−15m, T) (BookingCheckInPolicy.cs:16-52); checklist trả phòng DevicesOk/Cleaned/LightsOff/StaffNote (UsageService.cs:533-548); gia hạn ≤ 60 phút cho mỗi đơn (UsageService.cs:659-672, BookingQuotaPolicy.cs:16) |
| CLO3 – 0.25 | Quản lý xử lý vi phạm (khoá quyền đăng ký với cá nhân vi phạm nhiều lần) | **Đạt** | UserRestriction theo RestrictDays (ViolationService.cs:487-506); chặn đặt khi bị cấm R04 (BookingService.cs:91); quota sinh viên 2 lượt/tuần R02 (BookingService.cs:217) |
| CLO3 – 0.25 | Quản lý lịch trực của nhân viên – ghi nhận nhật ký trực | **Đạt** | ShiftsController.cs:57-123 (CRUD, phân ca, nhật ký); AdminShiftsTab |
| CLO3 – 0.25 | Tìm kiếm: phòng, người mượn, phiếu mượn phòng, biên bản vi phạm | **Đạt** | RoomsController.cs:53, UsersController.cs:66, BookingsController.cs:55, ViolationsController.cs:220 `global-search`; Ctrl+K (AdminDashboardPage.tsx:210) |
| CLO3 – 0.25 | Báo cáo, thống kê: tần suất phòng được sử dụng, tỷ lệ phòng trống theo từng thời điểm | **Đạt** | `GET /api/Reports/room-usage` (ReportService.cs:441); `GET /api/Reports/vacancy` (ReportService.cs:762-823); CSV (ReportService.cs:701-734); AdminReportsTab sub-tab vacancy |
| CLO3 – 0.25 | Mobile kế thừa Web: tra cứu phòng trống, đăng ký – gia hạn, theo dõi trạng thái, lịch sử đăng ký/sử dụng/vi phạm | **Đạt** | mobile_app/lib/features: rooms_page, room_detail_page, booking_create_page, extend_session_sheet, bookings_page, booking_detail_page, usage_history_page, violation_history_page |
| CLO3 – 0.25 | Mobile: nhận thông báo về tình hình sử dụng phòng | **Đạt** | notifications_page.dart + notifications_api.dart (unread-count, read, read-all) |
| CLO3 – 0.25 | Mobile: chat với nhân viên trực | **Đạt** | chat_page.dart + chat_api.dart (`/api/Chat/*`); Web: LiveChatWidget + AdminChatTab |
| CLO3 – 0.25 | Mobile: gửi phản hồi đánh giá về phòng/thiết bị/chất lượng phục vụ | **Đạt** | feedback_sheet.dart + feedback_api.dart; Web: FeedbackModal |
| CLO4 – 0.75 | Kiểm thử và triển khai hệ thống | **Đạt một phần** | Backend 196/196, Web 136/136, Mobile 68/68 pass (08/11); Docker Compose 3 container healthy; còn thiếu E2E, kiểm thử tải, CI chưa chạy `dotnet test` |
| STT 7–8 (CLO5.1) | Nội dung kiến thức + hình thức, định dạng quyển báo cáo | **Chưa làm** | Thuộc phần thuyết trình, ngoài phạm vi mã nguồn |
| STT 9–10 (CLO5.2/CLO6) | Thái độ tác phong; phong cách báo cáo, slide | **Chưa làm** | Thuộc phần thuyết trình |

**Tổng hợp:** 16/16 dòng chức năng CLO3 đã có mã nguồn + UI trên cả Web và Mobile; CLO4 đạt phần lớn (test 3 nền tảng pass, Docker triển khai được). Còn 2 điểm nhỏ backend (tự khóa tài khoản, phân quyền attachment vi phạm) và phần CLO5 (báo cáo + slide).

---

## 7. KIỂM THỬ & CHẤT LƯỢNG MÃ NGUỒN

### 7.1. Đã kiểm chứng

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| Unit/integration test backend (08/11) | **196/196 pass (100%)** | xUnit + SQLite in-memory; 26 file test (7.2); tổng [Fact]/[Theory] = 194, runtime 196 do Theory nhân theo InlineData |
| Unit test frontend (08/11) | **136/136 pass (100%)** | 16 file test; `tsc --noEmit` sạch; build Vite pass |
| Unit/widget test mobile (08/11) | **68/68 pass (100%)** | 23 file: 17 unit + 6 widget (Flutter 3.47.9) |
| Lint frontend | Pass (28/10) | 58 warning hooks/React, 0 error — chưa chạy lại ngày 08/11 |
| Docker Compose (08/11) | OK | 3 container healthy; `/home`, `/quy-dinh`, `/swagger` HTTP 200 |
| Migration PostgreSQL (08/11) | OK | 21 migration; gần nhất `AddPasswordOtpFields`, `AddMultiLevelApproval`, `RemoveUnusedIdentityColumns` |
| API smoke test (08/11) | OK | Đặt phòng hội thảo Chủ Nhật thành công ("Chờ duyệt"); phòng thư viện Chủ Nhật bị chặn `R11_NGOAI_GIO_THU_VIEN`; login chặn tài khoản khóa/đình chỉ |

### 7.2. Phạm vi test hiện có

**Backend — 196 test runtime / 26 file (nhóm chủ đề):**

- **Chính sách đặt phòng:** `BookingRoleAndPeriodTests` (18), `BookingCancelTests` (15), `BookingCheckInTests` (14), `BookingNoShowTests` (8), `StudentBookingAdvanceTests` (2), `StudentRoomVisibilityTests` (4), `LibraryHoursScopeTests` (4), `LibraryWorkingHoursTests` (7).
- **Duyệt & lịch sử duyệt:** `BookingApprovalAuditTests` (13), `MultiLevelApprovalTests` (9), `BookingApprovalEmailTests` (7), `FeedbackAndApprovalHistoryTests` (8).
- **Nghiệp vụ mới 07/11:** `BookingReasonCodeTests` (5), `BookingConflictRejectionTests` (4), `BookingQuotaPolicyTests` (5), `BookingQuotaTests` (6), `BookingExtensionCapTests` (4), `BookingIdempotencyTests` (5).
- **Báo cáo, hệ thống & khác:** `VacancyReportServiceTests` (4), `ReportCancellationTests` (3), `NotificationAndReminderTests` (6), `ViolationServiceTests` (4), `ShiftStatusCompletionTests` (12), `SecurityGuardsTests` (13), `AuthServicePasswordTests` (7), `UserServiceCreateTests` (7).

**Frontend — 136 test / 16 file:**

- `booking` (39), `schedule` (33), `shifts` (10), `incidents` (7), `usage` (6), `rooms` / `reminders` / `penalties` / `bookingBulkAndCancel` (5 × 4), `notifications` / `home` / `dateTimeFormat` / `auth` / `AuthContext` (4 × 5), `reports` / `feedback` (2 × 2).
- Bao phủ validate đặt phòng, quy tắc sinh viên/giảng viên, timeline, month grid, KPI, ca trực, báo cố, nhắc lịch, hình phạt, bulk duyệt/hủy, định dạng ngày/báo cáo.

**Mobile — 68 test / 23 file (17 unit + 6 widget):**

- Unit: api_client (5), booking_create_controller (5), booking_rules (4), booking_mapper (4), date_time_x (4), usage_feedback_mapper (4), chat_mapper (3), error_mapper (3), notification_mapper (3), session_reminders (3), timeline_layout (3), violation_record (3), validators (2), user_role (2), usage_extend (2), session_time_rules (2), room_mapper (2).
- Widget: violation_history_page (3), usage_history_page (3), change_password_page (3), profile_page (2), login_page (2), status_badge (1).

**Chưa có:**

- Integration test API + PostgreSQL thật (test backend đang dùng SQLite in-memory).
- E2E (Playwright/Cypress) cho luồng đầy đủ.
- Kiểm thử tải/độ ổn định.
- CI chưa chạy `dotnet test` và lint (test bảo mật/phân quyền đã có: `SecurityGuardsTests`).

### 7.3. Nợ kỹ thuật về chất lượng

- **296 warning nullable** trên build sạch; nên bật/tắt có kiểm soát hoặc sửa dần theo module.
- File UI lớn: `BookingPage.tsx` 3.026 dòng, `AdminDashboardPage.tsx` 2.223 dòng, `AdminViolationsTab.tsx` 1.892 dòng, `SchedulePage.tsx` 1.724 dòng, `AdminShiftsTab.tsx` 1.295 dòng. Nên tách component/hook.
- Bundle chính 868.94 kB; chưa code-splitting theo route/tab.
- Còn 58 warning lint hooks/React.
- `RoomService.GetPagedAsync` và phần lớn `ReportService` load toàn bộ dữ liệu rồi lọc/tổng hợp trong bộ nhớ.
- Ma trận quyền phòng khớp theo chuỗi tiếng Việt; nên chuyển sang mã/cờ cấu hình trên `RoomType`.
- Module rỗng: `Application/Modules/Communication`, `Application/Modules/Reporting`; trang `PlaceholderHome.tsx` không còn dùng.
- Entity chưa được khai thác: `Feedback`, `Notification`, `MaintenanceRecord`, `ApprovalHistory`, `RoomTypeCondition`.
- Tài liệu/script cũ: `setup.bat` (đã cập nhật); `run-redis.bat`, `stop-redis.bat` (đã xoá).

---

## 8. HẠ TẦNG & VẬN HÀNH

### 8.1. Docker Compose

| Service | Image / build | Cổng host | Ghi chú |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5433` → `5432` | Volume `postgres_data`, healthcheck |
| `api` | `backend/Dockerfile` | `5056` → `8080` | Tự migration + seed, healthcheck `/api/health`, chạy no-show watcher |
| `web` | `web/Dockerfile` (Nginx) | `5173` → `80` | Proxy `/api`, `/swagger`, `/hubs` (WebSocket); SPA fallback |

- Chạy: `docker compose up --build -d`
- Dừng: `docker compose down`
- Reset dữ liệu: `docker compose down -v`
- Trạng thái kiểm tra 28/10: `huit-roman-db` healthy, `huit-roman-api` healthy, `huit-roman-web` chạy và trả HTTP 200.

### 8.2. Migration & dữ liệu

- **21 migration** trong `backend/src/Infrastructure/Migrations/` (tính đến 08/11/2026), gồm: `Initial`, `SyncDomainModelsFromBE`, `AddEquipmentCode`, `AddSoftDelete`, `AddEquipmentQuantities`, `AddBookingOverlapConstraint`, `AddBookingCheckInAndCancelReason`, `AddPeriodRoomType`, `AddApprovalHistories`, `AddBookingExtensionsAndIntegrityConstraints`, `AddLibraryWorkingHours`, `AddApprovalAuditAndAutoApprove`, `AddIncidentReports`, `AddSessionReminders`, `AddViolationAttachments`, `AddBookingIdempotencyKey`, `AddIncidentReportDetails`, `RemoveRedundantIdentityTables`, `AddPasswordOtpFields`, `AddMultiLevelApproval`, `RemoveUnusedIdentityColumns`.
- `AddPeriodRoomType` đã áp trên volume hiện tại:
  - `Periods.RoomTypeId` (nullable) + FK `FK_Periods_RoomTypes_RoomTypeId`.
  - Index `IX_Rooms_RoomCode` unique, filter `IsDeleted = false`.
  - Index `IX_Periods_RoomTypeId`.
- Kiểm tra DB: 105 phòng / 105 mã unique; 16 tiết lý thuyết + 16 tiết thực hành; 7 loại phòng.

### 8.3. CI

- `.github/workflows/ci.yml` chạy khi push/PR vào `main`, `test`:
  - Backend: restore, build, generate migration SQL.
  - Web: `npm ci`, `npm test`, `npm run build`.
- Chưa có `dotnet test`, lint, E2E, deploy, security scan.
- Nhánh làm việc `dev/Khoi` không nằm trong trigger push của CI; chỉ chạy khi mở PR vào `main`/`test`.

### 8.4. Script local

| File | Trạng thái | Đề xuất |
|---|---|---|
| `setup.bat` | Còn dùng | Giữ |
| `update-db.bat` | Còn dùng | Giữ |
| `run-backend.bat` | Còn dùng | Giữ |
| `run-web.bat` | Còn dùng | Giữ |
| `reset-db.bat` | Còn dùng | Giữ |
| `public-tunnel.bat` | Tùy nhu cầu demo | Giữ — đã kiểm tra `cloudflared` và cổng 5173 trước khi mở tunnel |
| `run-redis.bat`, `stop-redis.bat` | **Đã xoá** | Không còn Redis trong hệ thống |

> Các file `.bat` chỉ là wrapper lệnh, không được code/CI/Dockerfile tham chiếu. Bỏ chúng không ảnh hưởng hoạt động của ứng dụng; chỉ cần cập nhật tài liệu.

### 8.5. Redis

- **Đã bỏ Redis** (30/10/2026): xoá gói `Microsoft.AspNetCore.SignalR.StackExchangeRedis`, section `Redis` trong `appsettings.json`, khối Redis backplane trong `Program.cs` và hai file `run-redis.bat`/`stop-redis.bat`.
- SignalR chạy in-memory, phù hợp vì compose chỉ có một instance API.

---

## 9. RỦI RO & NỢ KỸ THUẬT ƯU TIÊN

| Ưu tiên | Vấn đề | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| ~~P0~~ | ~~Reset mật khẩu trả OTP trong response và không kiểm tra OTP~~ | Đã xử lý (07/11): OTP hash + hạn 10 phút + max 5 lần, không trả response | — |
| ~~P0~~ | ~~Login không kiểm tra `Status`/`LockoutEnd`~~ | Đã xử lý (08/11): chặn khóa/đình chỉ khi đăng nhập, có `SecurityGuardsTests` | — |
| **P0** | File đính kèm biên bản vi phạm cho anonymous truy cập | Lộ dữ liệu nhạy cảm | Bắt buộc `[Authorize]` + kiểm tra quyền |
| **P1** | Chưa tự set `LockoutEnd` khi sai mật khẩu liên tiếp | Brute-force vẫn thử được mật khẩu | Tăng `AccessFailedCount` + set `LockoutEnd` |
| ~~P1~~ | ~~`GET /api/Bookings/{id}`, `GET /api/UsageSessions/{id}` thiếu kiểm tra quyền sở hữu~~ | Đã xử lý (08/11): role guards + `SecurityGuardsTests` (13 test) | — |
| **P1** | CORS cho mọi origin + credentials; JWT secret mặc định | Tăng bề mặt tấn công, rò rỉ token | Giới hạn origin; bắt buộc secret từ env khi triển khai thật |
| ~~P1~~ | ~~Thiếu email/Notification Center/nhắc lịch; no-show chỉ ghi DB~~ | Đã xử lý: Notification Center + email SMTP + BookingReminderWatcher | — |
| ~~P1~~ | ~~Redis cấu hình nhưng không có service~~ | Đã xử lý: bỏ Redis, SignalR in-memory | — |
| ~~P1~~ | ~~Nginx không proxy `/hubs/`~~ | Đã xử lý: thêm `location /hubs/` + `Upgrade`/`Connection` | — |
| **P1** | Chưa có E2E/tải; CI không chạy `dotnet test`/lint | Khó regression, dễ tái phát lỗi | Thêm E2E + job test/lint vào CI |
| **P2** | 296 warning nullable khi build sạch | Khó đọc cảnh báo thật, nợ kỹ thuật | Sửa CS8618/CS8601 theo module; có thể bật nullable có kiểm soát |
| **P2** | `GetPagedAsync` và báo cáo tổng hợp in-memory | Chậm khi dữ liệu lớn | Chuyển sang query/SQL, phân trang DB |
| **P2** | File UI quá lớn, bundle 869 kB | Khó bảo trì, tải chậm | Tách component, lazy-load theo tab/route |
| **P2** | Ma trận quyền phòng khớp chuỗi tiếng Việt | Dễ lệch khi đổi tên loại phòng | Thêm cờ/mã quyền trên `RoomType` |
| **P2** | Chưa có unique constraint cho bộ tiết theo loại phòng | Có thể seed trùng tiết | Thêm unique index `(RoomTypeId, Name)` hoặc `(RoomTypeId, StartTime)` |
| ~~P2~~ | ~~Tài liệu/script lỗi thời (`setup.bat`, `run-redis`, `stop-redis`)~~ | Đã xử lý: xoá script Redis, cập nhật `setup.bat` | — |
| ~~P3~~ | ~~Chưa có feedback/rating, mobile, bảo trì thiết bị, lịch sử duyệt~~ | Đã xử lý: Feedback, Mobile Flutter, IncidentReports, ApprovalHistory | — |

---

## 10. KẾ HOẠCH TIẾP THEO

### Giai đoạn 1 — Bổ sung mã nguồn còn thiếu (ưu tiên cao)

1. Tự khóa tài khoản khi sai mật khẩu liên tiếp: tăng `AccessFailedCount` + set `LockoutEnd`.
2. Phân quyền file đính kèm biên bản vi phạm (bỏ anonymous access).
3. Giới hạn CORS theo origin thật; JWT secret từ biến môi trường khi triển khai thật.

### Giai đoạn 2 — Kiểm thử & tối ưu

1. E2E luồng: đăng nhập → đặt phòng → duyệt 2 cấp (điều chỉnh phòng/giờ) → check-in → check-out → vi phạm → báo cáo.
2. Đưa `dotnet test` + lint vào CI; thêm kiểm thử tải cho API lịch/báo cáo.
3. Dọn warning nullable + lint; tách file UI lớn, code-splitting bundle.

### Giai đoạn 3 — Hoàn thiện đồ án (CLO5, phần thuyết trình)

1. Viết quyển báo cáo theo rubric STT 7–8 (nội dung kiến thức + hình thức/định dạng).
2. Slide thuyết trình (STT 10); kịch bản demo: đặt phòng hội thảo Chủ Nhật, duyệt 2 cấp + điều chỉnh khi duyệt, báo cáo tỷ lệ phòng trống theo khung giờ, mobile đặt phòng/lịch sử vi phạm, chat trực tuyến.

---

## 11. PHỤ LỤC

### 11.1. Tài khoản demo

Mật khẩu chung: `Huit@123` (riêng `admin@huit.edu.vn` / `Admin@123`).

| Vai trò | Email |
|---|---|
| Admin | `admin02@huit.edu.vn`, `admin03@huit.edu.vn` |
| Thủ thư | `tv001@huit.edu.vn` … `tv003@huit.edu.vn` |
| Quản lý phòng | `qlp001@huit.edu.vn` … `qlp003@huit.edu.vn` |
| Sinh viên | `200123456@huit.edu.vn` … `200123460@huit.edu.vn` |
| Giảng viên | `10010001@huit.edu.vn` … `10010003@huit.edu.vn` |

Danh sách đầy đủ: `backend/account.md`.

### 11.2. Lệnh thường dùng

```powershell
# Docker
docker compose up --build -d
docker compose ps
docker compose logs -f api
docker compose down
docker compose down -v

# Local
setup.bat
update-db.bat
run-backend.bat
run-web.bat

# Mobile
cd mobile_app
flutter test

# Kiểm tra trước khi commit
cd backend
dotnet build HUIT-RoMan.sln --no-incremental   # xem đủ warning nullable
dotnet test tests/HUIT-RoMan.Tests/HUIT-RoMan.Tests.csproj
cd ..\web
npm test -- --run
npm run build
npm run lint
```

### 11.3. Đường dẫn quan trọng

| Khu vực | Đường dẫn |
|---|---|
| Backend API | `backend/src/API/` |
| Nghiệp vụ | `backend/src/Application/Modules/` |
| Policy đặt phòng/check-in/hủy | `backend/src/Application/Modules/Booking/Services/` |
| Background service no-show | `backend/src/API/Services/BookingNoShowWatcher.cs` |
| Entity | `backend/src/Domain/` |
| Migration & seeder | `backend/src/Infrastructure/` |
| Danh mục phòng/tiết | `backend/src/Infrastructure/Persistence/RoomCatalogSeed.cs` |
| Test backend | `backend/tests/HUIT-RoMan.Tests/` |
| Stored procedure | `backend/src/Infrastructure/SQL/StoredProcedures.sql` |
| Web pages | `web/src/pages/` |
| Web admin tabs | `web/src/components/admin/` |
| Logic & test | `web/src/lib/` |
| Mobile Flutter | `mobile_app/lib/` (màn hình `lib/features/`, API client `lib/core/network/`) |
| Docker | `docker-compose.yml`, `backend/Dockerfile`, `web/Dockerfile`, `web/nginx.conf` |
| CI | `.github/workflows/ci.yml` |

### 11.4. Lịch sử cập nhật

| Ngày | Nội dung |
|---|---|
| 08/11/2026 | Cập nhật theo rubric chấm mới: đối chiếu 16 dòng CLO3 + CLO4 với mã nguồn (mục 6); ghi nhận hoàn thành đổi mật khẩu/OTP an toàn, duyệt nhiều cấp + điều chỉnh khi duyệt, vacancy theo khung giờ, IncidentReports, mobile Flutter (~19 màn hình/68 test), miễn phòng hội thảo khỏi giờ thư viện, trang Quy định + đổi tên hệ thống; test 196/136/68 pass, Docker healthy; còn lộ anonymous attachment vi phạm + auto-lockout |
| 07/11/2026 | Batch nghiệp vụ đặt phòng: R-codes R01–R13, trùng lịch → từ chối + email gợi ý, quota sinh viên 2 lượt/tuần, gia hạn cap 60 phút/đơn, idempotency key; sửa OTP an toàn + chặn lockout/đình chỉ; SessionReminders |
| 28/10/2026 | Viết lại báo cáo theo HEAD `cdd07f8`: cập nhật ma trận quyền, 2 bộ 16 tiết, danh mục 99 phòng, API lịch theo khoảng ngày, UI đặt phòng dạng bảng, no-show watcher; chạy lại build/test/migration; ghi nhận 296 warning nullable |
| 27/10/2026 | Bổ sung check-in `[T−15m, T)`, hủy đơn có lý do, no-show tự động hủy, breakdown báo cáo hủy và 57 test backend |
| 24/10/2026 | Viết lại toàn bộ báo cáo từ review mã nguồn; cập nhật số liệu test, rủi ro bảo mật, hiện trạng WIP và kế hoạch |
| 20/10/2026 | Báo cáo tiến độ trước đó |
