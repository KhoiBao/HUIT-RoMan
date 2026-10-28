# BÁO CÁO TIẾN ĐỘ DỰ ÁN HUIT-ROMan

**Hệ thống Quản lý Đăng ký và Khai thác Phòng Dùng Chung — Trường Đại học Công Thương TP.HCM (HUIT)**

- **Mã đề tài:** CNTT-KLCN236
- **Ngày review:** 28/10/2026
- **Nhánh hiện tại:** `dev/Khoi` — HEAD `cdd07f8` (28/10/2026), working tree sạch, đã đồng bộ `origin/dev/Khoi`
- **Phạm vi review:** backend ASP.NET Core, web React, database PostgreSQL, Docker, CI và tài liệu

> Báo cáo được viết lại từ việc đối chiếu trực tiếp mã nguồn tại HEAD `cdd07f8`, không chỉ dựa trên báo cáo cũ. Các số liệu build/test/migration bên dưới được chạy lại trong ngày 28/10/2026 trên đúng commit này.

---

## 1. TÓM TẮT ĐIỀU HÀNH

| Nội dung | Kết quả |
|---|---|
| **Tiến độ tổng thể** | **~90%** |
| Nhóm nghiệp vụ đã hoàn thành | 10 nhóm chính: xác thực, người dùng, phòng/thiết bị, đặt phòng, duyệt, lịch phòng, sử dụng/trả phòng, vi phạm, ca trực, báo cáo; kèm chat realtime |
| Nhóm còn thiếu hoặc dở dang | Email thông báo, Notification Center, nhắc lịch, feedback, mobile Flutter |
| Backend | 15 controller, **115 endpoint**, 26 entity, **8 migration**, 9 function/procedure; 1 project test với **57 test**; 1 background service tự động hủy no-show |
| Web | 6 route, **13 tab quản trị**, 7 file test / **87 test** |
| Hạ tầng | Docker Compose 3 service (`db`, `api`, `web`), 3 container đang chạy; CI GitHub Actions 2 job |
| Build hiện tại | Backend: **0 error**, 296 warning nullable (clean build); Web: build pass; lint **0 error / 58 warning** |
| Rủi ro cao nhất | Reset mật khẩu chưa xác thực OTP; tài khoản bị khóa vẫn đăng nhập được; một số GET chưa kiểm tra quyền sở hữu; Redis/Nginx chưa đủ cho chat qua Docker |

**Điểm nổi bật**

- Luồng nghiệp vụ chính đã chạy end-to-end: đăng nhập → đặt phòng → duyệt → nhận phòng → trả phòng → xử lý vi phạm → báo cáo.
- Có JWT + phân quyền 4 role, soft-delete, chống trùng lịch ở tầng ứng dụng và exclusion constraint trong PostgreSQL.
- **Quy định nhận phòng mới:** chỉ được check-in trong cửa sổ `[T − 15 phút, T)`; quá T mà chưa check-in thì background service tự động hủy đơn, ghi lý do `NO_SHOW`, nguồn `AUTO`, giải phóng phòng và tạo bản ghi thông báo.
- **Ma trận quyền đặt phòng theo vai trò** được enforce ở backend: sinh viên chỉ đặt phòng học nhóm/thuyết trình; giảng viên đặt được thêm phòng lý thuyết, thực hành, hội thảo/hội trường.
- **Danh mục phòng mới:** 99 phòng seed theo mô hình HUIT (11 phòng thực hành A101–A111 + 88 phòng lý thuyết A201–A511/B201–B511); hai loại phòng lý thuyết/thực hành có bộ 16 tiết riêng.
- **UI đặt phòng dạng bảng** có lọc ngày/trạng thái/tìm kiếm, nút Nhận phòng/Chi tiết/Hủy và luồng hủy 2 bước có lý do.
- **Trang lịch phòng** hỗ trợ chế độ Ngày/Tuần/Tháng, timeline 07:00–20:00 (tự mở rộng nếu có lịch sớm/muộn), KPI, bộ lọc và bảng chi tiết.
- **Báo cáo** bổ sung thống kê hủy theo nguồn (sinh viên / no-show / nhân sự / không rõ) và theo lý do.
- **Kiểm thử backend đã có:** 57/57 test pass; web 87/87 test pass.

**Việc còn thiếu để nghiệm thu**

1. Sửa lỗ hổng reset mật khẩu và kiểm tra trạng thái tài khoản khi đăng nhập.
2. Bổ sung Notification Center + email kết quả duyệt + nhắc lịch; hiện no-show chỉ ghi DB, người dùng chưa thấy thông báo trên UI.
3. Chốt phương án Redis và proxy `/hubs/` cho SignalR khi chạy qua Nginx.
4. Bổ sung E2E, kiểm thử tải và đưa `dotnet test`/lint vào CI.
5. Mobile Flutter (nếu đề tài vẫn yêu cầu).

---

## 2. BẢNG TIẾN ĐỘ TỔNG HỢP

| Hạng mục | Trạng thái | % | Căn cứ / ghi chú |
|---|---|---|---|
| Xác thực & phân quyền | Hoàn thiện chức năng, còn lỗ hổng | **90%** | JWT 7 ngày, 4 role, khóa/mở tài khoản; thiếu kiểm tra lockout khi login, refresh/logout, reset OTP an toàn |
| Quản lý người dùng & danh mục | Hoàn thành | **100%** | Users, Employees, Departments; CRUD, tìm kiếm, đổi role/trạng thái |
| Quản lý phòng, loại phòng, thiết bị | Hoàn thành | **100%** | CRUD phòng/loại phòng/kho thiết bị; 7 loại phòng, 105 phòng trên DB hiện tại; API phân trang; mã phòng unique |
| Đặt phòng & duyệt đơn | Hoàn thành | **100%** | Đặt nhiều phòng, theo tiết/giờ; ma trận quyền theo vai trò; hủy có lý do; duyệt toàn bộ hoặc từng chi tiết |
| Lịch phòng & phòng trống | Hoàn thành | **100%** | Lịch Ngày/Tuần/Tháng; API lịch theo khoảng ngày; timeline, KPI, bộ lọc |
| Quản lý sử dụng, check-in/out | Hoàn thành | **100%** | Cửa sổ check-in `[T−15m, T)`; no-show tự động hủy; trả phòng + checklist hiện trạng |
| Xử lý vi phạm & cấm mượn | Hoàn thành | **100%** | Biên bản, loại vi phạm, lệnh cấm, kiểm tra eligibility, thống kê |
| Ca trực & nhật ký trực | Hoàn thành | **100%** | CRUD ca, phân nhiều nhân sự, trạng thái, nhật ký bàn giao, thống kê |
| Báo cáo & thống kê | Hoàn thành | **100%** | 4 API báo cáo + CSV; KPI, lọc 7/30/90 ngày, quý, năm; breakdown hủy theo nguồn/lý do |
| Chat realtime | Hoàn thiện ứng dụng | **90%** | SignalR hub, REST, phân quyền hội thoại, typing/read; thiếu Redis và proxy `/hubs` qua Nginx |
| Thông báo, email, nhắc lịch | Chưa triển khai | **5%** | Chỉ có entity `Notification`; no-show có ghi bản ghi nhưng chưa có API/UI để người dùng đọc |
| Feedback & đánh giá | Chưa triển khai | **5%** | Chỉ có entity `Feedback`; chưa có API/UI |
| Giao diện Web React | Hoàn thiện | **100%** | 6 route, 13 tab quản trị; toàn bộ màn hình nghiệp vụ đã commit |
| Trang chủ & Portal | Hoàn thiện | **100%** | Đã commit; 12 ảnh trong `web/public/images/`, không còn ảnh hero trỏ sai |
| Mobile Flutter | Chưa triển khai | **0%** | `mobile/` chỉ có tài liệu đặc tả, chưa có source |
| Kiểm thử | Đang thực hiện | **75%** | 57/57 test backend, 87/87 test web; chưa có E2E, tải, bảo mật tự động |
| Docker & CI | Hoàn thiện | **90%** | Compose 3 service + healthcheck + CI; CI chưa chạy `dotnet test`/lint, chưa có CD/monitoring |
| Tài liệu | Khá đầy đủ, có chỗ lỗi thời | **70%** | README/docker/backend docs tốt; `setup.bat`, script Redis đã cũ |
| Bảo mật & hardening | Cần tăng cường | **50%** | JWT/role/soft-delete ổn; còn lỗi reset OTP, lockout, CORS, secret mặc định, IDOR |

---

## 3. KIẾN TRÚC & CÔNG NGHỆ

### 3.1. Backend

- **.NET 8 Web API**, tổ chức Clean Architecture 4 project:
  - `Domain`: 26 entity nghiệp vụ.
  - `Application`: service + DTO, nghiệp vụ theo module.
  - `Infrastructure`: EF Core, repository, migration, seeder, stored procedure.
  - `API`: controller mỏng, JWT, Swagger, SignalR hub, background service.
- **Project test riêng:** `backend/tests/HUIT-RoMan.Tests` dùng xUnit + SQLite in-memory.
- **PostgreSQL 16** qua Npgsql EF Core 8; **8 migration** đã áp trên DB Docker hiện tại.
- **15 controller, 115 endpoint**; Identity cho user/role; JWT Bearer; Swagger có nút Authorize.
- **SignalR** cho chat realtime; có code Redis backplane tùy chọn.
- **Soft-delete** bằng global query filter cho entity kế thừa `ISoftDelete`.
- **Background service:** `BookingNoShowWatcher` chạy mỗi 30 giây (cấu hình `NoShowWatcher:IntervalSeconds`), gọi `BookingNoShowService` để tự hủy đơn quá giờ chưa check-in.
- **Policy nghiệp vụ tách riêng:** `StudentBookingPolicy`, `BookingRoomPermissionPolicy`, `BookingCheckInPolicy`, `BookingCancelPolicy`.
- **Múi giờ:** DB lưu UTC; client gửi UTC; service chuyển sang giờ Việt Nam (UTC+7) khi xác định ngày/khoảng tiết rồi đổi lại UTC trước khi lưu.
- **Stored procedure/function (9):** kiểm tra trùng lịch, lịch phòng, phòng trống, duyệt đơn, cập nhật trạng thái phòng, tổng hợp báo cáo, ghi vi phạm + cấm mượn, kiểm tra eligibility, xử lý trả phòng. Code hiện chỉ gọi 2 function/procedure (`fn_get_available_rooms`, `sp_process_room_checkout`); 7 phần còn lại là SQL định nghĩa sẵn nhưng chưa dùng.

### 3.2. Frontend

- **React 19 + TypeScript 6 + Vite 8**.
- **React Router 7**, Axios, `@microsoft/signalr`.
- **Vitest** cho logic thuần trong `web/src/lib/`.
- Cấu trúc: `pages/`, `components/`, `components/admin/`, `lib/`, `auth/`.
- 6 route: `/login`, `/home`, `/dat-phong`, `/lich-phong`, `/staff`, `/admin`; 13 tab quản trị.
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

---

## 5. CHI TIẾT TỪNG PHÂN HỆ

### 5.1. Xác thực & phân quyền

**Đã có**

- Đăng nhập bằng email/MSSV/mã cán bộ (`POST /api/Auth/login`), cấp JWT 7 ngày.
- 4 role kỹ thuật: `Admin`, `Employee`, `Student`, `Lecturer`; UI gom thành 3 nhóm.
- Quản lý trạng thái tài khoản: Hoạt động / Không hoạt động / Đình chỉ.
- Quên mật khẩu + đặt lại mật khẩu qua OTP.
- Frontend: `LoginPage`, `ForgotPasswordModal`, `AuthContext`, `RequireAuth`, `RequireStaff`.

**Vấn đề cần sửa**

- `ResetPasswordAsync` **không kiểm tra OTP** có khớp hay không; OTP còn được trả thẳng trong response và hiển thị trên UI. Bất kỳ ai biết email cũng có thể đặt lại mật khẩu.
- `LoginAsync` không kiểm tra `Status`/`LockoutEnd`, nên tài khoản bị khóa vẫn đăng nhập được nếu còn mật khẩu.
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

- Nghiệp vụ khóa tài khoản đã ghi `LockoutEnd`, nhưng login chưa tận dụng (xem 5.1).

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

- `GET /api/Bookings/{id}` chưa kiểm tra người dùng có thuộc đơn hay không (IDOR).

### 5.5. Duyệt đơn

**Đã có**

- Duyệt/từ chối cả đơn hoặc từng chi tiết phòng.
- Tự tính lại trạng thái đơn: Đã duyệt / Duyệt một phần / Từ chối.
- Nhập lý do từ chối; lọc, tìm kiếm đơn.
- UI: `AdminBookingApprovalTab`.

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
- `GET /api/UsageSessions/{id}` chưa kiểm tra quyền sở hữu.
- Bản ghi `Notification` do no-show tạo ra **chưa có API/UI** để người dùng đọc; người dùng chỉ thấy trạng thái đơn đổi trong danh sách.

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
- Xuất CSV UTF-8 có BOM, mở tốt bằng Excel.
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

**Hạn chế**

- `docker-compose.yml` không có service Redis, nhưng `appsettings.json` vẫn cấu hình `Redis:ConnectionString = localhost:6379`. Backplane vẫn được bật nên chat có thể không gửi/nhận ổn định khi không có Redis.
- `web/nginx.conf` chưa proxy `/hubs/`, nên khi chạy qua web Docker (cổng 5173) SignalR handshake bị trả về `index.html`; chat realtime chỉ chạy ổn khi dùng Vite dev hoặc gọi trực tiếp API.
- Muốn scale-out nhiều instance API phải thêm Redis; nếu chỉ chạy một instance nên bỏ cấu hình Redis để dùng in-memory rõ ràng.

### 5.12. Các phần chưa triển khai

| Phần | Hiện trạng |
|---|---|
| Email thông báo kết quả duyệt | Chưa có MailKit/SMTP |
| Notification Center | Chỉ có entity `Notification`; no-show có ghi bản ghi nhưng chưa có API/UI |
| Nhắc lịch sắp đến/sắp kết thúc | Chưa có background service/cron |
| Feedback/đánh giá sau sử dụng | Chỉ có entity `Feedback` |
| Bảo trì thiết bị | Có entity `MaintenanceRecord`, chưa có API/UI |
| Lịch sử duyệt | Có entity `ApprovalHistory`, chưa ghi nhận |
| Mobile Flutter | Chỉ có tài liệu đặc tả trong `mobile/` |

---

## 6. ĐỐI CHIẾU 29 YÊU CẦU CỦA ĐỀ TÀI

| # | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Thiết kế giao diện Web ReactJS | Đạt | 6 route, 13 tab quản trị; trang chủ/portal đã commit |
| 2 | Thiết kế giao diện Mobile Flutter | Chưa | 0%, chỉ có tài liệu |
| 3 | Màn hình đăng nhập, quản lý phòng, đăng ký, duyệt, thông báo | Một phần | Đủ màn hình chính; thiếu Notification Center |
| 4 | Báo cáo tiến độ | Đạt | File này |
| 5 | Backend ASP.NET Core Web API | Đạt | 15 controller, 115 endpoint |
| 6 | Quản lý danh mục: loại phòng, phòng, nhân viên, sinh viên, giảng viên | Đạt | CRUD + tìm kiếm |
| 7 | Quản lý thiết bị trong phòng | Đạt | Kho thiết bị + phân bổ theo phòng |
| 8 | API xác thực & phân quyền | Một phần | JWT/role ổn; còn lỗi lockout và reset OTP |
| 9 | Quản lý phòng | Đạt | CRUD + soft-delete + mã phòng unique |
| 10 | Quản lý trạng thái phòng | Đạt | Trống / Đang sử dụng / Bảo trì |
| 11 | Đăng ký mượn phòng | Đạt | Đa phòng, theo tiết/giờ; ma trận quyền + 2 bộ tiết |
| 12 | Kiểm tra lịch phòng | Đạt | Lịch Ngày/Tuần/Tháng + API lịch theo khoảng ngày |
| 13 | Duyệt đăng ký mượn phòng | Đạt | Duyệt cả đơn hoặc từng phòng |
| 14 | Gửi email thông báo kết quả duyệt | Chưa | Chưa có SMTP/MailKit |
| 15 | Quản lý quá trình sử dụng phòng | Đạt | UsageSession + check-in/out + no-show tự động |
| 16 | Nhắc lịch sắp đến và sắp kết thúc | Chưa | Chưa có background job nhắc lịch |
| 17 | Xác nhận trả phòng | Đạt | Checklist + cập nhật trạng thái phòng |
| 18 | Xử lý vi phạm | Đạt | Biên bản, chế tài, cấm mượn |
| 19 | Ghi nhận biên bản vi phạm | Đạt | Tự tính thời hạn cấm |
| 20 | Gửi thông báo nhắc nhở người sử dụng | Chưa | Chỉ có entity `Notification` |
| 21 | Quản lý lịch trực nhân viên | Đạt | Ca trực + nhật ký + thống kê |
| 22 | Tìm kiếm phòng, người mượn, phiếu mượn, biên bản | Đạt | API search + `Ctrl + K` |
| 23 | Thống kê, báo cáo | Đạt | 4 API + CSV + breakdown hủy |
| 24 | Thống kê tình trạng sử dụng phòng | Đạt | Giờ dùng, tỷ lệ lấp đầy, leaderboard |
| 25 | Thống kê lượt mượn phòng | Đạt | Theo thời gian, trạng thái, khoa |
| 26 | Thống kê vi phạm | Đạt | Mức độ, loại, đối tượng, lệnh cấm |
| 27 | Hoàn thiện Web ReactJS và kết nối API | Đạt | Đã commit; ảnh/hero đầy đủ |
| 28 | Mobile Flutter + chat realtime | Một phần | Chat hoàn thành; mobile 0% |
| 29 | Kiểm thử toàn hệ thống | Một phần | 57 test backend + 87 test web; thiếu E2E/tải/bảo mật |

**Tổng hợp:** 21 yêu cầu đạt, 4 yêu cầu một phần, 4 yêu cầu chưa triển khai.

---

## 7. KIỂM THỬ & CHẤT LƯỢNG MÃ NGUỒN

### 7.1. Đã kiểm chứng

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| Build backend (clean) | **0 error / 296 warning** | Warning nullable CS8618/CS8601/…, không chặn build |
| Unit/integration test backend | **57/57 pass** | xUnit + SQLite in-memory; 5 file test |
| Unit test frontend | **87/87 pass** | 7 file: `AuthContext.test.tsx`, `homeContent.test.ts`, `auth.test.ts`, `booking.test.ts`, `home.test.ts`, `rooms.test.ts`, `schedule.test.ts` |
| Build frontend | Pass | Bundle 868.94 kB (220.85 kB gzip); Vite cảnh báo > 500 kB |
| Lint frontend | Pass | 58 warning hooks/React, 0 error |
| Docker Compose | OK | 3 container; `db`/`api` healthy; web HTTP 200 |
| Migration PostgreSQL | OK | 8 migration; `Period.RoomTypeId`; unique `IX_Rooms_RoomCode`; 16+16 tiết |
| API smoke test | OK | health, login, periods, paged rooms, schedules, chặn sinh viên đặt phòng lý thuyết |

### 7.2. Phạm vi test hiện có

**Backend — 57 test / 5 file:**

| File | Số test | Nội dung |
|---|---:|---|
| `BookingCheckInTests.cs` | 14 | Cửa sổ `[T−15m, T)`, check-in sớm/đúng giờ/quá giờ, đơn chưa duyệt/đã hủy, check-in lặp, tranh chấp đồng thời, check-in theo chi tiết |
| `BookingCancelTests.cs` | 14 | Hạn 3 giờ, lý do bắt buộc, OTHER có/không chi tiết, đơn chưa duyệt/đã hủy/đã check-in, sai chủ sở hữu, 2 request đồng thời, admin hủy, hủy sau no-show |
| `BookingNoShowTests.cs` | 8 | Quá hạn chưa check-in, đã check-in, trước giờ, chưa duyệt, đã hủy, chạy lặp idempotent, giải phóng phòng, 2 đơn cùng lúc |
| `BookingRoleAndPeriodTests.cs` | 18 | 11+88 phòng, mã unique, 2 bộ 16 tiết, ma trận sinh viên/giảng viên, không trộn bộ tiết, trùng lịch, hủy/từ chối giải phóng chỗ |
| `ReportCancellationTests.cs` | 3 | Phân biệt nguồn hủy, thống kê lý do, đơn bị từ chối không tính là hủy |

**Frontend — 87 test / 7 file:**

- `web/src/auth/AuthContext.test.tsx`, `web/src/data/homeContent.test.ts`, `web/src/lib/auth.test.ts`, `web/src/lib/booking.test.ts`, `web/src/lib/home.test.ts`, `web/src/lib/rooms.test.ts`, `web/src/lib/schedule.test.ts`.
- Bao phủ validate đăng nhập, validate đặt phòng, quy tắc sinh viên/giảng viên, chuyển đổi ngày/giờ, timeline, month grid, KPI, trạng thái phòng, thống kê trang chủ, định dạng báo cáo.

**Chưa có:**

- Integration test API + PostgreSQL thật (test backend đang dùng SQLite in-memory).
- E2E (Playwright/Cypress) cho luồng đầy đủ.
- Kiểm thử tải/độ ổn định.
- Test bảo mật/phân quyền tự động.
- CI chưa chạy `dotnet test` và lint.

### 7.3. Nợ kỹ thuật về chất lượng

- **296 warning nullable** trên build sạch; nên bật/tắt có kiểm soát hoặc sửa dần theo module.
- File UI lớn: `BookingPage.tsx` 3.026 dòng, `AdminDashboardPage.tsx` 2.223 dòng, `AdminViolationsTab.tsx` 1.892 dòng, `SchedulePage.tsx` 1.724 dòng, `AdminShiftsTab.tsx` 1.295 dòng. Nên tách component/hook.
- Bundle chính 868.94 kB; chưa code-splitting theo route/tab.
- Còn 58 warning lint hooks/React.
- `RoomService.GetPagedAsync` và phần lớn `ReportService` load toàn bộ dữ liệu rồi lọc/tổng hợp trong bộ nhớ.
- Ma trận quyền phòng khớp theo chuỗi tiếng Việt; nên chuyển sang mã/cờ cấu hình trên `RoomType`.
- Module rỗng: `Application/Modules/Communication`, `Application/Modules/Reporting`; trang `PlaceholderHome.tsx` không còn dùng.
- Entity chưa được khai thác: `Feedback`, `Notification`, `MaintenanceRecord`, `ApprovalHistory`, `RoomTypeCondition`.
- Tài liệu/script cũ: `setup.bat`, `run-redis.bat`, `stop-redis.bat`.

---

## 8. HẠ TẦNG & VẬN HÀNH

### 8.1. Docker Compose

| Service | Image / build | Cổng host | Ghi chú |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5433` → `5432` | Volume `postgres_data`, healthcheck |
| `api` | `backend/Dockerfile` | `5056` → `8080` | Tự migration + seed, healthcheck `/api/health`, chạy no-show watcher |
| `web` | `web/Dockerfile` (Nginx) | `5173` → `80` | Proxy `/api`, `/swagger`; SPA fallback; **thiếu `/hubs`** nên chat realtime không hoạt động qua Nginx |

- Chạy: `docker compose up --build -d`
- Dừng: `docker compose down`
- Reset dữ liệu: `docker compose down -v`
- Trạng thái kiểm tra 28/10: `huit-roman-db` healthy, `huit-roman-api` healthy, `huit-roman-web` chạy và trả HTTP 200.

### 8.2. Migration & dữ liệu

- 8 migration trong `backend/src/Infrastructure/Migrations/`:
  `Initial`, `SyncDomainModelsFromBE`, `AddEquipmentCode`, `AddSoftDelete`, `AddEquipmentQuantities`, `AddBookingOverlapConstraint`, `AddBookingCheckInAndCancelReason`, `AddPeriodRoomType`.
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
| `setup.bat` | Còn dùng | Giữ; sửa dòng nhắc `run-redis.bat` |
| `update-db.bat` | Còn dùng | Giữ |
| `run-backend.bat` | Còn dùng | Giữ |
| `run-web.bat` | Còn dùng | Giữ |
| `reset-db.bat` | Còn dùng | Giữ |
| `public-tunnel.bat` | Tùy nhu cầu demo | Giữ nếu cần Cloudflare Tunnel |
| `run-redis.bat` | **Lỗi thời** | Bỏ — hiện chạy toàn bộ stack, không còn Redis |
| `stop-redis.bat` | **Lỗi thời** | Bỏ — hiện tắt toàn bộ stack |

> Các file `.bat` chỉ là wrapper lệnh, không được code/CI/Dockerfile tham chiếu. Bỏ chúng không ảnh hưởng hoạt động của ứng dụng; chỉ cần cập nhật tài liệu.

### 8.5. Redis

- Code backend hỗ trợ Redis backplane (`Program.cs`, `appsettings.json`).
- Compose hiện không có service Redis.
- Cần chọn một hướng:
  1. Thêm service `redis` + đặt `Redis__ConnectionString=redis:6379` cho API; hoặc
  2. Bỏ trống `Redis:ConnectionString` để dùng in-memory SignalR (đủ cho 1 instance).

---

## 9. RỦI RO & NỢ KỸ THUẬT ƯU TIÊN

| Ưu tiên | Vấn đề | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| **P0** | Reset mật khẩu trả OTP trong response và không kiểm tra OTP | Chiếm tài khoản bất kỳ | Lưu OTP hash + hạn dùng; không trả OTP; verify đúng token |
| **P0** | Login không kiểm tra `Status`/`LockoutEnd` | Tài khoản bị khóa vẫn đăng nhập | Dùng `SignInManager.CheckPasswordSignInAsync` hoặc kiểm tra lockout/status |
| **P1** | `GET /api/Bookings/{id}`, `GET /api/UsageSessions/{id}` thiếu kiểm tra quyền sở hữu | Lộ dữ liệu đơn/phiên của người khác | Kiểm tra owner/department trước khi trả dữ liệu |
| **P1** | CORS cho mọi origin + credentials; JWT secret mặc định | Tăng bề mặt tấn công, rò rỉ token | Giới hạn origin; bắt buộc secret từ env; xoay secret |
| **P1** | Thiếu email/Notification Center/nhắc lịch; no-show chỉ ghi DB | Người dùng không biết đơn bị hủy; thiếu yêu cầu 14, 16, 20 | Notification API/UI + MailKit + background job nhắc lịch |
| **P1** | Redis cấu hình nhưng không có service | Chat có thể treo/không gửi tin | Thêm Redis hoặc bỏ cấu hình |
| **P1** | Nginx không proxy `/hubs/` | Chat realtime hỏng khi chạy Docker qua web | Thêm `location /hubs/` kèm header `Upgrade`/`Connection` |
| **P1** | Chưa có E2E/tải; CI không chạy `dotnet test`/lint | Khó regression, dễ tái phát lỗi | Thêm E2E + job test/lint vào CI |
| **P2** | 296 warning nullable khi build sạch | Khó đọc cảnh báo thật, nợ kỹ thuật | Sửa CS8618/CS8601 theo module; có thể bật nullable có kiểm soát |
| **P2** | `GetPagedAsync` và báo cáo tổng hợp in-memory | Chậm khi dữ liệu lớn | Chuyển sang query/SQL, phân trang DB |
| **P2** | File UI quá lớn, bundle 869 kB | Khó bảo trì, tải chậm | Tách component, lazy-load theo tab/route |
| **P2** | Ma trận quyền phòng khớp chuỗi tiếng Việt | Dễ lệch khi đổi tên loại phòng | Thêm cờ/mã quyền trên `RoomType` |
| **P2** | Chưa có unique constraint cho bộ tiết theo loại phòng | Có thể seed trùng tiết | Thêm unique index `(RoomTypeId, Name)` hoặc `(RoomTypeId, StartTime)` |
| **P2** | Tài liệu/script lỗi thời (`setup.bat`, `run-redis`, `stop-redis`) | Người mới làm sai quy trình | Cập nhật theo code hiện tại |
| **P3** | Chưa có feedback/rating, mobile, bảo trì thiết bị, lịch sử duyệt | Thiếu phạm vi mở rộng | Làm sau khi ổn định Web |

---

## 10. KẾ HOẠCH TIẾP THEO

### Giai đoạn 1 — Ổn định & bảo mật (ưu tiên cao, 1–2 ngày)

1. Sửa luồng quên/đặt lại mật khẩu:
   - Sinh OTP bằng `RandomNumberGenerator`.
   - Lưu hash + thời hạn + số lần thử.
   - Không trả OTP trong response.
   - Kiểm tra OTP khi reset.
2. Chặn đăng nhập với tài khoản `Không hoạt động`/`Đình chỉ`/đang lockout.
3. Thêm kiểm tra quyền sở hữu cho `GET /api/Bookings/{id}` và `GET /api/UsageSessions/{id}`.
4. Chốt Redis: thêm service hoặc bỏ `Redis:ConnectionString`.
5. Thêm proxy `/hubs/` vào `web/nginx.conf` để chat realtime chạy được trong Docker.
6. Giới hạn CORS theo origin thật và bắt buộc JWT secret từ biến môi trường khi triển khai.
7. Đưa `dotnet test` và lint vào CI; thêm trigger cho nhánh làm việc.

### Giai đoạn 2 — Hoàn thiện nghiệp vụ (3–5 ngày)

1. Notification Center: API đọc/đánh dấu đã đọc + UI chuông thông báo; hiển thị thông báo no-show do watcher tạo.
2. Email kết quả duyệt (MailKit/SMTP) và email nhắc lịch sắp đến/sắp kết thúc.
3. Background job nhắc lịch trước giờ bắt đầu và trước giờ kết thúc.
4. Bổ sung feedback/rating sau sử dụng; hiển thị trong báo cáo.
5. Thêm unique constraint cho bộ tiết và cờ quyền trên `RoomType` để bỏ so khớp chuỗi.

### Giai đoạn 3 — Kiểm thử & tối ưu (2–3 ngày)

1. Viết E2E cho luồng: đăng nhập → đặt phòng → duyệt → check-in → check-out → vi phạm → báo cáo.
2. Thêm kiểm thử tải cho API lịch/báo cáo.
3. Dọn 296 warning nullable và 58 warning lint.
4. Tách file UI lớn, lazy-load theo tab/route; code-splitting bundle.
5. Tối ưu phân trang phòng và báo cáo ở tầng DB.

### Giai đoạn 4 — Mở rộng (nếu còn thời gian)

1. Feedback/rating, bảo trì thiết bị, lịch sử duyệt.
2. Mobile Flutter cho các luồng cơ bản: xem lịch, đặt phòng, nhận kết quả, chat.
3. Monitoring, backup, triển khai production có HTTPS.

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
| Docker | `docker-compose.yml`, `backend/Dockerfile`, `web/Dockerfile`, `web/nginx.conf` |
| CI | `.github/workflows/ci.yml` |

### 11.4. Lịch sử cập nhật

| Ngày | Nội dung |
|---|---|
| 28/10/2026 | Viết lại báo cáo theo HEAD `cdd07f8`: cập nhật ma trận quyền, 2 bộ 16 tiết, danh mục 99 phòng, API lịch theo khoảng ngày, UI đặt phòng dạng bảng, no-show watcher; chạy lại build/test/migration; ghi nhận 296 warning nullable |
| 27/10/2026 | Bổ sung check-in `[T−15m, T)`, hủy đơn có lý do, no-show tự động hủy, breakdown báo cáo hủy và 57 test backend |
| 24/10/2026 | Viết lại toàn bộ báo cáo từ review mã nguồn; cập nhật số liệu test, rủi ro bảo mật, hiện trạng WIP và kế hoạch |
| 20/10/2026 | Báo cáo tiến độ trước đó |
