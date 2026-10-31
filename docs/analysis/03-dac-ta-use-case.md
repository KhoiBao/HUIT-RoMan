# 03 — Đặc tả use case hệ thống

> 35 use case thuộc 15 nghiệp vụ tại [02-nghiep-vu-va-use-case.md](02-nghiep-vu-va-use-case.md). Mỗi đặc tả gồm: tác nhân, mô tả, tiền/hậu điều kiện, luồng chính, luồng thay thế – ngoại lệ, quy tắc nghiệp vụ và hiện trạng triển khai.

## Quy ước

- **T = thời điểm bắt đầu** của một chi tiết đặt phòng (`BookingDetails.StartAt`).
- “Người dùng” = Sinh viên hoặc Giảng viên. “Nhân sự” = Employee/Manager/Admin.
- Quy tắc BR-xx tham chiếu [01-khao-sat-hien-trang.md §7](01-khao-sat-hien-trang.md#7-quy-tắc-nghiệp-vụ).
- “Hiện trạng”: ✔ đã có, ◐ có một phần, ✖ chưa có trong mã nguồn.

---

## Nhóm A — Nền tảng

### UC01 — Đăng nhập
- **Tác nhân**: Tất cả. **Mô tả**: Xác thực người dùng, cấp JWT và vai trò.
- **Tiền điều kiện**: Tài khoản tồn tại, chưa bị khóa. **Hậu điều kiện**: Phiên đăng nhập hợp lệ; client lưu token và role.
- **Luồng chính**: (1) Nhập MSSV/mã cán bộ hoặc email HUIT và mật khẩu → (2) Hệ thống kiểm tra tài khoản và mật khẩu → (3) Kiểm tra trạng thái tài khoản → (4) Trả JWT (7 ngày) + thông tin người dùng + role → (5) Điều hướng theo nhóm quyền (Quản trị/Nhân sự/Người dùng).
- **Ngoại lệ**: Sai thông tin → “Thông tin đăng nhập không đúng”; tài khoản bị khóa → “Tài khoản đang bị khóa”; thiếu dữ liệu → lỗi 400.
- **Quy tắc**: BR-01. **Hiện trạng**: ✔ `POST /api/Auth/login`; chưa có refresh/logout.

### UC02 — Đăng xuất
- **Tác nhân**: Tất cả. **Mô tả**: Kết thúc phiên làm việc trên thiết bị.
- **Hậu điều kiện**: Token bị xóa khỏi client; không thể dùng lại trên thiết bị.
- **Luồng chính**: (1) Chọn Đăng xuất → (2) Xóa token/phiên cục bộ → (3) Về màn hình đăng nhập.
- **Ngoại lệ**: Token hết hạn → tự động về đăng nhập.
- **Quy tắc**: BR-01. **Hiện trạng**: ◐ chỉ xóa phía client; chưa có thu hồi token phía server.

### UC03 — Đổi mật khẩu
- **Tác nhân**: Tất cả. **Mô tả**: Người dùng đã đăng nhập đổi mật khẩu.
- **Tiền điều kiện**: Đã đăng nhập. **Hậu điều kiện**: Mật khẩu mới có hiệu lực.
- **Luồng chính**: (1) Nhập mật khẩu cũ, mật khẩu mới, xác nhận → (2) Kiểm tra độ mạnh tối thiểu 6 ký tự và khớp xác nhận → (3) Xác thực mật khẩu cũ → (4) Cập nhật hash → (5) Thông báo thành công.
- **Ngoại lệ**: Sai mật khẩu cũ; mật khẩu mới quá ngắn; không khớp xác nhận.
- **Hiện trạng**: ◐ có trong Identity module, cần kiểm tra luồng UI.

### UC04 — Quên/đặt lại mật khẩu bằng OTP email
- **Tác nhân**: Tất cả. **Mô tả**: Khôi phục mật khẩu qua mã OTP gửi email.
- **Tiền điều kiện**: Tài khoản tồn tại, có email. **Hậu điều kiện**: Mật khẩu mới được đặt; OTP bị vô hiệu.
- **Luồng chính**: (1) Nhập định danh → (2) Hệ thống tạo OTP 6 số, lưu hash + hạn, gửi email → (3) Hiển thị email đã che một phần → (4) Nhập OTP + mật khẩu mới → (5) Đối chiếu hash, hạn, số lần nhập → (6) Đặt mật khẩu mới, đánh dấu OTP đã dùng.
- **Ngoại lệ**: OTP sai/hết hạn/quá số lần → từ chối; email không tồn tại → thông báo trung tính để tránh dò tài khoản.
- **Quy tắc**: BR-01, BR-21. **Hiện trạng**: ✖ hiện trả OTP trong response và không kiểm tra khi đặt lại — phải sửa trước khi demo.

---

## Nhóm B — Danh mục

### UC05 — Quản lý loại phòng
- **Tác nhân**: Admin, Nhân sự. **Mô tả**: CRUD loại phòng, sức chứa mặc định, đơn vị quản lý, hình thức đặt (theo tiết/theo giờ).
- **Tiền điều kiện**: Đã đăng nhập với quyền quản trị. **Hậu điều kiện**: Danh mục loại phòng cập nhật.
- **Luồng chính**: (1) Xem danh sách → (2) Thêm/sửa → (3) Kiểm tra tên, sức chứa > 0, đơn vị → (4) Lưu → (5) Xóa mềm nếu ngừng dùng.
- **Ngoại lệ**: Loại phòng còn phòng đang hoạt động → chặn xóa; dữ liệu sai → báo lỗi.
- **Quy tắc**: BR-18, BR-20. **Hiện trạng**: ✔ `/api/RoomTypes`.

### UC06 — Quản lý phòng
- **Tác nhân**: Admin, Nhân sự. **Mô tả**: CRUD phòng, mã phòng, tòa/tầng, sức chứa, loại phòng.
- **Hậu điều kiện**: Danh mục phòng cập nhật; mã phòng duy nhất giữa phòng còn hoạt động.
- **Luồng chính**: (1) Xem danh sách/lọc theo tòa, loại → (2) Thêm/sửa → (3) Kiểm tra mã duy nhất, sức chứa → (4) Lưu → (5) Xóa mềm.
- **Ngoại lệ**: Trùng mã phòng; sức chứa ≤ 0; phòng đang được đặt → cảnh báo.
- **Quy tắc**: BR-18, BR-20. **Hiện trạng**: ✔ `/api/Rooms`.

### UC07 — Quản lý tiết học và khung giờ phục vụ
- **Tác nhân**: Admin. **Mô tả**: Cấu hình bộ tiết cho từng loại phòng và khung giờ mở cửa theo ngày của đơn vị.
- **Luồng chính**: (1) Chọn loại phòng/đơn vị → (2) Thêm/sửa tiết (giờ bắt đầu < kết thúc) → (3) Cấu hình khung giờ theo thứ → (4) Lưu.
- **Ngoại lệ**: Giờ không hợp lệ; trùng tiết trong cùng bộ; ngày nghỉ không cần giờ.
- **Quy tắc**: BR-03, BR-20. **Hiện trạng**: ✔ `Periods`, `WorkingHours`.

### UC08 — Cập nhật trạng thái phòng
- **Tác nhân**: Admin, Nhân sự. **Mô tả**: Chuyển phòng giữa Trống / Đang sử dụng / Bảo trì.
- **Tiền điều kiện**: Phòng tồn tại. **Hậu điều kiện**: Trạng thái mới được áp dụng; phòng bảo trì không nhận đơn mới.
- **Luồng chính**: (1) Chọn phòng → (2) Chọn trạng thái + lý do → (3) Kiểm tra không có phiên đang dùng khi chuyển sang bảo trì → (4) Lưu và ghi lịch sử.
- **Ngoại lệ**: Đang có phiên sử dụng → chặn hoặc yêu cầu kết thúc phiên trước.
- **Quy tắc**: BR-09, BR-20. **Hiện trạng**: ✔ `PATCH /api/Rooms/{id}/status`; ◐ chưa có bảng lịch sử trạng thái.

### UC09 — Quản lý thiết bị và gán thiết bị vào phòng
- **Tác nhân**: Admin, Nhân sự. **Mô tả**: CRUD danh mục thiết bị, gán/thu hồi thiết bị theo phòng, theo dõi số lượng.
- **Luồng chính**: (1) Quản lý danh mục + kho → (2) Chọn phòng → (3) Gán thiết bị + số lượng + ngày gán → (4) Thu hồi khi chuyển đi → (5) Xem thiết bị trong phòng.
- **Ngoại lệ**: Số lượng vượt tồn kho; gán trùng thiết bị cho cùng phòng.
- **Hiện trạng**: ✔ `/api/Equipments`, `/api/RoomEquipments`.

### UC10 — Ghi nhận hư hỏng và bảo trì
- **Tác nhân**: Nhân sự, Admin. **Mô tả**: Ghi nhận sự cố thiết bị, lập hồ sơ sửa chữa, cập nhật trạng thái xử lý.
- **Luồng chính**: (1) Chọn thiết bị/phòng → (2) Nhập loại sự cố, mô tả, ngày phát hiện → (3) Tạo hồ sơ ở trạng thái “Chờ xử lý” → (4) Cập nhật ngày bắt đầu/hoàn thành → (5) Đóng hồ sơ; phòng về trống nếu đã sửa xong.
- **Ngoại lệ**: Sự cố ảnh hưởng an toàn → chuyển phòng sang bảo trì ngay.
- **Hiện trạng**: ◐ bảng `MaintenanceRecords`, `EquipmentConditionLogs` có nhưng chưa có service/API.

---

## Nhóm C — Đăng ký và duyệt

### UC11 — Xem lịch phòng
- **Tác nhân**: Tất cả. **Mô tả**: Xem các lượt đặt của một phòng theo ngày/tuần.
- **Luồng chính**: (1) Chọn phòng + ngày → (2) Hệ thống trả các chi tiết còn hiệu lực (không gồm Từ chối/Đã hủy) → (3) Hiển thị theo tiết hoặc theo giờ.
- **Ngoại lệ**: Ngày không hợp lệ; phòng không tồn tại.
- **Hiện trạng**: ✔ `GET /api/Rooms/{id}/schedule`, `GET /api/Bookings/rooms/{roomId}/schedule`.

### UC12 — Tìm phòng trống
- **Tác nhân**: Người dùng, Nhân sự. **Mô tả**: Tìm phòng còn trống theo loại phòng, ngày, tiết/khung giờ, sức chứa.
- **Luồng chính**: (1) Nhập bộ lọc → (2) Hệ thống loại phòng bảo trì và phòng có lịch trùng → (3) Trả danh sách kèm sức chứa, thiết bị → (4) Chọn phòng để đặt.
- **Ngoại lệ**: Không có kết quả → gợi ý khung giờ gần nhất.
- **Quy tắc**: BR-02, BR-04, BR-09. **Hiện trạng**: ✔ `GET /api/Rooms/available`.

### UC13 — Tạo đơn đặt phòng
- **Tác nhân**: Người dùng. **Mô tả**: Tạo đơn gồm một hoặc nhiều phòng, theo tiết hoặc theo giờ.
- **Tiền điều kiện**: Đã đăng nhập, không bị hạn chế quyền. **Hậu điều kiện**: Đơn “Chờ duyệt” (hoặc tự động duyệt), sinh phiên “Chờ nhận phòng” khi chi tiết được duyệt.
- **Luồng chính**: (1) Chọn phòng + thời gian + số người + hoạt động/mục đích → (2) Kiểm tra quyền theo vai trò/loại phòng → (3) Kiểm tra khung giờ, thời lượng, ngày → (4) Kiểm tra hạn chế quyền → (5) Kiểm tra trùng lịch và phòng bảo trì → (6) Tạo đơn + chi tiết → (7) Áp dụng duyệt tự động nếu bật → (8) Gửi thông báo/email.
- **Ngoại lệ**: Vượt quyền → 403; trùng lịch → 409/400 kèm gợi ý; bị hạn chế → từ chối; phòng bảo trì → từ chối.
- **Quy tắc**: BR-02, BR-03, BR-04, BR-09, BR-14, BR-17. **Hiện trạng**: ✔ `POST /api/Bookings`.

### UC14 — Theo dõi trạng thái đơn
- **Tác nhân**: Người dùng, Nhân sự. **Mô tả**: Xem danh sách đơn và trạng thái từng phòng, lý do từ chối, mã điểm danh.
- **Luồng chính**: (1) Mở “Đơn của tôi” → (2) Lọc theo trạng thái/thời gian → (3) Xem chi tiết: phòng, giờ, trạng thái từng phòng, người duyệt, lý do → (4) Mở thao tác phù hợp (hủy, nhận phòng, gia hạn, đánh giá).
- **Hiện trạng**: ✔ `GET /api/Bookings/my`, `GET /api/Bookings/{id}`.

### UC15 — Hủy đơn
- **Tác nhân**: Người dùng, Nhân sự. **Mô tả**: Hủy đơn trước giờ sử dụng.
- **Tiền điều kiện**: Đơn đã duyệt/chờ duyệt, chưa nhận phòng. **Hậu điều kiện**: Đơn “Đã hủy”, phiên “Đã hủy”, phòng được giải phóng.
- **Luồng chính**: (1) Chọn Hủy → (2) Chọn lý do (thay đổi kế hoạch/không còn nhu cầu/khác) → (3) Kiểm tra now ≤ T−3 giờ (người dùng) → (4) Cập nhật trạng thái + lý do + nguồn → (5) Thông báo/email.
- **Ngoại lệ**: Quá hạn hủy → yêu cầu liên hệ nhân sự; lý do “Khác” thiếu nội dung → chặn.
- **Quy tắc**: BR-11, BR-15. **Hiện trạng**: ✔ `PATCH /api/Bookings/{id}/cancel`.

### UC16 — Duyệt/từ chối toàn đơn
- **Tác nhân**: Nhân sự, Quản lý, Admin. **Mô tả**: Quyết định tất cả phòng trong đơn cùng lúc.
- **Luồng chính**: (1) Mở hàng chờ duyệt (lọc theo đơn vị) → (2) Xem đơn → (3) Chọn Duyệt hoặc Từ chối + lý do → (4) Cập nhật tất cả chi tiết + đơn → (5) Ghi audit → (6) Gửi email/thông báo.
- **Ngoại lệ**: Đơn đã được xử lý → báo trạng thái mới nhất; thiếu quyền theo đơn vị → 403.
- **Quy tắc**: BR-05, BR-15, BR-16. **Hiện trạng**: ✔ `PATCH /api/Bookings/{id}/approve`.

### UC17 — Duyệt/từ chối từng phòng
- **Tác nhân**: Nhân sự, Quản lý, Admin. **Mô tả**: Quyết định riêng từng chi tiết; đơn tự cập nhật Đã duyệt/Duyệt một phần/Từ chối.
- **Luồng chính**: (1) Mở đơn nhiều phòng → (2) Chọn từng phòng → (3) Duyệt/từ chối + lý do → (4) Cập nhật chi tiết, tính lại trạng thái đơn → (5) Tạo phiên cho phòng được duyệt → (6) Ghi audit + email.
- **Ngoại lệ**: Tất cả bị từ chối → đơn “Từ chối”; một phần → “Duyệt một phần”.
- **Quy tắc**: BR-05, BR-15, BR-16, BR-21. **Hiện trạng**: ✔ `PATCH /api/Bookings/details/{detailId}/approve`.

### UC18 — Điều chỉnh phòng hoặc thời gian khi duyệt
- **Tác nhân**: Nhân sự, Quản lý. **Mô tả**: Khi duyệt, đổi sang phòng khác hoặc khung giờ khác nếu phòng yêu cầu không còn phù hợp.
- **Luồng chính**: (1) Chọn Điều chỉnh → (2) Chọn phòng/giờ thay thế → (3) Kiểm tra trùng lịch + quyền của người đặt → (4) Lưu thay đổi, ghi lý do → (5) Hiển thị cho người dùng và gửi email.
- **Ngoại lệ**: Phương án mới trùng lịch/vượt quyền → chặn; người dùng không đồng ý → hủy chi tiết.
- **Quy tắc**: BR-02, BR-04, BR-05, BR-16. **Hiện trạng**: ✖ chưa có endpoint.

### UC19 — Cấu hình duyệt tự động
- **Tác nhân**: Admin, Quản lý. **Mô tả**: Bật/tắt duyệt tự động toàn hệ thống, duyệt hàng loạt đơn đang chờ.
- **Luồng chính**: (1) Mở cấu hình → (2) Bật/tắt `booking.autoApprove` → (3) Lưu người thực hiện + thời điểm → (4) Với đơn mới, hệ thống duyệt ngay bằng tài khoản hệ thống; có thể chạy duyệt hàng loạt đơn chờ.
- **Ngoại lệ**: Tài khoản hệ thống không được đăng nhập; lỗi cấu hình → giữ chế độ thủ công.
- **Quy tắc**: BR-16, BR-17. **Hiện trạng**: ✔ `SystemSettings`, `POST /api/Bookings/auto-approval/approve-pending`.

---

## Nhóm D — Khai thác phòng

### UC20 — Gửi mã OTP điểm danh
- **Tác nhân**: Người dùng, Hệ thống. **Mô tả**: Gửi mã 6 số tới email người đặt khi cửa sổ nhận phòng mở.
- **Tiền điều kiện**: Chi tiết đã duyệt; phiên “Chờ nhận phòng”; now ∈ `[T−15, T)`. **Hậu điều kiện**: OTP hợp lệ có hạn 10 phút được lưu dạng hash và gửi email.
- **Luồng chính**: (1) Người dùng bấm “Gửi mã điểm danh” (hoặc hệ thống tự gửi khi mở cửa sổ) → (2) Kiểm tra quyền sở hữu phiên → (3) Kiểm tra tần suất (≥60 giây, ≤3 lần) → (4) Sinh mã 6 số, lưu hash + hạn + số lần = 0 → (5) Gửi email tới `AspNetUsers.Email` → (6) Ghi `EmailOutbox` và trạng thái gửi.
- **Ngoại lệ**: Ngoài cửa sổ → “Chưa đến giờ nhận phòng”; gửi quá nhiều → “Vui lòng thử lại sau 60 giây”; SMTP lỗi → xếp hàng gửi lại, không chặn check-in.
- **Quy tắc**: BR-06, BR-21. **Hiện trạng**: ✖ hiện chỉ gửi mã tĩnh `HUIT-xxxxx` lúc duyệt, không có OTP động.

### UC21 — Xác thực OTP để nhận phòng
- **Tác nhân**: Người dùng. **Mô tả**: Nhập OTP để bắt đầu phiên sử dụng.
- **Tiền điều kiện**: Có OTP còn hạn, chưa dùng; phiên chưa check-in; phòng không bảo trì. **Hậu điều kiện**: Phiên “Đang sử dụng”; `ActualCheckIn`, `ActualGuestCount`; phòng “Đang sử dụng”; `Booking.CheckedInAt` được đặt.
- **Luồng chính**: (1) Nhập mã + số người thực tế → (2) Đối chiếu hash, hạn, trạng thái, số lần nhập → (3) Kiểm tra cửa sổ, phòng, số người ≤ sức chứa → (4) Đánh dấu OTP đã dùng → (5) Cập nhật phiên/đơn/phòng → (6) Thông báo thành công.
- **Ngoại lệ**: Sai → tăng `AttemptCount`, còn 5 lần; hết hạn → yêu cầu gửi lại; quá số lần → khóa mã; đã dùng → từ chối; quá T → chuyển no-show.
- **Quy tắc**: BR-06, BR-08, BR-09, BR-21. **Hiện trạng**: ◐ có check-in nhưng bằng mã tĩnh hoặc bấm nút.

### UC22 — Nhân viên check-in hộ
- **Tác nhân**: Nhân sự. **Mô tả**: Nhận phòng thay khi người dùng không nhận được email hoặc không có thiết bị.
- **Luồng chính**: (1) Tìm phiên theo phòng/ngày → (2) Chọn Check-in hộ → (3) Kiểm tra đơn vị quản lý → (4) Nhập số người thực tế + lý do → (5) Ghi nhận phương thức `STAFF_OVERRIDE`, người thực hiện → (6) Cập nhật phiên.
- **Ngoại lệ**: Ngoài đơn vị → 403; phiên đã dùng/hoàn thành → chặn.
- **Quy tắc**: BR-06, BR-21. **Hiện trạng**: ◐ có quyền check-in hộ nhưng chưa phân biệt phương thức/lý do.

### UC23 — Tự động hủy no-show
- **Tác nhân**: Hệ thống. **Mô tả**: Hủy các phiên đã duyệt nhưng quá T chưa nhận phòng.
- **Tiền điều kiện**: Đơn “Đã duyệt”/“Duyệt một phần”; phiên “Chờ nhận phòng”; now ≥ T; `CheckedInAt` rỗng.
- **Hậu điều kiện**: Đơn/chi tiết/phiên “Đã hủy” với lý do `NO_SHOW`, nguồn `AUTO`; phòng về trống; thông báo + email.
- **Luồng chính**: (1) Tác vụ nền chạy mỗi 30 giây → (2) Tìm phiên quá hạn → (3) Giành quyền xử lý nguyên tử → (4) Cập nhật trạng thái + lý do → (5) Giải phóng phòng → (6) Ghi thông báo.
- **Ngoại lệ**: Đã check-in đồng thời → bỏ qua; chạy lặp/nhiều instance → không hủy hai lần.
- **Quy tắc**: BR-07, BR-08. **Hiện trạng**: ✔ `BookingNoShowWatcher` + `BookingNoShowService`; chưa gửi email no-show.

### UC24 — Trả phòng và checklist hiện trạng
- **Tác nhân**: Người dùng, Nhân sự. **Mô tả**: Kết thúc phiên, ghi nhận hiện trạng phòng.
- **Tiền điều kiện**: Phiên “Đang sử dụng”. **Hậu điều kiện**: Phiên/chi tiết “Hoàn thành”; phòng “Trống” hoặc “Bảo trì”; đơn “Hoàn thành” khi tất cả chi tiết kết thúc.
- **Luồng chính**: (1) Chọn Trả phòng → (2) Nhập checklist thiết bị/sạch sẽ/đèn + ghi chú → (3) Ghi `ActualCheckOut` → (4) Xác định trạng thái phòng → (5) Cập nhật phiên/chi tiết/đơn → (6) Cho phép gửi đánh giá.
- **Ngoại lệ**: Thiết bị không đạt → phòng bảo trì + mô tả sự cố; phiên đã hoàn thành → chặn.
- **Quy tắc**: BR-10, BR-20. **Hiện trạng**: ✔ `POST /api/UsageSessions/check-out`.

### UC25 — Gia hạn thời gian sử dụng
- **Tác nhân**: Người dùng, Nhân sự. **Mô tả**: Kéo dài giờ kết thúc của phiên đang sử dụng.
- **Tiền điều kiện**: Phiên “Đang sử dụng”; còn trong ngày/khung giờ. **Hậu điều kiện**: `EndAt` mới; lưu lịch sử gia hạn.
- **Luồng chính**: (1) Chọn Gia hạn → (2) Chọn giờ kết thúc mới → (3) Kiểm tra không chồng lịch đơn kế tiếp, không vượt giờ phục vụ/quyền → (4) Cập nhật chi tiết + tạo `BookingExtensions` → (5) Thông báo.
- **Ngoại lệ**: Trùng lịch → từ chối; vượt thời lượng tối đa → từ chối.
- **Quy tắc**: BR-03, BR-04, BR-12. **Hiện trạng**: ✔ `POST /api/UsageSessions/{id}/extend` (áp dụng ngay, không duyệt).

### UC26 — Nhắc lịch sắp đến / sắp kết thúc
- **Tác nhân**: Hệ thống. **Mô tả**: Gửi nhắc trước giờ bắt đầu và trước giờ kết thúc.
- **Luồng chính**: (1) Tác vụ nền quét mỗi phút → (2) Tìm phiên trong ngưỡng 30 phút trước T hoặc 15 phút trước kết thúc → (3) Tạo thông báo, đánh dấu đã nhắc để không lặp → (4) Gửi email/in-app.
- **Ngoại lệ**: Phiên đã hủy/hoàn thành → bỏ qua; lỗi gửi → ghi log, không chặn.
- **Quy tắc**: BR-15. **Hiện trạng**: ◐ `BookingReminderWatcher` tạo thông báo; chưa email/push.

### UC27 — Thông báo kết quả duyệt/hủy/vi phạm
- **Tác nhân**: Hệ thống, Nhân sự. **Mô tả**: Gửi thông báo khi trạng thái đơn thay đổi hoặc có vi phạm.
- **Luồng chính**: (1) Sự kiện duyệt/từ chối/hủy/no-show/vi phạm → (2) Tạo bản ghi `Notifications` → (3) Gửi email theo mẫu → (4) Hiển thị trong trung tâm thông báo.
- **Ngoại lệ**: Người dùng thiếu email → chỉ tạo thông báo trong hệ thống.
- **Quy tắc**: BR-15. **Hiện trạng**: ✔ thông báo DB + email duyệt/hủy; ✖ email no-show/nhắc lịch.

### UC28 — Trung tâm thông báo
- **Tác nhân**: Tất cả. **Mô tả**: Xem, đánh dấu đã đọc thông báo.
- **Luồng chính**: (1) Mở chuông thông báo → (2) Xem danh sách mới nhất → (3) Mở chi tiết, đánh dấu đã đọc → (4) Đếm số chưa đọc.
- **Hiện trạng**: ✔ `NotificationsController`; ✖ chưa đẩy realtime qua SignalR.

---

## Nhóm E — Kiểm soát và vận hành

### UC29 — Lập biên bản vi phạm
- **Tác nhân**: Nhân sự, Admin. **Mô tả**: Ghi nhận vi phạm nội quy của người dùng.
- **Luồng chính**: (1) Chọn người dùng/phiên → (2) Chọn loại vi phạm, mức độ, mô tả, thời điểm → (3) Xác định hình phạt (nhắc nhở/cảnh cáo/cấm) → (4) Lưu biên bản → (5) Gửi nhắc nhở → (6) Tạo hạn chế nếu có.
- **Ngoại lệ**: Vi phạm không gắn phiên → vẫn cho lập; trùng biên bản → cảnh báo.
- **Quy tắc**: BR-13, BR-14. **Hiện trạng**: ✔ `ViolationRecords`, `ViolationsController`.

### UC30 — Khóa/mở quyền đăng ký
- **Tác nhân**: Nhân sự, Admin. **Mô tả**: Hạn chế người dùng vi phạm nhiều lần không được tạo đơn mới.
- **Luồng chính**: (1) Mở hồ sơ người dùng → (2) Tạo hạn chế: loại, lý do, từ ngày, đến ngày → (3) Hệ thống chặn tạo đơn khi còn hiệu lực → (4) Kết thúc hạn chế hoặc mở thủ công → (5) Ghi audit.
- **Ngoại lệ**: Hạn chế vô thời hạn cần Quản lý/Admin; hết hạn tự động hết hiệu lực.
- **Quy tắc**: BR-14. **Hiện trạng**: ✔ `UserRestrictions`; ◐ cần job tự động mở khi hết hạn.

### UC31 — Quản lý ca trực và nhật ký trực
- **Tác nhân**: Nhân sự, Quản lý, Admin. **Mô tả**: Xếp ca, phân công nhân viên, ghi nhật ký phát sinh trong ca.
- **Luồng chính**: (1) Tạo ca theo ngày/giờ → (2) Phân công nhân viên → (3) Trong ca, ghi nhật ký (sự cố, bàn giao) → (4) Kết thúc ca, tổng hợp.
- **Ngoại lệ**: Trùng ca của cùng nhân viên → cảnh báo; ca không có người → cảnh báo.
- **Hiện trạng**: ✔ `Shifts`, `EmployeeShift`, `ShiftLogs`, `ShiftsController`.

### UC32 — Chat với nhân viên trực
- **Tác nhân**: Người dùng, Nhân sự. **Mô tả**: Hội thoại hỗ trợ theo thời gian thực.
- **Luồng chính**: (1) Mở chat → (2) Hệ thống gợi ý nhân viên đang trực → (3) Gửi/nhận tin qua SignalR → (4) Lưu lịch sử, đánh dấu đã đọc.
- **Ngoại lệ**: Mất kết nối → tự kết nối lại; không có nhân viên trực → tạo hội thoại chờ.
- **Hiện trạng**: ✔ `ChatHub`, `ChatController`; ◐ nginx chưa proxy `/hubs/`.

### UC33 — Tìm kiếm và tra cứu lịch sử
- **Tác nhân**: Tất cả. **Mô tả**: Tìm phòng, người mượn, phiếu mượn, biên bản; xem lịch sử đăng ký/sử dụng/vi phạm.
- **Luồng chính**: (1) Nhập từ khóa/bộ lọc → (2) Hệ thống tìm theo mã, tên, email, phòng, khoảng ngày → (3) Trả kết quả có phân trang → (4) Mở chi tiết.
- **Ngoại lệ**: Không có kết quả → thông báo; người dùng thường chỉ thấy dữ liệu của mình.
- **Hiện trạng**: ◐ có lọc rời rạc trong từng controller; chưa có tìm kiếm tổng hợp.

### UC34 — Báo cáo thống kê
- **Tác nhân**: Admin, Quản lý, Nhân sự. **Mô tả**: Tổng hợp tần suất sử dụng, tỷ lệ trống, lượt mượn, vi phạm, điểm danh.
- **Luồng chính**: (1) Chọn loại báo cáo + khoảng thời gian + đơn vị/phòng → (2) Truy vấn dữ liệu → (3) Hiển thị bảng/biểu đồ → (4) Xuất CSV → (5) Lưu lịch sử xuất nếu cần.
- **Ngoại lệ**: Khoảng thời gian quá lớn → giới hạn; không có dữ liệu → trả rỗng.
- **Hiện trạng**: ✔ `/api/Reports/overview|bookings|room-usage|violations|export`; ◐ chưa có báo cáo điểm danh/no-show riêng.

### UC35 — Gửi phản hồi đánh giá
- **Tác nhân**: Người dùng. **Mô tả**: Đánh giá phòng/thiết bị/chất lượng phục vụ sau phiên.
- **Tiền điều kiện**: Phiên “Hoàn thành”. **Hậu điều kiện**: Đánh giá 1–5 sao + nhận xét được lưu.
- **Luồng chính**: (1) Mở phiên đã hoàn thành → (2) Chọn số sao, nhập nhận xét → (3) Kiểm tra mỗi phiên một đánh giá → (4) Lưu → (5) Cảm ơn và đóng.
- **Ngoại lệ**: Phiên chưa hoàn thành → chặn; đã đánh giá → cho sửa hoặc chặn tùy chính sách.
- **Hiện trạng**: ✔ `Feedbacks`, `FeedbacksController`.
