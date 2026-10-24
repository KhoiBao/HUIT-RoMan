# BÁO CÁO TIẾN ĐỘ DỰ ÁN HUIT-ROMan

**Hệ thống Quản lý Đăng ký và Khai thác Phòng Dùng Chung — Trường Đại học Công Thương TP.HCM (HUIT)**

- **Mã đề tài:** CNTT-KLCN236
- **Ngày review:** 24/10/2026
- **Nhánh hiện tại:** `dev/Khoi` — HEAD `437d659` (22/10/2026)
- **Phạm vi review:** backend ASP.NET Core, web React, database PostgreSQL, Docker, CI và tài liệu

> Báo cáo được viết lại từ việc đối chiếu trực tiếp mã nguồn, không chỉ dựa trên báo cáo cũ. Các số liệu kiểm thử bên dưới được chạy lại tại thời điểm 24/10/2026.

---

## 1. TÓM TẮT ĐIỀU HÀNH

| Nội dung | Kết quả |
|---|---|
| **Tiến độ tổng thể** | **~87%** |
| Nhóm nghiệp vụ đã hoàn thành | 10 nhóm chính: xác thực, người dùng, phòng/thiết bị, đặt phòng, duyệt, lịch phòng, sử dụng/trả phòng, vi phạm, ca trực, báo cáo |
| Nhóm còn thiếu hoặc dở dang | Thông báo/email, nhắc lịch, feedback, mobile Flutter, trang chủ mới |
| Backend | 15 controller, **110 endpoint**, 26 entity, 6 migration, 9 function/procedure |
| Web | 6 route, **13 tab quản trị**, 6 file test / **45 test** |
| Hạ tầng | Docker Compose 3 service (`db`, `api`, `web`), CI GitHub Actions 2 job |
| Build hiện tại | Backend: **0 warning, 0 error**; Web: build pass |
| Rủi ro cao nhất | Reset mật khẩu chưa xác thực OTP; tài khoản bị khóa vẫn đăng nhập được; Redis chưa có trong compose |

**Điểm nổi bật**

- Luồng nghiệp vụ chính đã chạy end-to-end: đăng nhập → đặt phòng → duyệt → nhận phòng → trả phòng → xử lý vi phạm → báo cáo.
- Có JWT + phân quyền 4 role, soft-delete cho hầu hết entity nghiệp vụ, chống trùng lịch ở cả tầng ứng dụng và ràng buộc exclusion constraint trong PostgreSQL.
- Chat realtime SignalR đã hoàn chỉnh ở mức ứng dụng (REST + WebSocket + UI người dùng/nhân sự).
- Trang chủ và khung portal mới đang được làm dở trên working tree; build/test vẫn pass nhưng còn 1 ảnh hero trỏ sai đường dẫn.

**Việc còn thiếu để nghiệm thu**

1. Sửa lỗ hổng reset mật khẩu và kiểm tra trạng thái tài khoản khi đăng nhập.
2. Bổ sung email thông báo, Notification Center và nhắc lịch.
3. Viết test backend, E2E và kiểm thử tải.
4. Chốt phương án Redis và dọn các script `.bat`/tài liệu đã lỗi thời.
5. Mobile Flutter (nếu đề tài vẫn yêu cầu).

---

## 2. BẢNG TIẾN ĐỘ TỔNG HỢP

| Hạng mục | Trạng thái | % | Căn cứ / ghi chú |
|---|---|---|---|
| Xác thực & phân quyền | Hoàn thiện chức năng, còn lỗ hổng | **90%** | JWT 7 ngày, 4 role, khóa/mở tài khoản; thiếu kiểm tra lockout khi login, refresh/logout, reset OTP an toàn |
| Quản lý người dùng & danh mục | Hoàn thành | **100%** | Users, Employees, Departments; CRUD, tìm kiếm, đổi role/trạng thái |
| Quản lý phòng, loại phòng, thiết bị | Hoàn thành | **100%** | CRUD phòng/loại phòng/kho thiết bị, phân bổ thiết bị vào phòng, cập nhật trạng thái |
| Đặt phòng & duyệt đơn | Hoàn thành | **100%** | Đặt nhiều phòng, theo tiết/giờ, hủy đơn, duyệt toàn bộ hoặc từng chi tiết |
| Lịch phòng & phòng trống | Hoàn thành | **100%** | Lịch ngày/tuần, matrix timeline, API phòng trống theo thời gian |
| Quản lý sử dụng, check-in/out | Hoàn thành | **100%** | Check-in bằng ID/mã/booking detail, no-show, trả phòng + khảo sát hiện trạng |
| Xử lý vi phạm & cấm mượn | Hoàn thành | **100%** | Biên bản, loại vi phạm, lệnh cấm, kiểm tra eligibility, thống kê |
| Ca trực & nhật ký trực | Hoàn thành | **100%** | CRUD ca, phân nhiều nhân sự, trạng thái, nhật ký bàn giao, thống kê |
| Báo cáo & thống kê | Hoàn thành | **100%** | 4 API báo cáo + xuất CSV; UI 4 KPI, lọc 7/30/90 ngày, quý, năm |
| Chat realtime | Hoàn thiện ứng dụng | **90%** | SignalR hub, REST, phân quyền hội thoại, typing/read; thiếu Redis và proxy `/hubs` qua Nginx |
| Thông báo, email, nhắc lịch | Chưa triển khai | **5%** | Chỉ có entity `Notification`; chưa có service/controller/UI |
| Feedback & đánh giá | Chưa triển khai | **5%** | Chỉ có entity `Feedback`; chưa có API/UI |
| Giao diện Web React | Hoàn thiện nâng cao | **97%** | Đủ màn hình nghiệp vụ; đang làm lại trang chủ/portal |
| Trang chủ & Portal mới (WIP) | Đang thực hiện | **80%** | Build/test pass; còn ảnh hero sai đường dẫn, chưa commit |
| Mobile Flutter | Chưa triển khai | **0%** | `mobile/` chỉ có tài liệu đặc tả, chưa có source |
| Kiểm thử | Đang thực hiện | **55%** | 45/45 unit test web pass; chưa có test backend, E2E, tải |
| Docker & CI | Hoàn thiện | **90%** | Compose 3 service + healthcheck + CI; chưa có Redis, CD, monitoring |
| Tài liệu | Khá đầy đủ, có chỗ lỗi thời | **70%** | README/docker/backend docs tốt; `project_scope`, `setup.bat`, script Redis đã cũ |
| Bảo mật & hardening | Cần tăng cường | **50%** | JWT/role/soft-delete ổn; còn lỗi reset OTP, lockout, CORS, secret mặc định |

---

## 3. KIẾN TRÚC & CÔNG NGHỆ

### 3.1. Backend

- **.NET 8 Web API**, tổ chức Clean Architecture 4 project:
  - `Domain`: 26 entity nghiệp vụ.
  - `Application`: service + DTO, nghiệp vụ theo module.
  - `Infrastructure`: EF Core, repository, migration, seeder, stored procedure.
  - `API`: controller mỏng, JWT, Swagger, SignalR hub.
- **PostgreSQL 16** qua Npgsql EF Core 8.
- **Identity** cho user/role; JWT Bearer; Swagger có nút Authorize.
- **SignalR** cho chat realtime; có code Redis backplane tùy chọn.
- **Soft-delete** bằng global query filter cho mọi entity kế thừa `ISoftDelete`.
- **Stored procedure/function** (9): kiểm tra trùng lịch, lịch phòng, phòng trống, duyệt đơn, cập nhật trạng thái phòng, tổng hợp báo cáo, ghi vi phạm + cấm mượn, kiểm tra eligibility, xử lý trả phòng. Hiện code chỉ gọi 2 function/procedure (`fn_get_available_rooms`, `sp_process_room_checkout`); 7 phần còn lại là SQL định nghĩa sẵn nhưng chưa dùng.

### 3.2. Frontend

- **React 19 + TypeScript 6 + Vite 8**.
- **React Router 7**, Axios, `@microsoft/signalr`.
- **Vitest** cho logic thuần trong `web/src/lib/`.
- Cấu trúc: `pages/`, `components/`, `components/admin/`, `lib/`, `auth/`.
- Logic validate/tính toán đặt phòng, lịch, báo cáo, chat nằm trong `lib/` và có test.

### 3.3. Hạ tầng

```text
Trình duyệt
    │
    ▼
web (Nginx :80) ──/api/*──▶ api (.NET 8 :8080) ──▶ db (PostgreSQL :5432)
    │                                      │
    └── React SPA                          └── tự migration + seed
```

- `docker-compose.yml`: `db` (postgres:16-alpine), `api` (.NET 8), `web` (Nginx 1.27).
- API tự chạy migration và seed khi `Database__AutoMigrate=true`.
- `web/nginx.conf` hiện chỉ proxy `/api/` và `/swagger`; `/hubs/` chưa được proxy (xem mục 5.11).
- CI GitHub Actions: build backend + validate EF model; npm ci/test/build frontend.

---

## 4. HIỆN TRẠNG MÃ NGUỒN TẠI THỜI ĐIỂM REVIEW

### 4.1. Working tree

- **24 file đã sửa + 8 file mới**, chưa commit.
- Thay đổi chính:
  - Làm lại trang chủ: `HomePage.tsx`, `HomeHero.tsx`, `ProcessSection.tsx`, `RoomTypesSection.tsx`, `InfoFooter.tsx`.
  - Thêm khung portal dùng chung: `PortalLayout.tsx`, cập nhật `App.tsx`, `SiteHeader.tsx`.
  - Thêm bộ nhận diện HUIT: `huit-logo.svg`, `roman.css`, 3 ảnh trong `web/public/images/`.
  - Bổ sung logic trang chủ: `web/src/lib/home.ts` + `home.test.ts`.
  - Tinh chỉnh đặt phòng/lịch: `booking.ts`, `schedule.ts` và test tương ứng.
  - Áp dụng quy tắc sinh viên ở backend: `StudentBookingPolicy.cs` (mới), `BookingService.cs`, `RoomsController.cs`.
  - Cập nhật seeder danh mục phòng dùng chung của Thư viện: `ApplicationDbSeeder.cs`.
  - Cập nhật trang đăng nhập dùng logo HUIT, bỏ header trùng ở các trang con.

### 4.2. Kết quả kiểm chứng

| Lệnh | Kết quả |
|---|---|
| `cd web && npm test` | **6 file / 45 test pass** |
| `cd web && npm run build` | **Pass**; bundle chính 793.47 kB (201.69 kB gzip) |
| `cd web && npm run lint` | **Pass**; còn **56 warning** hooks/React, không có error |
| `cd backend && dotnet build HUIT-RoMan.sln` | **0 warning, 0 error** |
| `docker compose config --quiet` | **OK** |

### 4.3. Lỗi phát hiện trong phần WIP

- `web/src/components/HomeHero.tsx` trỏ tới `/images/huit-campus.jpg`, nhưng thư mục `web/public/images/` chỉ có:
  - `huit-library-hall.jpg`
  - `huit-reading-room.jpg`
  - `huit-study-space.jpg`
- Hậu quả: ảnh hero bị trắng khi chạy web. Cần đổi sang ảnh có sẵn hoặc bổ sung ảnh mới trước khi commit.

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
- JWT secret đang dùng giá trị mặc định trong `appsettings.json`.

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
- UI: `AdminRoomsManagementTab`, `AdminRoomTypesTab`, `AdminEquipmentsManagementTab`, `AdminEquipmentsModal`.

### 5.4. Đặt phòng

**Đã có**

- Tạo đơn một hoặc nhiều phòng; hỗ trợ đặt theo tiết HUIT và theo khung giờ.
- Kiểm tra phòng tồn tại, phòng bảo trì, trùng lịch; chặn nếu người dùng đang bị cấm mượn.
- Quy định sinh viên được enforce ở **cả backend và frontend**: chỉ phòng học nhóm/thuyết trình, 07:00–20:00, tối đa 2 giờ/lượt, không Chủ nhật, không đặt thời gian đã qua.
- Ràng buộc chống trùng lịch ở DB bằng exclusion constraint.
- Hủy đơn có kiểm tra quyền sở hữu.
- UI: `BookingPage` với 2 tab “Đặt phòng” và “Lịch sử đơn & Nhận phòng”.

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

- Lịch theo ngày/tuần, chế độ theo tiết và theo giờ.
- Matrix timeline, trạng thái phòng, badge, thống kê nhanh.
- API phòng trống gọi stored function `fn_get_available_rooms`; API lịch phòng tổng hợp bằng EF Core.
- UI: `SchedulePage`.

### 5.7. Quản lý sử dụng, check-in/check-out

**Đã có**

- Tự đồng bộ `UsageSession` cho các booking detail đã duyệt.
- Check-in bằng session ID, mã xác nhận hoặc booking detail ID.
- Kiểm tra quyền: Admin toàn quyền; Employee theo đơn vị; người dùng chỉ check-in đơn của mình.
- Hủy no-show, trả phòng kèm checklist thiết bị/vệ sinh, cập nhật trạng thái phòng và đơn.
- UI: `AdminUsageSessionsTab`, tab “Lịch sử đơn & Nhận phòng” trong `BookingPage`.

**Hạn chế**

- Một số GET (ví dụ danh sách session, summary) gọi `SyncApprovedBookingDetailsAsync()` và tạo dữ liệu — hành vi ghi trong GET, không thân thiện với cache/retry.
- `GET /api/UsageSessions/{id}` chưa kiểm tra quyền sở hữu.

### 5.8. Vi phạm & cấm mượn phòng

**Đã có**

- CRUD loại vi phạm; lập/sửa/xóa biên bản; mức độ nghiêm trọng; chế tài.
- Tự tạo lệnh cấm mượn theo số ngày (0/3/14 ngày), có thể gỡ cấm sớm kèm lý do.
- Kiểm tra eligibility trước khi đặt phòng; gỡ cấm sớm có lý do.
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
- UI: `AdminReportsTab`.

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
| Notification Center | Chỉ có entity `Notification`, chưa có API/UI |
| Nhắc lịch sắp đến/sắp kết thúc | Chưa có background service/cron |
| Feedback/đánh giá sau sử dụng | Chỉ có entity `Feedback` |
| Bảo trì thiết bị | Có entity `MaintenanceRecord`, chưa có API/UI |
| Lịch sử duyệt | Có entity `ApprovalHistory`, chưa ghi nhận |
| Mobile Flutter | Chỉ có tài liệu đặc tả trong `mobile/` |

---

## 6. ĐỐI CHIẾU 29 YÊU CẦU CỦA ĐỀ TÀI

| # | Yêu cầu | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | Thiết kế giao diện Web ReactJS | Đạt | 6 route, 13 tab quản trị; trang chủ mới đang WIP |
| 2 | Thiết kế giao diện Mobile Flutter | Chưa | 0%, chỉ có tài liệu |
| 3 | Màn hình đăng nhập, quản lý phòng, đăng ký, duyệt, thông báo | Một phần | Đủ màn hình chính; thiếu Notification Center |
| 4 | Báo cáo tiến độ | Đạt | File này |
| 5 | Backend ASP.NET Core Web API | Đạt | 15 controller, 110 endpoint |
| 6 | Quản lý danh mục: loại phòng, phòng, nhân viên, sinh viên, giảng viên | Đạt | CRUD + tìm kiếm |
| 7 | Quản lý thiết bị trong phòng | Đạt | Kho thiết bị + phân bổ theo phòng |
| 8 | API xác thực & phân quyền | Một phần | JWT/role ổn; còn lỗi lockout và reset OTP |
| 9 | Quản lý phòng | Đạt | CRUD + soft-delete |
| 10 | Quản lý trạng thái phòng | Đạt | Trống / Đang sử dụng / Bảo trì |
| 11 | Đăng ký mượn phòng | Đạt | Đa phòng, theo tiết/giờ; rule sinh viên enforce ở backend + frontend |
| 12 | Kiểm tra lịch phòng | Đạt | Lịch ngày/tuần + phòng trống |
| 13 | Duyệt đăng ký mượn phòng | Đạt | Duyệt cả đơn hoặc từng phòng |
| 14 | Gửi email thông báo kết quả duyệt | Chưa | Chưa có SMTP/MailKit |
| 15 | Quản lý quá trình sử dụng phòng | Đạt | UsageSession + check-in/out |
| 16 | Nhắc lịch sắp đến và sắp kết thúc | Chưa | Chưa có background job |
| 17 | Xác nhận trả phòng | Đạt | Checklist + cập nhật trạng thái phòng |
| 18 | Xử lý vi phạm | Đạt | Biên bản, chế tài, cấm mượn |
| 19 | Ghi nhận biên bản vi phạm | Đạt | Tự tính thời hạn cấm |
| 20 | Gửi thông báo nhắc nhở người sử dụng | Chưa | Chỉ có entity `Notification` |
| 21 | Quản lý lịch trực nhân viên | Đạt | Ca trực + nhật ký + thống kê |
| 22 | Tìm kiếm phòng, người mượn, phiếu mượn, biên bản | Đạt | API search + `Ctrl + K` |
| 23 | Thống kê, báo cáo | Đạt | 4 API + CSV + UI |
| 24 | Thống kê tình trạng sử dụng phòng | Đạt | Giờ dùng, tỷ lệ lấp đầy, leaderboard |
| 25 | Thống kê lượt mượn phòng | Đạt | Theo thời gian, trạng thái, khoa |
| 26 | Thống kê vi phạm | Đạt | Mức độ, loại, đối tượng, lệnh cấm |
| 27 | Hoàn thiện Web ReactJS và kết nối API | Đạt | Trừ phần trang chủ đang WIP |
| 28 | Mobile Flutter + chat realtime | Một phần | Chat hoàn thành; mobile 0% |
| 29 | Kiểm thử toàn hệ thống | Một phần | 45/45 unit test web; thiếu backend/E2E/tải |

**Tổng hợp:** 21 yêu cầu đạt, 4 yêu cầu một phần, 4 yêu cầu chưa triển khai.

---

## 7. KIỂM THỬ & CHẤT LƯỢNG MÃ NGUỒN

### 7.1. Đã kiểm chứng

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| Unit test frontend | **45/45 pass** | `auth`, `booking`, `schedule`, `rooms`, `home`, `homeContent` |
| Build frontend | Pass | Vite cảnh báo bundle > 500 kB |
| Lint frontend | Pass | 56 warning hooks/React, 0 error |
| Build backend | Pass | 0 warning, 0 error |
| Docker Compose config | OK | 3 service hợp lệ |

### 7.2. Phạm vi test hiện có

- Logic thuần: validate đăng nhập, validate đặt phòng, quy tắc sinh viên, chuyển đổi ngày/giờ, lịch, trạng thái phòng, thống kê trang chủ.
- Chưa có:
  - Project unit test backend.
  - Integration test API + database.
  - E2E (Playwright/Cypress).
  - Kiểm thử tải/độ ổn định.
  - Test bảo mật/phân quyền tự động.

### 7.3. Nợ kỹ thuật về chất lượng

- File UI lớn: `AdminDashboardPage.tsx` (~1.785 dòng), `AdminViolationsTab.tsx` (~1.768 dòng), `BookingPage.tsx` (~1.538 dòng), `AdminShiftsTab.tsx` (~1.186 dòng). Nên tách component/hook.
- Bundle chính ~793 kB; chưa code-splitting theo route/tab.
- Còn dùng `any`, `console.log/error` trong một số component.
- Một số service load toàn bộ dữ liệu rồi lọc/tổng hợp trong bộ nhớ (`ReportService`, `BookingService`).
- Module rỗng: `Application/Modules/Communication`, `Application/Modules/Reporting`; trang `PlaceholderHome.tsx` không còn dùng.
- Entity chưa được khai thác: `Feedback`, `Notification`, `MaintenanceRecord`, `ApprovalHistory`, `RoomTypeCondition`.

---

## 8. HẠ TẦNG & VẬN HÀNH

### 8.1. Docker Compose

| Service | Image / build | Cổng host | Ghi chú |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5433` → `5432` | Volume `postgres_data`, healthcheck |
| `api` | `backend/Dockerfile` | `5056` → `8080` | Tự migration + seed, healthcheck `/api/health` |
| `web` | `web/Dockerfile` (Nginx) | `5173` → `80` | Proxy `/api`, `/swagger`; SPA fallback; **thiếu `/hubs`** nên chat realtime không hoạt động qua Nginx |

- Chạy: `docker compose up --build -d`
- Dừng: `docker compose down`
- Reset dữ liệu: `docker compose down -v`

### 8.2. CI

- `.github/workflows/ci.yml` chạy khi push/PR vào `main`, `test`:
  - Backend: restore, build, generate migration SQL.
  - Web: `npm ci`, `npm test`, `npm run build`.
- Chưa có lint, E2E, deploy, security scan.

### 8.3. Script local

| File | Trạng thái | Đề xuất |
|---|---|---|
| `setup.bat` | Còn dùng | Giữ; sửa dòng nhắc `run-redis.bat` |
| `update-db.bat` | Còn dùng | Giữ |
| `run-backend.bat` | Còn dùng | Giữ |
| `run-web.bat` | Còn dùng | Giữ |
| `public-tunnel.bat` | Tùy nhu cầu demo | Giữ nếu cần Cloudflare Tunnel |
| `run-redis.bat` | **Lỗi thời** | Bỏ — hiện chạy toàn bộ stack, không còn Redis |
| `stop-redis.bat` | **Lỗi thời** | Bỏ — hiện tắt toàn bộ stack |

> Các file `.bat` chỉ là wrapper lệnh, không được code/CI/Dockerfile tham chiếu. Bỏ chúng không ảnh hưởng hoạt động của ứng dụng; chỉ cần cập nhật tài liệu.

### 8.4. Redis

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
| **P1** | CORS cho mọi origin + credentials; JWT secret mặc định | Tăng bề mặt tấn công | Giới hạn origin; bắt buộc secret từ env; xoay secret |
| **P1** | Quy tắc sinh viên chưa có test backend | Dễ lệch quy tắc khi sửa | Thêm unit test cho `StudentBookingPolicy` + `BookingService` |
| **P1** | Redis cấu hình nhưng không có service | Chat có thể treo/không gửi tin | Thêm Redis hoặc bỏ cấu hình |
| **P1** | Nginx không proxy `/hubs/` | Chat realtime hỏng khi chạy Docker qua web | Thêm `location /hubs/` kèm header `Upgrade`/`Connection` |
| **P1** | Chưa có test backend/E2E | Khó regression, khó nghiệm thu | Thêm project test + E2E luồng chính |
| **P1** | Thiếu email/Notification Center/nhắc lịch | Chưa đáp ứng yêu cầu 14, 16, 20 | MailKit + Notification service + background job |
| **P2** | Báo cáo tổng hợp in-memory, không phân trang | Chậm khi dữ liệu lớn | Chuyển sang query/SQL, thêm phân trang |
| **P2** | File UI quá lớn, bundle 793 kB | Khó bảo trì, tải chậm | Tách component, lazy-load theo tab |
| **P2** | Tài liệu/script lỗi thời (`project_scope`, `run-redis`, `setup.bat`) | Người mới làm sai quy trình | Cập nhật theo code hiện tại |
| **P2** | Ảnh hero `/images/huit-campus.jpg` không tồn tại | Trang chủ lỗi hình | Đổi sang ảnh có sẵn hoặc bổ sung ảnh |
| **P2** | Entity chưa dùng, module rỗng, `PlaceholderHome` | Nợ kỹ thuật | Xóa hoặc triển khai tiếp |
| **P3** | Chưa có feedback/rating, mobile | Thiếu phạm vi mở rộng | Làm sau khi ổn định Web |

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
6. Sửa ảnh hero, chạy lại test/build, commit khối WIP trang chủ.

### Giai đoạn 2 — Hoàn thiện nghiệp vụ (3–5 ngày)

1. Bổ sung test backend cho `StudentBookingPolicy` và các nhánh chính của `BookingService`.
2. Bổ sung Notification Center + email kết quả duyệt (MailKit/SMTP).
3. Bổ sung nhắc lịch sắp đến/sắp kết thúc bằng background service.
4. Cập nhật `README`, `docs/docker.md`, `project_scope`, `setup.bat`; bỏ `run-redis.bat`/`stop-redis.bat`.

### Giai đoạn 3 — Kiểm thử & tối ưu (2–3 ngày)

1. Thêm project unit/integration test cho backend.
2. Viết E2E cho luồng: đăng nhập → đặt phòng → duyệt → check-in → check-out → vi phạm → báo cáo.
3. Thêm lint/E2E vào CI.
4. Tối ưu báo cáo, phân trang, code-splitting frontend.

### Giai đoạn 4 — Mở rộng (nếu còn thời gian)

1. Feedback/rating sau sử dụng phòng.
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
dotnet build HUIT-RoMan.sln
cd ..\web
npm test
npm run build
npm run lint
```

### 11.3. Đường dẫn quan trọng

| Khu vực | Đường dẫn |
|---|---|
| Backend API | `backend/src/API/` |
| Nghiệp vụ | `backend/src/Application/Modules/` |
| Entity | `backend/src/Domain/` |
| Migration & seeder | `backend/src/Infrastructure/` |
| Stored procedure | `backend/src/Infrastructure/SQL/StoredProcedures.sql` |
| Web pages | `web/src/pages/` |
| Web admin tabs | `web/src/components/admin/` |
| Logic & test | `web/src/lib/` |
| Docker | `docker-compose.yml`, `backend/Dockerfile`, `web/Dockerfile`, `web/nginx.conf` |
| CI | `.github/workflows/ci.yml` |

### 11.4. Lịch sử cập nhật

| Ngày | Nội dung |
|---|---|
| 24/10/2026 | Viết lại toàn bộ báo cáo từ review mã nguồn; cập nhật số liệu test, rủi ro bảo mật, hiện trạng WIP và kế hoạch |
| 20/10/2026 | Báo cáo tiến độ trước đó |
