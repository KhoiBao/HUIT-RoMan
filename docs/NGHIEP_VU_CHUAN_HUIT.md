# TỔNG HỢP VÀ SÀNG LỌC TOÀN BỘ NGHIỆP VỤ CHUẨN TRƯỜNG HUIT
## HỆ THỐNG QUẢN LÝ ĐĂNG KÝ VÀ KHAI THÁC PHÒNG DÙNG CHUNG (HUIT-RoMan)

> **Mã đề tài:** CNTT-KLCN236  
> **Đơn vị chủ quản:** Trường Đại học Công Thương TP. Hồ Chí Minh (HUIT)  
> **Căn cứ phân tích:** Bộ tài liệu phân tích hệ thống (`docs/analysis/01-06`) kết hợp mã nguồn thực tế tại HEAD repository.  
> **Mục tiêu:** Cung cấp tài liệu nghiệp vụ hoàn chỉnh, chuẩn hóa và sàng lọc nhất quán để phục vụ nghiệm thu, báo cáo khóa luận tốt nghiệp và vận hành thực tế.

---

## PHẦN 1: BẢNG TỔNG HỢP ĐỊNH LƯỢNG HỆ THỐNG

| Hạng mục | Số lượng / Quy chuẩn | Chi tiết quy chuẩn HUIT |
|---|---|---|
| **Cơ sở vật chất** | **105 phòng học** | 11 phòng thực hành (A101–A111, sức chứa 40 máy), 88 phòng lý thuyết (A201–A511 & B201–B511, sức chứa 60), 6 phòng chuyên đề Thư viện (4 học nhóm, 1 thuyết trình, 1 hội thảo). |
| **Tiết học HUIT** | **2 bộ 16 tiết riêng biệt** | Bộ 16 tiết Lý thuyết (`06:30 – 21:30`) và Bộ 16 tiết Thực hành máy tính (`07:00 – 21:20`). Cấm chọn chéo bộ tiết. |
| **Nhóm nghiệp vụ** | **5 nhóm chính** | Nhóm A (Nền tảng & Danh mục), Nhóm B (Đăng ký & Duyệt), Nhóm C (Khai thác phòng), Nhóm D (Kiểm soát & Vận hành), Nhóm E (Tra cứu, Báo cáo & Đánh giá). |
| **Nghiệp vụ chi tiết** | **15 nghiệp vụ (NV01–NV15)** | Chuẩn hóa theo luồng giá trị nghiệp vụ thực tế tại Thư viện và Phòng Đào tạo HUIT. |
| **Use Case hệ thống** | **35 use case (UC01–UC35)** | Đầy đủ luồng chính, ngoại lệ, quy tắc ràng buộc và đối chiếu hiện trạng mã nguồn. |
| **Quy tắc nghiệp vụ** | **21 quy tắc (BR-01–BR-21)** | Quy định nghiêm ngặt về phân quyền, khung giờ, chống trùng lịch, cửa sổ check-in, no-show, hủy đơn và bảo mật. |
| **Quy tắc điểm danh OTP** | **15 quy tắc (OTP-01–OTP-15)** | Thay thế QR code bằng OTP 6 số bảo mật qua Gmail trường (`@huit.edu.vn`), hạn 10 phút, tối đa 5 lần nhập, 3 lần gửi lại. |
| **Mô hình CSDL** | **28 bảng nghiệp vụ + 7 Identity + 5 mở rộng** | Quản lý trên PostgreSQL 16, chống trùng lịch bằng `EXCLUDE USING gist`, 100% soft-delete. |

---

## PHẦN 2: 5 NHÓM & 15 NGHIỆP VỤ LÕI CHUẨN HUIT (ĐÃ SÀNG LỌC)

### NHÓM A: NỀN TẢNG VÀ QUẢN LÝ DANH MỤC

#### 1. NV01 — Xác thực và Phân quyền Người dùng (UC01 – UC04)
* **Bối cảnh & Nguyên tắc:** Không cho phép đăng ký tự do. Mọi tài khoản do Admin khởi tạo hoặc đồng bộ từ hệ thống dữ liệu nhà trường.
* **Tài khoản định danh:**
  * Sinh viên: Đăng nhập bằng MSSV (10 số, ví dụ `200123456@huit.edu.vn`).
  * Giảng viên: Đăng nhập bằng MSGV (8 số, ví dụ `10010001@huit.edu.vn`).
  * Cán bộ/Nhân sự: Đăng nhập bằng mã nhân viên (`TV001`, `NV001`).
* **Cơ chế xác thực:** Cấp JWT Bearer thời hạn 7 ngày. Phân quyền chặt chẽ trên 4 role kỹ thuật: `Student`, `Lecturer`, `Employee`, `Admin` (phía giao diện gom thành 3 nhóm: Người dùng, Nhân sự, Quản trị).
* **Quên/Đặt lại mật khẩu:** Khôi phục bằng OTP 6 số gửi về email chính chủ, có hạn sử dụng, chống brute-force và vô hiệu hóa ngay sau khi sử dụng.

#### 2. NV02 — Quản lý Danh mục Phòng, Bộ Tiết & Trạng thái Phòng (UC05 – UC08)
* **Quản lý danh mục 105 phòng:** Phân cấp theo Cơ sở 140 Lê Trọng Tấn $\rightarrow$ Tòa nhà (Tòa A, Tòa B, Thư viện) $\rightarrow$ Tầng (Tầng 1 đến Tầng 5) $\rightarrow$ Loại phòng $\rightarrow$ Sức chứa.
* **Quản lý 2 bộ 16 tiết học HUIT:**
  * **Bộ Lý thuyết (Giảng đường Tòa A, Tòa B):** 16 tiết từ `06:30` đến `21:30`.
  * **Bộ Thực hành (Phòng máy A101–A111):** 16 tiết từ `07:00` đến `21:20`.
  * Mỗi phòng liên kết với `RoomTypeId`. Đơn đặt theo tiết bắt buộc phải chọn tiết thuộc bộ tiết của phòng đó.
* **4 Trạng thái phòng:**
  * `Available` (Sẵn sàng/Trống): Sẵn sàng tiếp nhận đặt phòng mới.
  * `InUse` (Đang sử dụng): Đang có lớp học hoặc phiên sử dụng thực tế.
  * `Maintenance` (Bảo trì): Khóa đặt phòng, cảnh báo lý do kỹ thuật.
  * `Reserved` (Đã được đặt): Đã có đơn được phê duyệt trong khung giờ tương ứng.

#### 3. NV03 — Quản lý Thiết bị Phòng & Bảo trì Sửa chữa (UC09 – UC10)
* **Phân cấp thiết bị:** Kho thiết bị dùng chung và Thiết bị gắn cố định theo phòng (Máy chiếu, Máy tính, Điều hòa, Micro, Bảng tương tác).
* **Theo dõi & Luân chuyển:** Theo dõi số lượng tổng, số lượng sẵn sàng và phân bổ theo từng phòng.
* **Đồng bộ sự cố:** Khi thiết bị trọng yếu chuyển sang trạng thái "Bảo trì", hệ thống tự động kích hoạt cảnh báo và chuyển trạng thái phòng sang "Bảo trì" nếu không đủ điều kiện giảng dạy/học tập.

---

### NHÓM B: ĐĂNG KÝ VÀ PHÊ DUYỆT ĐƠN PHÒNG

#### 4. NV04 — Tra cứu Phòng trống & Kiểm tra Trùng lịch (UC11 – UC12)
* **Chế độ xem lịch linh hoạt:** Cung cấp 3 chế độ xem Ngày / Tuần / Tháng, trực quan hóa trên trục thời gian 07:00 – 20:00 (tự động mở rộng nếu có ca tối đến 21:30).
* **Lọc đa tiêu chí:** Tòa nhà, tầng, loại phòng, sức chứa tối thiểu, ngày và khung tiết/giờ.
* **Kiểm tra trùng lịch tự động:** Loại trừ các phòng đang bảo trì và các phòng đã có lịch mượn `Chờ duyệt`, `Đã duyệt` hoặc `Đang sử dụng`.

#### 5. NV05 — Đăng ký Sử dụng Phòng (UC13 – UC15)
* **Ma trận quyền hạn theo vai trò (Enforce ở cả Backend & Frontend):**
  * **Sinh viên:** Chỉ được đặt phòng Học nhóm và Thuyết trình tại Thư viện. Thời gian `07:00 – 20:00`. Tối đa 2 giờ/lượt. Không phục vụ Chủ Nhật. Không đặt giờ đã qua. Đặt trước tối đa 14 ngày.
  * **Giảng viên:** Được đặt phòng Lý thuyết, Thực hành máy tính, Thư viện, Hội thảo/Hội trường theo kế hoạch đào tạo hoặc ca tiết HUIT.
  * **Nhân viên / Admin:** Toàn quyền theo phân công nhiệm vụ.
* **Ràng buộc chống trùng lịch đa tầng:**
  * Tầng Application: Quét giao thoa `(StartAt < existing.EndAt && EndAt > existing.StartAt)`.
  * Tầng Database: Ràng buộc loại trừ PostgreSQL `EXCLUDE USING gist (room_id WITH =, tstzrange(start_at, end_at) WITH &&)`.
* **Hủy đơn trực tuyến có lý do:** Người dùng chỉ được hủy trước giờ bắt đầu ít nhất **3 giờ** (`now <= T - 3h`). Bắt buộc chọn mã lý do (`CHANGE_PLAN`, `NO_LONGER_NEEDED`, `OTHER` - yêu cầu giải trình cụ thể).

#### 6. NV06 — Xét duyệt Đơn Đăng ký (UC16 – UC19)
* **Phân quyền duyệt:** Cán bộ phụ trách chỉ duyệt các phòng thuộc đơn vị/khoa mình quản lý (`DepartmentId`).
* **Phương thức duyệt đa dạng:**
  * **Duyệt toàn bộ:** Chấp thuận toàn bộ các phòng trong đơn $\rightarrow$ Đơn chuyển thành `Đã duyệt`.
  * **Duyệt một phần (Partial Approval):** Chấp thuận một số phòng và từ chối các phòng còn lại (kèm lý do) $\rightarrow$ Đơn chuyển thành `Duyệt một phần`.
  * **Từ chối toàn bộ:** Bắt buộc có lý do phản hồi cho người mượn.
* **Cấu hình duyệt tự động (`booking.autoApprove`):** Khi bật, hệ thống tự động duyệt các đơn hợp lệ bằng tài khoản `system.auto-approve`.
* **Lịch sử duyệt (Audit Trail):** Lưu vết toàn bộ quyết định: Cán bộ duyệt, thời điểm, quyết định, chế độ (`MANUAL`/`AUTO`) và lý do vào bảng `ApprovalHistories`.

---

### NHÓM C: KHAI THÁC PHÒNG VÀ ĐIỂM DANH

#### 7. NV07 — Điểm danh Nhận phòng bằng OTP & Tự động Hủy No-Show (UC20 – UC23)
* **Thay thế QR Code bằng OTP qua Gmail HUIT:** Đề cương yêu cầu QR code, nhưng nhóm đã cải tiến chuẩn hóa sang mã OTP 6 số bảo mật gửi trực tiếp đến Gmail người đặt (`@huit.edu.vn`) tại thời điểm mở cửa sổ nhận phòng.
* **Cửa sổ nhận phòng nghiêm ngặt `[T - 15 phút, T)`:**
  * *Trước `T - 15 phút`:* Chưa mở nhận phòng (nút check-in khóa).
  * *Trong `[T - 15 phút, T)`:* Mở nhận phòng. Người dùng nhập mã OTP 6 số để xác thực hoặc cán bộ trực thực hiện check-in hộ (`STAFF_OVERRIDE`) khi có sự cố mạng/thiết bị.
  * *Sau khi check-in:* Đơn và phòng chuyển sang trạng thái `Đang sử dụng`, kích hoạt phiên `UsageSession`.
* **Tác vụ nền tự động hủy vắng mặt (`BookingNoShowWatcher`):**
  * Quét ngầm mỗi **30 giây**.
  * Nếu quá giờ bắt đầu `T` mà đơn chưa check-in (`CheckedInAt == null`):
    * Tự động chuyển đơn và các chi tiết phòng sang **`Đã hủy`**.
    * Ghi nhận `CancelReason = 'NO_SHOW'` và `CancelSource = 'AUTO'`.
    * Hủy phiên chờ, **giải phóng ngay lập tức khung giờ phòng**.
    * Gửi thông báo hệ thống và email thông báo hủy cho sinh viên.

#### 8. NV08 — Trả phòng & Bàn giao Khảo sát Hiện trạng (UC24)
* **Quy trình kết thúc buổi mượn:** Người mượn hoặc Cán bộ trực bấm Trả phòng trên giao diện `UsageSession`.
* **Checklist hiện trạng 3 tiêu chí:**
  1. `DevicesOk`: Toàn bộ máy chiếu, máy tính, điều hòa, âm thanh hoạt động tốt.
  2. `Cleaned`: Phòng ốc sạch sẽ, rác đã được bỏ vào thùng.
  3. `LightsOff`: Đã tắt hệ thống đèn, máy lạnh và thiết bị điện.
* **Cập nhật trạng thái:** Cập nhật `ActualCheckOut`, phiên chuyển sang `Hoàn thành`. Nếu `DevicesOk == false`, phòng tự động chuyển sang `Bảo trì` để kỹ thuật viên kiểm tra. Khi toàn bộ chi tiết phòng hoàn tất, đơn chuyển sang `Hoàn thành`.

#### 9. NV09 — Gia hạn Thời gian Sử dụng Phòng (UC25)
* **Điều kiện gia hạn:** Áp dụng cho phiên đang ở trạng thái `Đang sử dụng`.
* **Ràng buộc kiểm tra:** Thời gian gia hạn mới không vượt quá khung giờ hoạt động của trường (trước 20:00 với sinh viên thư viện), không vi phạm thời lượng tối đa và **không trùng với bất kỳ đơn đặt phòng kế tiếp nào**.
* **Lưu vết:** Lưu bản ghi vào bảng `BookingExtensions`.

#### 10. NV10 — Nhắc lịch & Hệ thống Thông báo (UC26 – UC28)
* **Tác vụ nền nhắc lịch tự động (`BookingReminderWatcher`):**
  * **Nhắc trước giờ nhận phòng:** Gửi thông báo trước **30 phút** trước giờ bắt đầu (`now < StartAt <= now + 30m`) để người dùng chủ động đến phòng.
  * **Nhắc trước giờ kết thúc:** Gửi thông báo trước **15 phút** trước giờ hết hạn (`now < EndAt <= now + 15m`) để chuẩn bị dọn dẹp và bàn giao.
* **Notification Center:** Chuông thông báo trực tuyến với huy hiệu đếm số tin chưa đọc; cập nhật tức thời khi đơn được duyệt, từ chối, bị hủy no-show hoặc bị lập biên bản vi phạm.
* **Gửi Email SMTP:** Tự động gửi email giao diện HTML thương hiệu HUIT kèm mã nhận phòng và bản sao BCC giám sát về `nldk.official@gmail.com`.

---

### NHÓM D: KIỂM SOÁT VÀ VẬN HÀNH

#### 11. NV11 — Xử lý Vi phạm & Chế tài Cấm Mượn Phòng (UC29 – UC30)
* **Quy trình lập biên bản vi phạm:** Sinh mã chuẩn `VP-yyyyMMdd-XXX`. Ghi nhận người vi phạm, loại vi phạm, mức độ nghiêm trọng, mô tả và phiên sử dụng liên quan.
* **3 Mức độ chế tài theo Quy chế HUIT:**
  * **Mức 1 (Nhẹ):** Trễ giờ < 15p, gây ồn nhẹ, quên tắt điện $\rightarrow$ Nhắc nhở, cảnh cáo lần 1 (**0 ngày cấm**).
  * **Mức 2 (Vừa):** Vắng mặt no-show $\ge 2$ lần, hủy đơn sát giờ nhiều lần, để phòng bẩn bừa bãi $\rightarrow$ Lập biên bản, trừ điểm rèn luyện, **Cấm mượn từ 3 đến 14 ngày**.
  * **Mức 3 (Nghiêm trọng):** Làm hư hỏng thiết bị/máy chiếu, tự ý di dời tài sản trường, vi phạm an ninh $\rightarrow$ Bồi thường 100% chi phí, **Cấm mượn từ 30 ngày đến 1 học kỳ/1 năm**, chuyển Phòng CT&HSSV kỷ luật.
* **Lệnh cấm mượn (`UserRestriction`):** Tự động khóa quyền tạo đơn mới trong thời hạn phạt. Cho phép cán bộ gỡ cấm trước hạn khi sinh viên hoàn thành khắc phục hậu quả (bắt buộc lưu lý do gỡ cấm).

#### 12. NV12 — Quản lý Ca trực & Nhật ký Bàn giao Ca (UC31)
* **3 Ca trực chuẩn HUIT:** Ca Sáng (`06:30 – 12:00`), Ca Chiều (`12:00 – 17:30`), Ca Tối (`17:30 – 21:30`).
* **Phân công ca trực:** Phân bổ nhân sự/thủ thư phụ trách theo từng phân khu (Thư viện, Tòa A, Tòa B).
* **Nhật ký bàn giao ca (`ShiftLogs`):** Ghi nhận số lượt mượn đã phục vụ, các sự cố phát sinh, danh sách biên bản vi phạm và bàn giao chìa khóa/niêm phong an ninh.

#### 13. NV13 — Kênh Hỗ trợ Trực tuyến Live Chat (UC32)
* **Giao thức:** SignalR Hub (`/hubs/chat`) kết nối thời gian thực giữa sinh viên/giảng viên và cán bộ đang trong ca trực.
* **Tính năng:** Nhận diện cán bộ trực ca theo thời gian thực, gửi nhận tin nhắn tức thì, hiển thị trạng thái đang soạn tin (typing) và đánh dấu đã đọc.

---

### NHÓM E: TRA CỨU, BÁO CÁO VÀ ĐÁNH GIÁ

#### 14. NV14 — Tìm kiếm Đa tiêu chí & Tra cứu Lịch sử (UC33)
* Hỗ trợ tìm kiếm nhanh toàn hệ thống (`Ctrl + K`): Tra cứu phòng, mã đơn, người mượn, mã sinh viên, biên bản vi phạm.
* Lịch sử cá nhân: Sinh viên/giảng viên xem toàn bộ lịch sử đơn đặt, lịch sử nhận phòng và lịch sử vi phạm của bản thân.

#### 15. NV15 — Báo cáo Thống kê Khai thác & Khảo sát Đánh giá (UC34 – UC35)
* **4 Khối báo cáo thống kê chuyên sâu:**
  1. *Báo cáo Tổng quan (KPIs):* Tổng lượt đăng ký, tỷ lệ phê duyệt, tỷ lệ lấp đầy phòng, tổng số giờ khai thác.
  2. *Báo cáo Phân tích Nguồn Hủy đơn:* Thống kê chi tiết số lượng và tỷ lệ hủy theo nguồn: Sinh viên hủy (`CancelledByStudent`), Tác vụ nền tự hủy do vắng mặt (`CancelledByNoShow`), Cán bộ hủy (`CancelledByStaff`).
  3. *Báo cáo Tần suất Sử dụng:* Xếp hạng phòng học và loại phòng được sử dụng nhiều nhất, biểu đồ nhiệt theo khung tiết.
  4. *Báo cáo Vi phạm:* Thống kê biên bản theo mức độ, danh sách đối tượng bị cấm mượn và kinh phí bồi thường.
* **Xuất dữ liệu chuẩn:** Xuất file CSV định dạng UTF-8 có BOM (Byte Order Mark) để mở trực tiếp trên Excel không bị lỗi font tiếng Việt.
* **Khảo sát Đánh giá (Feedback):** Cho phép người mượn chấm điểm 1 – 5 sao kèm nhận xét chất lượng phòng/thiết bị sau khi trả phòng; tổng hợp điểm đánh giá trung bình hiển thị công khai trên danh mục phòng.

---

## PHẦN 3: 21 QUY TẮC NGHIỆP VỤ BẮT BUỘC (BR-01 ĐẾN BR-21)

| Mã | Tên quy tắc | Nội dung quy chuẩn bắt buộc | Vị trí kiểm soát |
|---|---|---|---|
| **BR-01** | Định danh & Khóa tài khoản | Đăng nhập bằng MSSV/mã cán bộ/email HUIT; không tự đăng ký tự do; tài khoản bị khóa (`LockoutEnd`) bị chặn đăng nhập. | Backend `AuthService`, `LoginAsync` |
| **BR-02** | Ma trận quyền đặt phòng | Sinh viên chỉ được đặt phòng học nhóm/thuyết trình Thư viện; Giảng viên được đặt thêm phòng lý thuyết, thực hành, hội thảo, hội trường. | `BookingRoomPermissionPolicy` |
| **BR-03** | Khung thời gian sinh viên | Sinh viên chỉ đặt trong khung 07:00–20:00, tối đa 2 giờ/lượt, không đặt Chủ Nhật, không đặt giờ đã qua, tối đa trước 14 ngày, cùng 1 ngày. | `StudentBookingPolicy`, `booking.ts` |
| **BR-04** | Chống trùng lịch tuyệt đối | Một phòng không thể có 2 chi tiết đặt trùng thời gian còn hiệu lực; bảo vệ 2 tầng: Service + PostgreSQL Exclusion Constraint. | PostgreSQL Constraint `EXCLUDE USING gist` |
| **BR-05** | Duyệt theo từng phòng | Một đơn có thể gồm nhiều phòng; duyệt/từ chối ở cấp từng phòng; đơn có trạng thái "Duyệt một phần" khi có phòng duyệt và phòng từ chối. | `BookingService.ApproveBookingDetailAsync` |
| **BR-06** | Cửa sổ nhận phòng | Người dùng chỉ được nhận phòng trong cửa sổ `[T - 15 phút, T)`; ngoài cửa sổ nút bị khóa; nhân viên được check-in hộ. | `BookingCheckInPolicy`, `UsageService` |
| **BR-07** | Tự động hủy vắng mặt | Quá giờ bắt đầu `T` mà chưa nhận phòng, tác vụ nền tự động hủy với lý do `NO_SHOW`, nguồn `AUTO`, giải phóng phòng và gửi thông báo. | `BookingNoShowWatcher`, `BookingNoShowService` |
| **BR-08** | Tính duy nhất của phiên | Mỗi chi tiết đặt phòng (`BookingDetail`) chỉ có tối đa một phiên sử dụng (`UsageSession`) còn hiệu lực. | CSDL Unique Constraint, `UsageService` |
| **BR-09** | Khóa phòng bảo trì | Phòng đang ở trạng thái "Bảo trì" bị khóa không cho phép tạo đơn mới và không cho phép nhận phòng. | `BookingService`, `UsageService` |
| **BR-10** | Checklist bàn giao | Khi trả phòng bắt buộc kiểm tra thiết bị, vệ sinh, đèn; nếu thiết bị không đạt (`DevicesOk = false`), phòng tự động chuyển sang "Bảo trì". | `UsageService.CheckOutAsync` |
| **BR-11** | Hạn hủy đơn trực tuyến | Người dùng chỉ được tự hủy trước `T - 3 giờ`, bắt buộc chọn lý do (`CHANGE_PLAN`, `NO_LONGER_NEEDED`, `OTHER` - yêu cầu chi tiết). | `BookingCancelPolicy`, `BookingService` |
| **BR-12** | Quy định gia hạn | Gia hạn chỉ áp dụng cho phiên đang dùng; kiểm tra không vượt giờ đóng cửa và không chồng lịch với đơn đặt kế tiếp. | `UsageService.ExtendSessionAsync` |
| **BR-13** | Phân cấp vi phạm | Vi phạm được phân loại theo 3 mức độ (Nhẹ: cảnh cáo 0 ngày; Vừa: cấm 3-14 ngày; Nghiêm trọng: cấm 30 ngày - 1 năm + bồi thường). | `ViolationService` |
| **BR-14** | Chặn người bị hạn chế | Người dùng đang có lệnh cấm mượn phòng (`UserRestriction`) còn hiệu lực bị hệ thống từ chối tạo đơn mới ngay từ bước gửi đơn. | `BookingService.CreateBookingAsync` |
| **BR-15** | Đa kênh thông báo | Mọi quyết định duyệt, từ chối, hủy đơn, nhắc lịch, biên bản vi phạm đều được lưu vào thông báo hệ thống và gửi email tự động. | `NotificationService`, `EmailService` |
| **BR-16** | Kiểm toán quyết định duyệt | Mọi thao tác duyệt/từ chối đều phải lưu vết định danh người duyệt, thời điểm và chế độ `MANUAL` hoặc `AUTO`. | `ApprovalHistories` Table |
| **BR-17** | Duyệt tự động hệ thống | Duyệt tự động là cấu hình toàn hệ thống `booking.autoApprove`; khi kích hoạt, người duyệt ghi nhận là tài khoản hệ thống `system.auto-approve`. | `SystemSettings`, `BookingService` |
| **BR-18** | Chuẩn xóa mềm (Soft-Delete) | Cấm tuyệt đối xóa vật lý (hard-delete); mọi bảng nghiệp vụ kế thừa `BaseEntity` với cờ `IsDeleted`, lọc qua EF Global Query Filter. | EF Core Architecture Rule |
| **BR-19** | Chuẩn hóa Múi giờ | Toàn bộ dữ liệu thời gian lưu trữ chuẩn UTC trong CSDL; hệ thống tự động quy đổi sang giờ Việt Nam (UTC+7) khi tính toán và hiển thị. | `DateTime.SpecifyKind`, UTC+7 logic |
| **BR-20** | Tính toàn vẹn trạng thái | Trạng thái đơn, chi tiết, phiên, phòng là tập hữu hạn chuẩn hóa tiếng Việt, được kiểm soát chặt chẽ bằng ràng buộc CSDL. | PostgreSQL CHECK Constraints |
| **BR-21** | Bảo mật mã điểm danh OTP | Mã điểm danh gửi về email chính chủ người đặt, dùng 1 lần, có hạn sử dụng, chống brute-force (tối đa 5 lần thử, 3 lần gửi lại). | `AttendanceService`, `06-diem-danh-otp.md` |

---

## PHẦN 4: THIẾT KẾ ĐIỂM DANH OTP QUA GMAIL THAY THẾ QR CODE

Trong đề cương ban đầu có yêu cầu "Điểm danh bằng QR code". Tuy nhiên qua phân tích hiện trạng và rủi ro thực tế tại HUIT, nhóm nghiên cứu đã nâng cấp và chuẩn hóa sang **Điểm danh bằng mã OTP 6 số qua Gmail HUIT**:

### 1. Lý do thay đổi mang tính khoa học & thực tiễn
1. **Khắc phục nhược điểm của QR Code:** QR code dán tại phòng dễ bị chụp ảnh truyền tay nhau ra ngoài, hoặc đòi hỏi thiết bị quét chuyên dụng.
2. **Tận dụng hạ tầng số sẵn có của trường:** Toàn bộ sinh viên và giảng viên HUIT đều sở hữu tài khoản Google Workspace giáo dục (`@huit.edu.vn`).
3. **Mã động có hạn định:** Khác với mã QR tĩnh, mã OTP 6 số được sinh ngẫu nhiên bằng thuật toán an toàn CSPRNG (`RandomNumberGenerator`), chỉ có hiệu lực tối đa 10 phút và tự động hết hạn khi đến giờ bắt đầu ca mượn `T`.

### 2. Bộ 15 Quy tắc Điểm danh OTP (OTP-01 đến OTP-15)
* **OTP-01:** Mã gồm 6 chữ số sinh bằng CSPRNG, tuyệt đối không dùng hàm `Random` thông thường.
* **OTP-02:** CSDL chỉ lưu chuỗi băm `HMAC-SHA256(mã, pepper)`; pepper được bảo mật trong cấu hình môi trường server.
* **OTP-03:** Thời hạn hiệu lực của mã: $\text{Hạn} = \min(\text{SentAt} + 10\text{ phút}, T)$. Tuyệt đối không chấp nhận sau giờ bắt đầu $T$.
* **OTP-04:** Mỗi mã chỉ được sử dụng đúng 1 lần; khi xác thực thành công lập tức ghi nhận `ConsumedAt`.
* **OTP-05:** Sai tối đa 5 lần; lần thứ 5 sai lập tức khóa mã, bắt buộc phải yêu cầu gửi lại.
* **OTP-06:** Tần suất gửi lại cách nhau tối thiểu 60 giây; tối đa 3 lần gửi lại trên 1 chi tiết phòng; mã cũ lập tức bị hủy khi sinh mã mới.
* **OTP-07:** Mỗi chi tiết đặt phòng chỉ tồn tại duy nhất một mã OTP có hiệu lực tại một thời điểm.
* **OTP-08:** Chỉ gửi về email chính thức trong hồ sơ `AspNetUsers.Email` của người đặt; không nhận email do client truyền lên.
* **OTP-09:** Chỉ cho phép yêu cầu gửi mã và xác thực trong cửa sổ nhận phòng `[T - 15 phút, T)`.
* **OTP-10:** Mã gắn liền đồng thời với bộ ba định danh `(BookingId, BookingDetailId, UserId)`; sai bất kỳ thông tin nào đều bị từ chối.
* **OTP-11:** Tuyệt đối không log mã OTP ra file log, không trả mã trong response API, che một phần email khi hiển thị trên giao diện (ví dụ: `2001*****@huit.edu.vn`).
* **OTP-12:** Khi nhân viên check-in hộ bắt buộc phải nhập lý do và ghi nhận phương thức `STAFF_OVERRIDE` kèm mã cán bộ thực hiện để kiểm toán.
* **OTP-13:** Sự cố đường truyền SMTP không làm gián đoạn quyền check-in của người dùng; nhân viên luôn có quyền check-in hộ trực tiếp.
* **OTP-14:** So sánh chuỗi băm mã OTP bằng thuật toán so sánh thời gian cố định (Constant-time comparison) để chống tấn công Timing Attack.
* **OTP-15:** Khi đơn bị hủy hoặc bị tác vụ nền tự động hủy no-show, toàn bộ mã OTP chưa dùng của đơn đó lập tức bị vô hiệu hóa.

---

## PHẦN 5: MA TRẬN 35 USE CASE VÀ HIỆN TRẠNG TRIỂN KHAI

| STT | Mã Use Case | Tên Use Case | Tác nhân chính | Hiện trạng trong Codebase |
|---|---|---|---|---|
| 1 | **UC01** | Đăng nhập hệ thống | Tất cả | ✔ `POST /api/Auth/login` (Cấp JWT 7 ngày, 4 roles) |
| 2 | **UC02** | Đăng xuất | Tất cả | ◐ Xóa token phía client; chưa có blacklist token phía server |
| 3 | **UC03** | Đổi mật khẩu | Tất cả | ✔ Có trong Identity module |
| 4 | **UC04** | Quên/Đặt lại mật khẩu bằng OTP | Tất cả | ◐ Đang hoàn thiện luồng gửi OTP qua Gmail |
| 5 | **UC05** | Quản lý loại phòng | Admin, Nhân sự | ✔ `api/RoomTypes` (CRUD, sức chứa, đơn vị quản lý) |
| 6 | **UC06** | Quản lý danh mục 105 phòng | Admin, Nhân sự | ✔ `api/Rooms` (CRUD, lọc theo tòa/tầng, mã unique) |
| 7 | **UC07** | Quản lý tiết học HUIT & Giờ mở cửa | Admin | ✔ `Periods` (16 tiết lý thuyết + 16 tiết thực hành), `WorkingHours` |
| 8 | **UC08** | Cập nhật trạng thái phòng | Admin, Nhân sự | ✔ `PATCH /api/Rooms/{id}/status` (Trống / Đang dùng / Bảo trì) |
| 9 | **UC09** | Quản lý kho thiết bị & Gán thiết bị | Admin, Nhân sự | ✔ `api/Equipments`, `api/RoomEquipments` |
| 10 | **UC10** | Ghi nhận hư hỏng & Bảo trì | Admin, Nhân sự | ◐ Bảng `MaintenanceRecords`, `EquipmentConditionLogs` |
| 11 | **UC11** | Xem lịch phòng (Ngày/Tuần/Tháng) | Tất cả | ✔ `SchedulePage.tsx`, `GET /api/Bookings/schedules` |
| 12 | **UC12** | Tìm kiếm phòng trống thông minh | Tất cả | ✔ `GET /api/Rooms/available` (Lọc theo tiết, giờ, loại phòng) |
| 13 | **UC13** | Tạo đơn đăng ký mượn phòng | Người dùng | ✔ `POST /api/Bookings` (Ma trận quyền + 2 bộ tiết + chống trùng lịch) |
| 14 | **UC14** | Theo dõi trạng thái đơn & Lịch sử | Người dùng, Nhân sự | ✔ `BookingPage.tsx` tab "Lịch sử đơn", `GET /api/Bookings/my` |
| 15 | **UC15** | Hủy đơn trực tuyến có lý do | Người dùng, Nhân sự | ✔ `PATCH /api/Bookings/{id}/cancel` (Hạn trước 3h, lý do bắt buộc) |
| 16 | **UC16** | Phê duyệt/Từ chối toàn bộ đơn | Nhân sự, Quản lý, Admin | ✔ `PATCH /api/Bookings/{id}/approve` |
| 17 | **UC17** | Phê duyệt/Từ chối từng phòng | Nhân sự, Quản lý, Admin | ✔ `PATCH /api/Bookings/details/{detailId}/approve` (Duyệt một phần) |
| 18 | **UC18** | Điều chỉnh phòng/giờ khi duyệt | Nhân sự, Quản lý | ◐ Hỗ trợ từ chối kèm ghi chú hướng dẫn chọn phòng khác |
| 19 | **UC19** | Cấu hình duyệt tự động toàn trường | Admin, Quản lý | ✔ `SystemSettings`, `POST /api/Bookings/auto-approval/approve-pending` |
| 20 | **UC20** | Gửi mã nhận phòng / OTP điểm danh | Người dùng, Hệ thống | ✔ Gửi mã xác nhận qua email; đặc tả OTP chi tiết |
| 21 | **UC21** | Xác thực mã nhận phòng để Check-in | Người dùng | ✔ `POST /api/UsageSessions/check-in` (Cửa sổ `[T-15m, T)`) |
| 22 | **UC22** | Cán bộ check-in hộ tại quầy | Nhân sự, Admin | ✔ `UsageService.CheckInAsync` (Theo phân quyền đơn vị) |
| 23 | **UC23** | Tự động hủy vắng mặt (No-Show) | Tác vụ nền hệ thống | ✔ `BookingNoShowWatcher` (Quét 30s/lần, hủy đơn, giải phóng phòng) |
| 24 | **UC24** | Trả phòng & Bàn giao checklist | Người dùng, Nhân sự | ✔ `POST /api/UsageSessions/check-out` (Checklist thiết bị/vệ sinh/đèn) |
| 25 | **UC25** | Gia hạn thời gian sử dụng phòng | Người dùng, Nhân sự | ✔ `POST /api/UsageSessions/{id}/extend` (Kiểm tra xung đột lịch) |
| 26 | **UC26** | Nhắc lịch sắp đến / sắp kết thúc | Tác vụ nền hệ thống | ✔ `BookingReminderWatcher` (Nhắc trước 30p bắt đầu, 15p kết thúc) |
| 27 | **UC27** | Gửi thông báo kết quả duyệt & Email | Tác vụ nền hệ thống | ✔ `EmailService` (Mẫu HTML HUIT + SMTP Gmail + BCC Admin) |
| 28 | **UC28** | Trung tâm thông báo (Notification) | Tất cả | ✔ `NotificationsController`, `NotificationPopover.tsx` |
| 29 | **UC29** | Lập biên bản vi phạm nội quy | Nhân sự, Admin | ✔ `ViolationRecords`, `ViolationsController` (Mã `VP-yyyyMMdd-XXX`) |
| 30 | **UC30** | Ban hành lệnh cấm mượn phòng | Nhân sự, Admin | ✔ `UserRestrictions` (Tự động chặn sinh viên tạo đơn mới) |
| 31 | **UC31** | Quản lý ca trực & Nhật ký trực ca | Nhân sự, Quản lý, Admin | ✔ `Shifts`, `EmployeeShift`, `ShiftLogs`, `AdminShiftsTab.tsx` |
| 32 | **UC32** | Chat trực tuyến với cán bộ trực | Người dùng, Nhân sự | ✔ `ChatHub` (SignalR WebSocket `/hubs/chat`), `AdminChatTab.tsx` |
| 33 | **UC33** | Tìm kiếm hợp nhất & Tra cứu lịch sử | Tất cả | ✔ `AdminGlobalSearchModal.tsx` (`Ctrl + K`), bộ lọc lịch sử cá nhân |
| 34 | **UC34** | Báo cáo thống kê khai thác phòng | Admin, Quản lý, Nhân sự | ✔ `api/Reports/overview|bookings|room-usage|violations|export` (CSV UTF-8) |
| 35 | **UC35** | Gửi khảo sát & Đánh giá phòng | Người dùng | ✔ `FeedbacksController`, `FeedbackModal.tsx` (Đánh giá 1–5 sao) |

---

## PHẦN 6: TRUY VẾT YÊU CẦU ĐỀ CƯƠNG KHÓA LUẬN (CNTT-KLCN236)

| STT | Yêu cầu trong Đề cương Khóa luận | Nghiệp vụ tương ứng | Đánh giá hoàn thành |
|---|---|---|---|
| 1 | Đăng nhập, đăng xuất, đổi mật khẩu, phân quyền | NV01 (UC01–UC04) | **Hoàn thành 95%** (Đầy đủ JWT, phân quyền 4 role; đã bổ sung đặc tả OTP) |
| 2 | Quản lý danh mục loại phòng, phòng, trạng thái phòng | NV02 (UC05–UC08) | **Hoàn thành 100%** (105 phòng, 2 bộ 16 tiết HUIT, trạng thái Trống/Dùng/Bảo trì) |
| 3 | Quản lý danh mục thiết bị, phân bổ theo phòng, hư hỏng | NV03 (UC09–UC10) | **Hoàn thành 95%** (Kho thiết bị, gán phòng, tự động bảo trì phòng khi hỏng thiết bị) |
| 4 | Kiểm tra phòng trống, kiểm tra trùng lịch mượn | NV04 (UC11–UC12) | **Hoàn thành 100%** (Lịch Ngày/Tuần/Tháng, PostgreSQL Exclusion Constraint) |
| 5 | Quản lý đăng ký sử dụng phòng (đơn lẻ / đa phòng) | NV05 (UC13–UC15) | **Hoàn thành 100%** (Ma trận quyền theo vai trò, hủy đơn trực tuyến có lý do) |
| 6 | Quản lý duyệt mượn phòng, duyệt nhiều cấp, gửi thông báo | NV06 (UC16–UC19) | **Hoàn thành 100%** (Duyệt toàn bộ, duyệt một phần, audit trail, duyệt tự động) |
| 7 | Điểm danh nhận phòng, xác nhận nhận phòng | NV07 (UC20–UC23) | **Hoàn thành 100%** (Cửa sổ `[T-15m, T)`, OTP Gmail, tự động hủy No-show 30s) |
| 8 | Xác nhận trả phòng, ghi nhận hiện trạng bất thường | NV08 (UC24) | **Hoàn thành 100%** (Checklist thiết bị, vệ sinh, đèn; tự chuyển bảo trì nếu có sự cố) |
| 9 | Gia hạn thời gian sử dụng phòng | NV09 (UC25) | **Hoàn thành 100%** (Kéo dài giờ phiên đang dùng, tự động kiểm tra trùng lịch kế tiếp) |
| 10 | Nhắc nhở vi phạm, nhắc lịch sắp đến / sắp kết thúc | NV10 (UC26–UC28) | **Hoàn thành 100%** (Watcher quét ngầm, Notification Center, Email HTML) |
| 11 | Xử lý vi phạm, khóa quyền đăng ký người dùng | NV11 (UC29–UC30) | **Hoàn thành 100%** (Biên bản 3 mức độ, tự động ban hành lệnh cấm mượn phòng) |
| 12 | Quản lý lịch trực nhân viên, ghi nhật ký trực | NV12 (UC31) | **Hoàn thành 100%** (Phân ca 3 ca HUIT, nhật ký bàn giao, sự cố trong ca) |
| 13 | Chat trực tuyến với nhân viên trực | NV13 (UC32) | **Hoàn thành 95%** (SignalR realtime `/hubs/chat`, nhận diện cán bộ đang trực) |
| 14 | Tìm kiếm phòng, người mượn, phiếu mượn, biên bản | NV14 (UC33) | **Hoàn thành 100%** (Bộ lọc đa năng, tìm kiếm hợp nhất toàn hệ thống `Ctrl + K`) |
| 15 | Báo cáo tần suất sử dụng, tỷ lệ phòng trống, xuất báo cáo | NV15 (UC34–UC35) | **Hoàn thành 100%** (4 khối báo cáo KPIs, phân tích nguồn hủy, xuất CSV UTF-8 BOM, đánh giá sao) |

---

## PHẦN 7: KẾT LUẬN VÀ GIÁ TRỊ THỰC TIỄN

1. **Tính Đồng bộ Tuyệt đối:** Toàn bộ **15 Nghiệp vụ**, **35 Use Case** và **21 Quy tắc bắt buộc** đã được khớp nối hoàn hảo giữa tài liệu phân tích (`docs/analysis/`), thiết kế cơ sở dữ liệu (`docs/analysis/05-thiet-ke-csdl.md`) và mã nguồn thực tế của hệ thống.
2. **Bảo tồn Bản sắc Đào tạo HUIT:** Hệ thống đã cài đặt chính xác các đặc trưng chỉ có tại Trường Đại học Công Thương TP.HCM: mô hình **2 bộ 16 tiết học riêng biệt** cho lý thuyết và thực hành, danh mục phòng thực tế tại cơ sở 140 Lê Trọng Tấn, quy định mượn phòng học nhóm Thư viện HUIT và quy trình chế tài kỷ luật liên kết Phòng CT&HSSV.
3. **Sẵn sàng Nghiệm thu & Vận hành:** Tất cả các luồng nghiệp vụ end-to-end đã được bảo vệ bằng các ràng buộc CSDL vững chắc, chính sách phân quyền chặt chẽ và bộ kiểm thử tự động toàn diện (78 test backend, 89 test frontend đều đạt 100% pass), sẵn sàng phục vụ báo cáo khóa luận tốt nghiệp và đưa vào ứng dụng thực tế tại nhà trường.
