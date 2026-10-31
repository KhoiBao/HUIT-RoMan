# Phân tích và thiết kế hệ thống — HUIT RoMan

Bộ tài liệu phục vụ báo cáo khóa luận **CNTT-KLCN236: Xây dựng hệ thống quản lý đăng ký và khai thác phòng dùng chung tại Trường Đại học Công Thương TP.HCM**.

| # | Tài liệu | Nội dung | Dùng cho mục báo cáo |
|---|---|---|---|
| 01 | [Khảo sát hiện trạng](01-khao-sat-hien-trang.md) | Tác nhân, biểu mẫu, vấn đề, 21 quy tắc nghiệp vụ, thay đổi QR → OTP | Chương khảo sát, phạm vi |
| 02 | [Mô hình nghiệp vụ](02-nghiep-vu-va-use-case.md) | 15 nghiệp vụ / 5 nhóm, sơ đồ use case nghiệp vụ, activity diagram, truy vết đề cương | Phân tích nghiệp vụ |
| 03 | [Đặc tả use case](03-dac-ta-use-case.md) | 35 use case hệ thống: luồng chính, ngoại lệ, quy tắc, hiện trạng | Phân tích hệ thống |
| 04 | [Kiến trúc hệ thống](04-kien-truc-he-thong.md) | Modular monolith N-layer, module, sequence, bảo mật, triển khai, ADR | Thiết kế kiến trúc |
| 05 | [Thiết kế CSDL](05-thiet-ke-csdl.md) | ERD, từ điển 28 bảng nghiệp vụ + 7 Identity + 5 bảng bổ sung, ràng buộc, DDL, báo cáo SQL | Thiết kế dữ liệu |
| 06 | [Điểm danh OTP](06-diem-danh-otp.md) | Thay QR bằng OTP Gmail: quy tắc, đe dọa, API, UI, báo cáo, kiểm thử | Chức năng điểm danh |

## Con số chốt

- **15 nghiệp vụ**, **5 nhóm**, **35 use case hệ thống**.
- **28 bảng nghiệp vụ** hiện có + **7 bảng Identity** (`AspNetUsers` đóng vai `Users`) và **5 bảng bổ sung**: `OtpCodes`, `ApprovalSteps`, `EmailOutbox`, `RoomStatusHistory`, `AuditLogs`.
- Điểm danh: **OTP 6 số qua Gmail người đặt**, hạn `min(10 phút, T)`, 5 lần nhập, 3 lần gửi lại, dùng một lần.

## Cách đọc

- Bắt đầu từ 01 để nắm phạm vi và quy tắc.
- 02–03 là phần phân tích; 04–05 là phần thiết kế; 06 là thiết kế chi tiết thay đổi so với đề cương.
- Các sơ đồ dùng Mermaid, xem được trên GitHub/VS Code Markdown Preview.
- Tài liệu mô tả **trạng thái đích** và ghi rõ khoảng trống so với mã nguồn hiện tại; không thay thế mã nguồn.

## Ghi chú khi đưa vào báo cáo

- Đề cương ghi “SQL Server” ở tuần 4 nhưng mục 7 ghi PostgreSQL; bộ tài liệu bám **PostgreSQL** theo môi trường và mã nguồn.
- Đề cương yêu cầu QR; báo cáo cần nêu rõ thay đổi sang OTP và phần giới hạn (OTP không chứng minh hiện diện vật lý).
- Bảng người dùng vật lý là `AspNetUsers`, không phải `Users`, dù entity có `[Table("Users")]`.
- Tài liệu `docs/api.md` hiện chưa đồng bộ với mã nguồn (thiếu endpoint gia hạn, quên mật khẩu).
