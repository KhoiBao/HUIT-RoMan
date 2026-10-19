# BÁO CÁO ĐÁNH GIÁ TIẾN ĐỘ DỰ ÁN HUIT-RoMan
**Hệ thống Quản lý Đăng ký và Khai thác Phòng Dùng Chung — Trường Đại học Công Thương TP.HCM (HUIT)**  
*Mã đề tài: CNTT-KLCN236 | Cập nhật lúc: 19/10/2026*

---

## TỔNG HỢP TIẾN ĐỘ THỰC HIỆN

| Phân hệ / Giai đoạn | Trạng thái | Đánh giá hoàn thành | Ghi chú |
|---|---|---|---|
| **Giao diện Web ReactJS** | Đã hoàn thiện cốt lõi | **95%** | Hoàn thành trang Đăng nhập, Trang chủ, Đặt phòng, Lịch phòng, Dashboard Quản trị, Duyệt phòng, Quản lý sử dụng & Trả phòng |
| **Giao diện Mobile Flutter** | Chưa triển khai | **0%** | Chưa có source code Flutter trong dự án (xem xét ưu tiên sau) |
| **Backend ASP.NET Core** | Hoàn thiện chức năng chính | **85%** | Đã hoàn thành Auth JWT, Danh mục, Phòng, Thiết bị, Đặt phòng, Duyệt đơn, Lịch phòng, Quản lý sử dụng & Trả phòng |
| **Quản lý sử dụng & Trả phòng** | Hoàn thành | **100%** | Đã xây dựng hoàn chỉnh Entity, Stored Procedure, UsageService, UsageSessionsController, AdminUsageSessionsTab |
| **Xử lý vi phạm & Lịch trực** | Chưa hoàn thiện | **15%** | Đã có Entity & Stored Procedure Database, chưa có API & UI |
| **Thống kê & Báo cáo** | Đang dở dang | **30%** | Đã có PostgreSQL Function, chưa nối API Controller & UI biểu đồ |
| **Kiểm thử toàn hệ thống** | Đang thực hiện | **45%** | Đã kiểm thử API qua Swagger & UI Web; chưa kiểm thử toàn diện E2E |

---

## BẢNG ĐÁNH GIÁ CHI TIẾT THEO YÊU CẦU

### GIAI ĐOẠN: THIẾT KẾ GIAO DIỆN & TỔNG QUAN

1. [x] **Thiết kế giao diện Web bằng ReactJS**
   - **Hiện trạng:** Hoàn thành.
   - **Chi tiết:** Xây dựng bằng React 19, TypeScript, Vite. Giao diện thiết kế theo nhận diện HUIT, hiện đại, hỗ trợ tương thích đa màn hình.
   - **Minh chứng:** Thư mục `web/src/pages/`, `web/src/components/`, `web/src/App.tsx`.

2. [ ] **Thiết kế giao diện Mobile bằng Flutter**
   - **Hiện trạng:** Chưa thực hiện.
   - **Chi tiết:** Trong repository hiện tại chưa có thư mục/mã nguồn Flutter (`mobile/`). Tài liệu phạm vi (`docs/project_scope.markdown`) xếp vào danh mục phát triển sau nếu còn thời gian.

3. [x] **Thiết kế giao diện đăng nhập, quản lý phòng, đăng ký phòng, duyệt phòng, thông báo....**
   - **Hiện trạng:** Hoàn thành các màn hình cốt lõi (~85%).
     - [x] Đăng nhập: `web/src/pages/LoginPage.tsx`, modal quên mật khẩu `ForgotPasswordModal.tsx`.
     - [x] Quản lý phòng: `web/src/components/admin/AdminRoomsManagementTab.tsx`, `AdminRoomTypesTab.tsx`, `AdminEquipmentsManagementTab.tsx`.
     - [x] Đăng ký mượn phòng: `web/src/pages/BookingPage.tsx` (chọn theo tiết/giờ, chọn phòng trống, form xác nhận).
     - [x] Duyệt phòng: `web/src/components/admin/AdminBookingApprovalTab.tsx` (duyệt/từ chối cả đơn hoặc từng phòng).
     - [ ] Thông báo tập trung: Mới có thanh thông báo trạng thái `StatusStrip.tsx` và toast notification; chưa có màn hình Notification Center riêng biệt.

4. [x] **Báo cáo tiến độ**
   - **Hiện trạng:** Hoàn thành.
   - **Chi tiết:** Đã tổng hợp đối soát hiện trạng mã nguồn và cập nhật bảng theo dõi tiến độ chi tiết tại `tienDo.md`.

---

### TUẦN 6: BACKEND CỐT LÕI, QUẢN LÝ DANH MỤC, THIẾT BỊ, XÁC THỰC & PHÂN QUYỀN

5. [x] **Xây dựng Backend ASP.NET Core Web API**
   - **Hiện trạng:** Hoàn thành.
   - **Chi tiết:** Dự án ASP.NET Core 8 Web API tổ chức theo kiến trúc Clean Architecture / Modular Monolith (`API`, `Application`, `Domain`, `Infrastructure`), kết nối PostgreSQL qua EF Core, Swagger UI, Global Soft-Delete filter.
   - **Minh chứng:** `backend/src/API/`, `backend/src/Application/`, `backend/src/Infrastructure/`.

6. [x] **Xây dựng chức năng quản lý danh mục: loại phòng, phòng, nhân viên, sinh viên, giảng viên**
   - **Hiện trạng:** Hoàn thành toàn diện cả Backend API và Web Admin UI.
     - [x] Loại phòng: `RoomTypesController.cs`, `RoomTypeService.cs`, UI `AdminRoomTypesTab.tsx`.
     - [x] Phòng: `RoomsController.cs`, `RoomService.cs`, UI `AdminRoomsManagementTab.tsx`.
     - [x] Đơn vị / Khoa ban: `DepartmentsController.cs`, `DepartmentService.cs`, UI `AdminDepartmentsTab.tsx`.
     - [x] Nhân viên: `EmployeesController.cs`, `EmployeeService.cs`, UI `AdminEmployeesTab.tsx`.
     - [x] Sinh viên & Giảng viên: `UsersController.cs` (`/students`, `/lecturers`), `UserService.cs`, UI `AdminUsersTab.tsx`.

7. [x] **Xây dựng quản lý thiết bị trong phòng**
   - **Hiện trạng:** Hoàn thành.
   - **Chi tiết:**
     - Phân loại danh mục thiết bị: `EquipmentCategoriesController.cs`.
     - Quản lý kho thiết bị: `EquipmentsController.cs` (quản lý tổng số lượng, số lượng sẵn sàng, đã phân bổ).
     - Phân bổ / thu hồi thiết bị trong từng phòng: `RoomsController.cs` (`GET/POST/DELETE /api/Rooms/{roomId}/equipments`), `RoomEquipmentService.cs`.
     - Giao diện quản lý thiết bị: `AdminEquipmentsManagementTab.tsx`, `AdminEquipmentsModal.tsx`.

8. [x] **Xây dựng API xác thực và phân quyền**
   - **Hiện trạng:** Hoàn thành.
   - **Chi tiết:**
     - Xác thực JWT Bearer: `AuthController.cs` (`POST /api/Auth/login`) đăng nhập bằng email `@huit.edu.vn`.
     - Phân quyền theo 4 Role kỹ thuật: `Admin`, `Employee`, `Student`, `Lecturer` tương ứng 3 nhóm hiển thị (Quản trị hệ thống, Nhân sự, Người dùng).
     - Quản lý trạng thái khóa/mở tài khoản (`Active`, `Inactive`, `Suspended`) kiểm tra trực tiếp khi đăng nhập.
     - Frontend tích hợp Auth Context, bảo vệ route (`RequireAuth`, `RequireStaff`).

---

### TUẦN 7: QUẢN LÝ PHÒNG, TRẠNG THÁI, ĐĂNG KÝ MƯỢN PHÒNG & LỊCH PHÒNG

9. [x] **Xây dựng chức năng quản lý phòng**
   - **Hiện trạng:** Hoàn thành.
   - **Chi tiết:** CRUD đầy đủ thông tin phòng (mã phòng, tên phòng, tòa nhà, tầng, sức chứa, loại phòng, ghi chú) trên API và giao diện Web. Hỗ trợ xóa mềm (Soft-Delete) đảm bảo an toàn dữ liệu.
   - **Minh chứng:** `RoomsController.cs`, `RoomService.cs`, `AdminRoomsManagementTab.tsx`.

10. [x] **Quản lý trạng thái: phòng trống, đang sử dụng, đang bảo trì**
    - **Hiện trạng:** Hoàn thành.
    - **Chi tiết:**
      - Model `Room.cs` có trường `Status` (`Trống`/`Available`, `Đang sử dụng`/`InUse`, `Bảo trì`/`Maintenance`).
      - API cập nhật trạng thái phòng: `PATCH /api/Rooms/{id}/status`.
      - Stored Procedure: `sp_update_room_status`.
      - Ràng buộc nghiệp vụ: Chặn không cho phép đăng ký mượn phòng đang ở trạng thái `Bảo trì` (`BookingService.cs:52`).

11. [x] **Xây dựng chức năng đăng ký mượn phòng**
    - **Hiện trạng:** Hoàn thành.
    - **Chi tiết:**
      - API: `POST /api/Bookings`. Cho phép đặt 1 hoặc nhiều phòng trong một đơn mượn.
      - Hỗ trợ cả 2 hình thức: Theo tiết học HUIT (`IsBookingByPeriod = true`) hoặc theo khung thời gian thực tế (`startTime` - `endTime`).
      - Tự động kiểm tra điều kiện người mượn và kiểm tra xung đột trùng lịch phòng bằng PostgreSQL Function `fn_check_booking_conflict`.
      - Giao diện đặt phòng: `web/src/pages/BookingPage.tsx` có form validation đầy đủ (`web/src/lib/booking.ts`).

12. [x] **Xây dựng chức năng kiểm tra lịch phòng**
    - **Hiện trạng:** Hoàn thành.
    - **Chi tiết:**
      - API tra cứu lịch phòng: `GET /api/Bookings/rooms/{roomId}/schedule` & `GET /api/Rooms/{id}/schedule`.
      - Danh mục tiết học chuẩn HUIT: `GET /api/Bookings/periods`.
      - Lấy danh sách phòng trống trong khoảng thời gian: `GET /api/Rooms/available` (gọi PostgreSQL Function `fn_get_available_rooms`).
      - Giao diện tra cứu lịch trực quan theo ngày/tuần: `web/src/pages/SchedulePage.tsx`.

---

### TUẦN 8: DUYỆT ĐĂNG KÝ, THÔNG BÁO EMAIL, QUÁ TRÌNH SỬ DỤNG & TRẢ PHÒNG

13. [x] **Xây dựng chức năng duyệt đăng ký mượn phòng**
    - **Hiện trạng:** Hoàn thành.
    - **Chi tiết:**
      - Duyệt/từ chối toàn bộ đơn: `PATCH /api/Bookings/{id}/approve` (gọi `sp_approve_booking`).
      - Duyệt/từ chối từng chi tiết phòng: `PATCH /api/Bookings/details/{detailId}/approve`. Tự động tính toán lại trạng thái đơn (`Đã duyệt`, `Duyệt một phần`, `Từ chối`).
      - Giao diện duyệt đơn cho Nhân sự / Quản trị: `AdminBookingApprovalTab.tsx` hỗ trợ lọc theo trạng thái, tìm kiếm, nhập lý do từ chối.

14. [ ] **Gửi email thông báo kết quả duyệt**
    - **Hiện trạng:** Chưa thực hiện.
    - **Chi tiết:** Hệ thống chưa cấu hình SMTP/MailKit và chưa có Email Service gửi email tự động khi đơn đăng ký được duyệt hoặc từ chối. (Thuộc danh mục `Should Have` trong `docs/project_scope.markdown`).

15. [x] **Quản lý quá trình sử dụng phòng**
    - **Hiện trạng:** Hoàn thành.
    - **Chi tiết:** Đã xây dựng hoàn chỉnh phân hệ `Usage`:
      - **DTOs:** `UsageSessionDto`, `CheckInRequestDto`, `UsageSummaryDto`, `UsageSessionQueryDto` trong `UsageDTOs.cs`.
      - **Service:** `IUsageService` & `UsageService.cs` quản lý phiên sử dụng phòng thực tế, tra cứu theo mã xác nhận (`ConfirmationCode`), lọc theo đơn vị/khoa của nhân sự, Check-in bắt đầu sử dụng, kiểm tra phân quyền (Admin, Employee quản lý tại quầy; Student, Lecturer tự check-in đơn của mình), hủy do No-show quá 15 phút.
      - **API Controller:** `UsageSessionsController.cs` cung cấp các endpoint:
        - `GET /api/UsageSessions`: Lấy danh sách phiên sử dụng có lọc và tìm kiếm (Admin/Employee).
        - `GET /api/UsageSessions/active`: Theo dõi các phòng đang sử dụng thời gian thực.
        - `GET /api/UsageSessions/summary`: Thống kê nhanh tình hình sử dụng phòng hôm nay.
        - `GET /api/UsageSessions/my`: Người dùng tra cứu lịch sử mượn phòng cá nhân.
        - `GET /api/UsageSessions/code/{code}`: Tra cứu thông tin phiên bằng mã xác nhận.
        - `POST /api/UsageSessions/check-in`: Thực hiện nhận phòng / Check-in (cho cả người dùng tự nhận và nhân sự check-in tại quầy).
        - `PATCH /api/UsageSessions/{id}/no-show`: Hủy ca do quá giờ không nhận phòng.
      - **Web UI:**
        - **Admin / Nhân sự:** Component `AdminUsageSessionsTab.tsx` tích hợp vào `AdminDashboardPage.tsx` với 4 card KPI thời gian thực, bảng quản lý phiên, bộ lọc trạng thái và modal Check-in nhanh bằng mã xác nhận.
        - **Người dùng (Sinh viên, Giảng viên):** Màn hình `BookingPage.tsx` tab "Lịch sử đơn & Nhận phòng" cho phép:
          - Nhập mã nhận phòng (`HUIT-xxxxx`) để nhận phòng nhanh.
          - Tự bấm nút "Check-in nhận phòng ngay" trực tiếp trên từng phòng đã duyệt (1-click nhận phòng).
          - Banner nhắc nhở phòng sẵn sàng nhận trên `HomePage.tsx`.

16. [ ] **Nhắc lịch sắp đến và sắp kết thúc**
    - **Hiện trạng:** Chưa thực hiện.
    - **Chi tiết:** Chưa xây dựng Background Service / Cron Job (Hangfire/Quartz.NET) để tự động quét lịch mượn phòng và kích hoạt nhắc lịch trước thời điểm bắt đầu/kết thúc ca mượn.

17. [x] **Xác nhận trả phòng**
    - **Hiện trạng:** Hoàn thành.
    - **Chi tiết:**
      - **Backend API:** `POST /api/UsageSessions/check-out` tiếp nhận yêu cầu trả phòng kèm biên bản khảo sát hiện trạng (thiết bị, vệ sinh, ngắt điện). Hỗ trợ cả nhân sự tiếp nhận bàn giao và người dùng tự bấm trả phòng khi kết thúc ca. Cập nhật `ActualCheckOut`, đổi trạng thái phiên và chi tiết đặt phòng thành `Hoàn thành`. Cập nhật trạng thái phòng về `Trống` (hoặc `Bảo trì` nếu phát hiện hỏng hóc thiết bị, lưu ghi chú vào `Room.Description`). Tự động hoàn tất đơn cha nếu tất cả các phòng trong đơn đã trả xong. Kết nối đồng bộ với PostgreSQL Procedure `sp_process_room_checkout`.
      - **Web UI:**
        - **Admin / Nhân sự:** Modal "Khảo sát hoàn tất & Xác nhận trả phòng" trên `AdminUsageSessionsTab.tsx` và `AdminDashboardPage.tsx`, cho phép nhân sự tích chọn biên bản kiểm tra thiết bị, chọn tình trạng phòng bàn giao (Trống / Bảo trì), nhập ghi chú tiếp nhận và xác nhận hoàn tất.
        - **Người dùng:** Modal xác nhận trả phòng trực tiếp trên `BookingPage.tsx` với checklist kiểm tra thiết bị, đèn, điều hòa và vệ sinh trước khi rời phòng.

---

### TUẦN 9: XỬ LÝ VI PHẠM, LỊCH TRỰC NHÂN VIÊN & TÌM KIẾM NÂNG CAO

18. [ ] **Xây dựng chức năng xử lý vi phạm**
    - **Hiện trạng:** Chưa hoàn thiện (Mới có Database Entity & Stored Procedure).
    - **Chi tiết:** Đã có Entity `ViolationRecord.cs`, `ViolationType.cs`, `UserRestriction.cs` và thủ tục `sp_record_violation_and_restrict`, nhưng chưa có Service/Controller quản lý vi phạm trên Backend.

19. [ ] **Ghi nhận biên bản vi phạm**
    - **Hiện trạng:** Chưa hoàn thiện (Chưa có API & UI).
    - **Chi tiết:** Chưa có API endpoint và màn hình giao diện cho phép nhân sự lập biên bản ghi nhận vi phạm và áp dụng hình thức phạt (cấm mượn phòng).

20. [ ] **Gửi thông báo nhắc nhở người sử dụng**
    - **Hiện trạng:** Chưa thực hiện.
    - **Chi tiết:** Đã có Entity `Notification.cs` trong Domain nhưng chưa có Controller/Service tạo và đẩy thông báo.

21. [ ] **Quản lý lịch trực của nhân viên**
    - **Hiện trạng:** Chưa thực hiện.
    - **Chi tiết:** Đã có Entity `Shift.cs`, `ShiftLog.cs` trong Domain nhưng chưa có API Controller và giao diện phân ca/xếp lịch trực cho nhân sự.

22. [ ] **Xây dựng chức năng tìm kiếm phòng, người mượn, phiếu mượn, biên bản vi phạm**
    - **Hiện trạng:** Hoàn thành một phần (Đạt ~65%).
      - [x] Tìm kiếm phòng: Tìm theo tên, mã phòng, tòa nhà, tầng, loại phòng, sức chứa trên API (`RoomsController.cs`) và UI (`AdminRoomsManagementTab.tsx`, `BookingPage.tsx`, `SchedulePage.tsx`).
      - [x] Tìm kiếm người mượn: Tìm theo họ tên, email, mã số trên API (`UsersController.cs`) và UI (`AdminUsersTab.tsx`).
      - [x] Tìm kiếm phiếu mượn: Tìm theo mã đơn, hoạt động, phòng, người đặt trên UI (`AdminBookingApprovalTab.tsx`).
      - [ ] Tìm kiếm biên bản vi phạm: Chưa có vì phân hệ vi phạm chưa hoàn thành.

---

### TUẦN 10: THỐNG KÊ, BÁO CÁO & HOÀN THIỆN WEB REACTJS

23. [ ] **Xây dựng chức năng thống kê, báo cáo**
    - **Hiện trạng:** Chưa hoàn thiện (Đã có SQL Function trong Database, chưa có API & UI).
    - **Chi tiết:** Đã viết PostgreSQL Function `fn_get_booking_summary` và phương thức `GetBookingSummaryAsync` trong `StoredProcedureService.cs`, nhưng chưa tạo Controller (`ReportsController`) để cung cấp dữ liệu cho giao diện.

24. [ ] **Thống kê tình trạng sử dụng phòng**
    - **Hiện trạng:** Chưa hoàn thiện (Mới có hàm tính toán `total_rooms_used` ở DB, chưa có API và biểu đồ Web).

25. [ ] **Thống kê lượt mượn phòng**
    - **Hiện trạng:** Chưa hoàn thiện (Đã tính các chỉ số tổng đơn, đã duyệt, từ chối, chờ duyệt, đã hủy ở DB function, chưa có API và UI hiển thị).

26. [ ] **Thống kê vi phạm**
    - **Hiện trạng:** Chưa thực hiện (Chưa có procedure hay chức năng thống kê số liệu vi phạm).

27. [x] **Hoàn thiện Web ReactJS và kết nối API**
    - **Hiện trạng:** Hoàn thành các phân hệ cốt lõi.
    - **Chi tiết:** Giao diện Web ReactJS đã kết nối hoàn chỉnh với ASP.NET Core API cho các tính năng: Đăng nhập JWT, Đặt phòng theo tiết/giờ, Tra cứu lịch phòng theo ngày/tuần, Quản lý đơn vị, Quản lý loại phòng, Quản lý phòng & thiết bị phòng, Quản lý kho thiết bị, Quản lý người dùng, Duyệt đơn mượn phòng. (Các chức năng chưa kết nối là các module Backend chưa có API: Báo cáo thống kê, Check-in/out, Vi phạm).

---

### TUẦN 11: ỨNG DỤNG MOBILE FLUTTER & KIỂM THỬ TOÀN HỆ THỐNG

28. [ ] **Xây dựng và hoàn thiện ứng dụng Mobile Flutter**
    - [ ] Đăng ký mượn phòng: Chưa thực hiện
    - [ ] Xem kết quả duyệt: Chưa thực hiện
    - [ ] Xem lịch sử sử dụng: Chưa thực hiện
    - [ ] Nhận thông báo: Chưa thực hiện
    - [ ] Chat với nhân viên trực: Chưa thực hiện (Ngoài phạm vi đồ án / Dropped)
    - [ ] Gửi phản hồi, đánh giá: Chưa thực hiện (Mới có Entity `Feedback.cs`)
    - **Hiện trạng:** Chưa thực hiện. Trong repo chưa có mã nguồn Flutter.

29. [ ] **Kiểm thử toàn hệ thống**
    - **Hiện trạng:** Đang thực hiện / Chưa hoàn thành.
    - **Chi tiết:** Đã kiểm thử chức năng từng phần (Manual/Unit test API qua Swagger và luồng nghiệp vụ trên Web). Cần kiểm thử tích hợp (E2E), kiểm thử tải và hoàn thiện các module còn lại trước khi nghiệm thu.

---

## KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO (ĐỀ XUẤT)

1. **Ưu tiên 1 (Tuần 8 & 10 - Backend API):**
   - Viết `UsageController` & `UsageService` cho nghiệp vụ Check-in / Check-out (sử dụng proc `sp_process_room_checkout`).
   - Viết `ReportsController` kết nối với Stored Procedure `fn_get_booking_summary` để hoàn thiện chức năng Thống kê, Báo cáo số liệu mượn phòng.
   - Thêm tab "Báo cáo thống kê" trực quan trên Web Admin.

2. **Ưu tiên 2 (Tuần 9 - Xử lý vi phạm & Email):**
   - Xây dựng `ViolationsController` và giao diện lập biên bản vi phạm, xử lý cấm mượn phòng.
   - Cấu hình Email Service (MailKit/SMTP) tự động gửi email thông báo kết quả duyệt đơn.

3. **Ưu tiên 3 (Tuần 11 - Mobile / Hoàn thiện):**
   - Tùy theo thời gian còn lại của đồ án, xem xét khởi tạo dự án Flutter Mobile cho các chức năng cơ bản (Xem lịch, Đăng ký, Nhận kết quả) hoặc tập trung hoàn thiện 100% trải nghiệm Web Responsive trên thiết bị di động.
