# 01 — Khảo sát hiện trạng và phạm vi hệ thống

> Đề tài: **Xây dựng hệ thống quản lý đăng ký và khai thác phòng dùng chung tại Trường Đại học Công Thương Thành phố Hồ Chí Minh** (CNTT-KLCN236).
> Tài liệu này là đầu vào cho các tài liệu 02–06 trong cùng thư mục.

## 1. Thông tin đề tài

| Mục | Nội dung |
|---|---|
| Mã đề tài | CNTT-KLCN236 |
| GVHD | Trần Thị Vân Anh |
| Nhóm thực hiện | Nguyễn Bảo Khôi (2001230417), Nguyễn Lê Đăng Khoa (2001230399), Nguyễn Thị Anh Thư (2001230958) |
| Thời gian | 12 tuần, 17/08/2026 – 08/11/2026 |
| Hệ quản trị CSDL | PostgreSQL 16 |
| Công nghệ | ASP.NET Core 8 (C#), ReactJS + TypeScript, Flutter |
| Nền tảng | Web (quản trị, nhân sự, người dùng) và Mobile (sinh viên, giảng viên) |

## 2. Phạm vi khảo sát

Hệ thống phục vụ hoạt động **đăng ký và khai thác phòng dùng chung** tại HUIT, tập trung vào hai đơn vị vận hành:

- **Thư viện HUIT**: phòng học nhóm, phòng thuyết trình; có khung giờ phục vụ riêng theo ngày.
- **Phòng Đào tạo**: phòng lý thuyết, phòng thực hành, hội trường/hội thảo; đặt theo **tiết học cố định** của trường.

Danh mục phòng seed theo mô hình HUIT: 11 phòng thực hành A101–A111 và các phòng lý thuyết A201–A511, B201–B511.

Ngoài phạm vi: quản lý lịch học chính quy, tính lương nhân viên, kế toán, điểm danh lớp học tín chỉ.

## 3. Tác nhân và ánh xạ vai trò

| Tác nhân nghiệp vụ | Mô tả | Vai trò backend | Nhóm UI |
|---|---|---|---|
| Sinh viên | Đặt phòng học nhóm/thuyết trình, nhận và trả phòng | `Student` | Người dùng |
| Giảng viên | Đặt thêm phòng lý thuyết, thực hành, hội thảo/hội trường | `Lecturer` | Người dùng |
| Nhân viên thư viện / Phòng Đào tạo | Duyệt đơn, check-in hộ, trả phòng, ghi vi phạm, trực ca, chat | `Employee` | Nhân sự |
| Quản lý đơn vị | Duyệt cấp cao hơn, cấu hình duyệt tự động, báo cáo | `Manager` | Quản trị |
| Quản trị hệ thống | Danh mục, tài khoản, phân quyền, cấu hình, báo cáo toàn trường | `Admin` | Quản trị |
| Hệ thống (tác nhân phụ) | Gửi email/OTP, nhắc lịch, tự động hủy no-show | tài khoản hệ thống `system.auto-approve` | — |

Không có đăng ký tự do. Tài khoản do quản trị tạo hoặc seeder tạo sẵn, đăng nhập bằng MSSV/mã cán bộ hoặc email `@huit.edu.vn`.

## 4. Hiện trạng quy trình (trước khi có hệ thống)

Mô tả dưới đây tổng hợp từ đề cương và khảo sát nhóm; các con số vận hành cụ thể chưa được thu thập nên không đưa vào tài liệu.

### 4.1 Luồng đăng ký – duyệt – sử dụng – trả phòng

1. Người có nhu cầu điền **phiếu đăng ký phòng** (giấy hoặc email) gửi Thư viện/Phòng Đào tạo.
2. Nhân viên **tra sổ/ lịch phòng** để kiểm tra trùng lịch, trả lời thủ công.
3. Đơn được duyệt hoặc từ chối qua email/điện thoại; không có lịch sử quyết định tập trung.
4. Người dùng đến quầy nhận phòng, ký **biên bản bàn giao**.
5. Khi trả phòng, nhân viên kiểm tra hiện trạng, ghi nhận hư hỏng (nếu có).
6. Vi phạm được ghi vào sổ theo dõi; việc khóa quyền đăng ký dựa trên đếm tay.
7. Cuối kỳ, nhân viên tổng hợp báo cáo từ sổ và file Excel rời rạc.

### 4.2 Vấn đề của hiện trạng

| Mã | Vấn đề | Hệ quả |
|---|---|---|
| P1 | Kiểm tra trùng lịch thủ công | Hai đơn cùng phòng, cùng giờ vẫn có thể được duyệt |
| P2 | Không có trạng thái đơn tập trung | Người dùng không biết đơn đang ở bước nào |
| P3 | Không kiểm soát người không đến | Phòng bị giữ nhưng bỏ trống (no-show) |
| P4 | Dữ liệu vi phạm rời rạc | Khó khóa quyền công bằng, khó tra cứu |
| P5 | Báo cáo thủ công | Không đo được tần suất sử dụng, tỷ lệ phòng trống theo thời điểm |
| P6 | Không có kênh trao đổi chính thức | Người dùng phải gọi điện/đến trực tiếp |

## 5. Biểu mẫu liên quan và ánh xạ dữ liệu

| Biểu mẫu hiện trạng | Nội dung chính | Bảng dữ liệu đích |
|---|---|---|
| Phiếu đăng ký phòng | Người đăng ký, hoạt động, phòng, tiết/giờ, số người, mục đích | `Bookings`, `BookingDetails` |
| Sổ theo dõi duyệt | Người duyệt, thời điểm, ý kiến | `ApprovalHistories`, `ApprovalSteps` (bổ sung) |
| Biên bản bàn giao phòng | Giờ nhận, số người thực tế, hiện trạng thiết bị | `UsageSessions`, `UsageConditions` |
| Phiếu gia hạn | Giờ kết thúc cũ/mới, người yêu cầu | `BookingExtensions` |
| Biên bản vi phạm | Loại vi phạm, mức độ, hình phạt, người lập | `ViolationRecords`, `ViolationTypes` |
| Sổ trực | Ca, nhân viên, nhật ký phát sinh | `Shifts`, `EmployeeShift`, `ShiftLogs` |
| Sổ tài sản/hư hỏng | Thiết bị, tình trạng trước/sau, sửa chữa | `Equipments`, `RoomEquipments`, `EquipmentConditionLogs`, `MaintenanceRecords` |
| Báo cáo khai thác | Tần suất sử dụng, tỷ lệ trống, lượt mượn, vi phạm | Truy vấn báo cáo trên các bảng trên |

## 6. Yêu cầu chức năng theo đề cương

| Nhóm | Yêu cầu | Nền tảng |
|---|---|---|
| Cơ bản | Đăng nhập, đăng xuất, đổi mật khẩu, phân quyền người dùng | Web, Mobile |
| Danh mục | Quản lý danh mục thiết bị; thiết bị theo từng phòng; theo dõi sử dụng, tình trạng, ghi nhận hư hỏng/sửa chữa | Web |
| Phòng | Quản lý trạng thái phòng (trống, đang sử dụng, bảo trì); đăng ký sử dụng; kiểm tra phòng trống; kiểm tra trùng lịch | Web, Mobile |
| Duyệt | Duyệt/từ chối; quy trình duyệt nhiều cấp; điều chỉnh phòng hoặc thời gian; thông báo kết quả qua email và app | Web |
| Sử dụng | Nhắc nhở vi phạm nội quy; nhắc sắp đến/sắp kết thúc; xác nhận nhận/trả phòng kèm ghi nhận bất thường; gia hạn | Web, Mobile |
| Điểm danh | Điểm danh bằng QR code; tổng hợp, báo cáo kết quả điểm danh | Web, Mobile |
| Vi phạm | Xử lý vi phạm; khóa quyền đăng ký với cá nhân vi phạm nhiều lần | Web |
| Trực | Quản lý lịch trực nhân viên; ghi nhận nhật ký trực | Web |
| Tìm kiếm | Phòng, người mượn, phiếu mượn, biên bản vi phạm | Web |
| Báo cáo | Tần suất phòng được sử dụng; tỷ lệ phòng trống theo từng thời điểm | Web |
| Mobile | Tra cứu phòng trống, đăng ký, gia hạn, theo dõi trạng thái, lịch sử đăng ký/sử dụng/vi phạm | Mobile |
| Mobile | Nhận thông báo tình hình sử dụng phòng; chat với nhân viên trực; gửi phản hồi đánh giá | Mobile |

## 7. Quy tắc nghiệp vụ

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-01 | Người dùng đăng nhập bằng MSSV/mã cán bộ/email HUIT; không tự đăng ký; tài khoản bị khóa không được đăng nhập | Đề cương, code |
| BR-02 | Quyền đặt phòng theo vai trò và loại phòng: sinh viên chỉ đặt phòng học nhóm/thuyết trình; giảng viên thêm phòng lý thuyết, thực hành, hội thảo, hội trường | Đề cương, `BookingRoomPermissionPolicy` |
| BR-03 | Sinh viên chỉ đặt trong khung 07:00–20:00, tối đa 2 giờ/lượt, không đặt Chủ Nhật, không đặt giờ đã qua, tối đa trước 14 ngày, mỗi lượt trong cùng một ngày | Code |
| BR-04 | Một phòng không thể có hai chi tiết đặt phòng trùng khoảng thời gian còn hiệu lực; ràng buộc được bảo vệ ở tầng CSDL | Code |
| BR-05 | Đơn có thể gồm nhiều phòng; duyệt/từ chối ở cấp từng phòng; đơn có thể ở trạng thái “Duyệt một phần” | Đề cương, code |
| BR-06 | Người dùng chỉ nhận phòng trong cửa sổ `[T−15 phút, T)`; nhân viên được check-in hộ theo đơn vị quản lý | Code |
| BR-07 | Quá thời điểm T mà chưa nhận phòng, hệ thống tự hủy với lý do `NO_SHOW`, giải phóng phòng và tạo thông báo | Code |
| BR-08 | Mỗi chi tiết đặt phòng có tối đa một phiên sử dụng còn hiệu lực | Code |
| BR-09 | Phòng đang bảo trì không được nhận phòng | Code |
| BR-10 | Khi trả phòng phải ghi checklist thiết bị/sạch sẽ/đèn; nếu thiết bị không đạt, phòng chuyển sang bảo trì | Code |
| BR-11 | Người dùng chỉ được tự hủy trước T−3 giờ, phải chọn lý do; lý do “Khác” phải có nội dung | Code |
| BR-12 | Gia hạn làm tăng giờ kết thúc của phiên đang sử dụng, phải kiểm tra không vượt khung giờ và không chồng lịch đơn kế tiếp | Đề cương, code |
| BR-13 | Vi phạm được phân loại, có mức độ và hình phạt; có thể tạo lệnh hạn chế quyền | Đề cương, code |
| BR-14 | Người đang bị hạn chế quyền không được tạo đơn đặt phòng mới | Đề cương, code |
| BR-15 | Kết quả duyệt/từ chối/hủy được lưu thông báo trong hệ thống và gửi email cho người đặt | Đề cương, code |
| BR-16 | Mọi quyết định duyệt phải lưu người quyết định, thời điểm và chế độ `MANUAL`/`AUTO` | Code |
| BR-17 | Duyệt tự động là cấu hình toàn hệ thống `booking.autoApprove`; khi bật, người duyệt là tài khoản hệ thống | Code |
| BR-18 | Không hard-delete: mọi bảng nghiệp vụ dùng xóa mềm `IsDeleted` | Quy ước dự án |
| BR-19 | Thời gian lưu UTC; hiển thị theo giờ Việt Nam (UTC+7) | Code |
| BR-20 | Trạng thái đơn/chi tiết/phiên/loại phòng là tập hữu hạn, được ràng buộc bằng CHECK constraint | Code |
| BR-21 | Mã điểm danh gửi tới **email người đặt phòng**, dùng một lần, có hạn và giới hạn số lần nhập | Thay đổi phạm vi (mục 8) |

## 8. Thay đổi phạm vi: thay QR code bằng OTP qua Gmail

Đề cương yêu cầu “điểm danh bằng QR code”. Nhóm thay bằng **gửi mã OTP 6 số qua Gmail cho người đặt phòng** tại thời điểm mở cửa sổ nhận phòng.

**Lý do**

- Không phải in/dán mã QR tại từng phòng, không cần thiết bị quét.
- Tận dụng hạ tầng email trường (`@huit.edu.vn`) đã có và SMTP đã tích hợp.
- Mã gắn với từng lượt đặt, từng phòng, có hạn và dùng một lần nên dễ kiểm soát hơn mã QR tĩnh.
- Kết quả điểm danh (đúng giờ, muộn, không đến, check-in hộ) có thể tổng hợp trực tiếp cho báo cáo.

**Đánh đổi và biện pháp bù**

| Rủi ro | Biện pháp |
|---|---|
| OTP chứng minh kiểm soát email, không chứng minh hiện diện vật lý tại phòng | Chỉ gửi trong cửa sổ nhận phòng; nhân viên đối chiếu ngẫu nhiên thẻ/MSSV; ghi nhận số người thực tế |
| Người đặt chuyển tiếp email cho người khác | OTP gắn với `BookingId` + `BookingDetailId` + tài khoản; hành vi bị coi là vi phạm nội quy |
| Email đến muộn/không đến | Cơ chế gửi lại có giới hạn; nhân viên check-in hộ có ghi lý do |
| Spam/brute-force | Giới hạn tần suất gửi, giới hạn số lần nhập, mã hóa hash, hết hạn ngắn |

Chi tiết thiết kế ở [06-diem-danh-otp.md](06-diem-danh-otp.md).

## 9. Ràng buộc phi chức năng

| Mã | Ràng buộc | Giá trị mục tiêu |
|---|---|---|
| NFR-01 | Thời gian phản hồi API thông thường | ≤ 500 ms (p95) khi dữ liệu demo |
| NFR-02 | Kiểm tra trùng lịch | Quyết định ở tầng CSDL, không phụ thuộc kiểm tra ở client |
| NFR-03 | Đồng thời | Một instance API; SignalR in-memory; khoảng 200 kết nối đồng thời qua tunnel |
| NFR-04 | Bảo mật | JWT, phân quyền phía server, mật khẩu hash, OTP hash, không lộ thông tin tài khoản |
| NFR-05 | Khả dụng | Tác vụ nền chạy lặp an toàn, không hủy sai đơn đã nhận phòng |
| NFR-06 | Duy trì | Kiến trúc module hóa, logic thuần có unit test |
| NFR-07 | Triển khai | Docker Compose: `db`, `api`, `web`; cấu hình qua biến môi trường |
| NFR-08 | Dữ liệu | Sao lưu PostgreSQL định kỳ; không hard-delete |

## 10. Truy vết đề cương → tài liệu

| Nội dung đề cương | Tài liệu |
|---|---|
| Khảo sát hiện trạng, biểu mẫu | 01 (tài liệu này) |
| Use case nghiệp vụ, activity diagram | 02 |
| Use case hệ thống và đặc tả | 03 |
| Kiến trúc backend, API | 04 |
| Mô hình dữ liệu, sơ đồ lớp thiết kế | 05 |
| Điểm danh QR → OTP | 06 |
| Phân quyền, báo cáo, thông báo | 02–05 |
