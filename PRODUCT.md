# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Người dùng chính — sinh viên và giảng viên** (role backend `Student`, `Lecturer`): tìm phòng còn trống, đặt theo tiết hoặc theo giờ, theo dõi trạng thái đơn (chờ duyệt / duyệt một phần / từ chối), nhận phòng trong cửa sổ 15 phút trước giờ bắt đầu, trả phòng kèm checklist hiện trạng, hủy đơn có lý do, xem lịch phòng, xem thông báo.

**Nhân sự** (`Employee`: thủ thư Thư viện, quản lý phòng Phòng Đào tạo): duyệt từng phòng hoặc cả đơn, check-in hộ, ghi vi phạm và lệnh cấm, quản lý ca trực, xử lý no-show.

**Quản trị hệ thống** (`Admin`): danh mục phòng / loại phòng / thiết bị, tài khoản và phân quyền, báo cáo thống kê.

## Product Purpose

Hệ thống quản lý phòng dùng chung HUIT quản lý việc đăng ký và khai thác phòng dùng chung tại Trường Đại học Công Thương TP.HCM (HUIT): thay sổ đăng ký và trao đổi thủ công bằng một luồng đặt phòng có duyệt, có kiểm soát sử dụng thực tế và có báo cáo khai thác. Thành công = luồng end-to-end (đăng nhập → đặt → duyệt → nhận phòng → trả phòng → xử lý vi phạm → báo cáo) chạy trơn tru khi demo và đủ chắc để thư viện / Phòng Đào tạo dùng thử thật.

## Positioning

Mô hình đặt phòng bám theo **khung tiết học của HUIT** thay vì khung giờ chung: phòng lý thuyết và phòng thực hành có bộ 16 tiết riêng, đơn đặt theo `startPeriodId/endPeriodId` hoặc theo giờ. Kèm theo là **duyệt ở cấp từng phòng trong đơn** (một đơn nhiều phòng có thể được duyệt một phần), **ma trận quyền đặt phòng theo vai trò** (sinh viên chỉ đặt phòng học nhóm/thuyết trình; giảng viên thêm phòng lý thuyết, thực hành, hội thảo), và **tự động hủy no-show** khi quá giờ mà chưa check-in. Một công cụ đặt phòng chung chung không thể sao chép nguyên xi các ràng buộc này.

## Operating Context

- Đồ án nội bộ mã CNTT-KLCN236, nhóm 3 người, thời hạn 08/11/2026; báo cáo tiến độ 28/10/2026 ghi nhận ~95% hoàn thành.
- Danh mục phòng seed theo mô hình HUIT: 11 phòng thực hành A101–A111 và các phòng lý thuyết A201–A511 / B201–B511.
- Tài khoản demo do seeder tạo sẵn, đăng nhập bằng email `@huit.edu.vn`; không có đăng ký tự do.
- Chạy bằng Docker Compose hoặc các script `.bat` ở root; API `http://localhost:5056`, web `http://localhost:5173`.
- Quy trình nhận phòng: chỉ check-in trong cửa sổ `[T − 15 phút, T)`; quá T chưa check-in thì background service tự hủy, ghi lý do `NO_SHOW`, giải phóng phòng và tạo thông báo.
- Hai bề mặt: portal web cho máy tính và app Flutter cho Android/iOS (bề mặt thứ hai mới có đặc tả, chưa có code).

## Capabilities and Constraints

- 3 nhóm hiển thị trên UI (Quản trị / Nhân sự / Người dùng) ánh xạ từ 4 role backend (`Admin`, `Employee`, `Student`, `Lecturer`).
- Đã có: xác thực JWT, quản lý người dùng, phòng/thiết bị, đặt phòng, duyệt, lịch phòng, check-in/out, vi phạm, ca trực, báo cáo, feedback/đánh giá, Notification Center và chat realtime.
- Soft-delete là bắt buộc: cấm hard-delete; xóa mềm kèm global filter ở EF và lọc `IsDeleted = FALSE` trong stored procedure.
- Web: React 19 + TypeScript + Vite, react-router-dom, axios, SignalR. UI copy tiếng Việt, tên biến/hàm tiếng Anh; logic thuần đặt trong `src/lib/` kèm test; route theo nhóm `/admin`, `/staff`, `/home`.
- Backend: ASP.NET Core 8, EF Core, PostgreSQL; response chuẩn `{ success, message, data }`; JWT sống 7 ngày, chưa có refresh/logout.
- Đang thiếu / chưa chắc: email thông báo qua SMTP, OTP reset mật khẩu an toàn, kiểm tra tài khoản bị khóa khi đăng nhập, E2E và kiểm thử tải.
- App Flutter cho Android/iOS chưa có mã nguồn; đặc tả chức năng nằm ở `mobile/*.md`, design system dự kiến ở `mobile/design-system.md`.

## Brand Commitments

- Tên hiển thị **Hệ thống quản lý phòng dùng chung HUIT**; không dùng tên riêng "RoMan" trên bất kỳ bề mặt người dùng nào.
- Gắn với Trường Đại học Công Thương TP.HCM (HUIT); toàn bộ UI copy dùng tiếng Việt.
- Không tự đặt ra khẩu hiệu, số liệu, khách hàng hay cam kết dịch vụ không có thật.

## Evidence on Hand

- Tài liệu nghiệp vụ và phạm vi có thật: `docs/nghiep-vu.md`, `docs/project_scope.markdown`, `docs/api.md`, `tienDo.md` (báo cáo tiến độ kèm số liệu build/test).
- Dữ liệu demo có thật: tài khoản seed trong `backend/account.md`, danh mục phòng seed trong DB.
- Test hiện có: backend 78 test, web 89 test (theo báo cáo tiến độ 28/10/2026).
- Chưa có: testimonial, khách hàng thật, số liệu sử dụng thực tế, ảnh chụp sản phẩm dùng trong marketing — không được bịa các nội dung này.

## Product Principles

1. **Người dùng là trung tâm**: mọi quyết định ưu tiên đường đi của sinh viên/giảng viên — tìm phòng, đặt, biết đơn đang ở đâu, nhận và trả phòng.
2. **UI phải trung thực với nghiệp vụ**: ràng buộc do backend quyết (ma trận quyền, cửa sổ check-in, trạng thái đơn) phải hiện rõ trước khi người dùng hành động, không để họ phát hiện qua lỗi.
3. **Một việc mỗi màn hình, tiếng Việt rõ ràng, ít thao tác**: đặc biệt với các luồng có hạn giờ như check-in và đặt phòng theo tiết.
4. **Chỉ dùng dữ liệu thật của trường**: danh mục phòng, tiết học, tài khoản, vi phạm đều lấy từ mô hình HUIT đã seed.
5. **Ưu tiên giá trị trong hạn 08/11/2026**: chọn thay đổi giúp demo end-to-end thuyết phục và vận hành thật ổn định, không mở rộng phạm vi.
