---
target: trang quản lý, thủ thư và admin
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:K:\\KLCN\\HUIT-RoMan\\web\\src\\pages\\AdminDashboardPage.tsx"
target_fingerprint: "sha256:a119935cdc18b248843f8b89bec171e9ffc28c93969b21c6f346982e31d550a9"
target_path: "K:\\KLCN\\HUIT-RoMan\\web\\src\\pages\\AdminDashboardPage.tsx"
timestamp: 2026-10-29T10-55-07Z
slug: web-src-pages-admindashboardpage-tsx
---
# Critique — Bảng điều khiển Nhân sự & Quản trị (`/staff`, `/admin`)

Method: dual-agent (A: critique-A-design · B: critique-B-detector)

## Điểm sức khoẻ thiết kế

| # | Tiêu chí (Nielsen) | Điểm | Vấn đề chính |
|---|---|---|---|
| 1 | Hiển thị trạng thái hệ thống | 3 | Badge rõ nhưng các con số mâu thuẫn nhau |
| 2 | Khớp với thế giới thực | 4 | Từ vựng HUIT (tiết, MSSV, ca, biên bản) rất thật |
| 3 | Kiểm soát & tự do của người dùng | 2 | Duyệt 1 click không hoàn tác; Esc không đóng search; tab không lên URL |
| 4 | Nhất quán & chuẩn mực | 2 | Chip / pill / select lẫn lộn cho cùng một việc lọc; "Đã trả" là nút nhưng đọc như trạng thái |
| 5 | Phòng ngừa lỗi | 2 | Từ chối bắt buộc lý do (tốt); duyệt và khóa tài khoản thì không |
| 6 | Nhận biết thay vì ghi nhớ | 2 | Phải mở từng card mới thấy phòng + giờ |
| 7 | Linh hoạt & hiệu quả | 3 | Có Ctrl+K + lọc; thiếu duyệt hàng loạt, thiếu "đơn tiếp theo" |
| 8 | Thẩm mỹ & tối giản | 2 | 4 stat card + 4 chip + 3 CTA trên mọi tab; biểu đồ gần như trống |
| 9 | Nhận diện & phục hồi lỗi | 2 | Toast tiếng Việt cụ thể nhưng biến mất, không được đọc bởi AT |
| 10 | Trợ giúp & tài liệu | 1 | Không có gợi ý nào về cửa sổ check-in 15 phút hay chính sách duyệt |
| **Tổng** | | **23/40** | **Acceptable — cần cải thiện đáng kể** |

## Đánh giá độ đặc thù thiết kế

**LLM:** Đặc thù ở tầng từ vựng, chung chung ở tầng quy trình. Không thể nhầm với SaaS khác nhờ `Phòng Lý thuyết B302`, `Theo Tiết học`, `Ca Sáng – Điều phối phòng Lab`, `MSSV`, `VT05 – Làm hư hỏng hoặc thất thoát trang thiết bị`, và bảng duyệt theo từng phòng (`AdminBookingApprovalTab.tsx:646-700`). Nhưng cấu trúc thì giống mọi dashboard CRUD: hero + 4 stat card + filter chip + bảng, cùng 3 CTA toàn cục lặp lại trên mọi tab (`AdminDashboardPage.tsx:1215-1262`). Không có chỗ nào trong layout mã hoá *duyệt tuần tự 20 đơn* hay *trực ca*. Đổi chuỗi là thành app duyệt nghỉ phép.

**Deterministic scan:** `impeccable detect --json` trên 3 target markup trả **0 finding (exit 0)** — nhưng đó là false negative có hệ thống: console style bằng class trong `index.css`/`roman.css`, nên detector tĩnh bị mù. Quét rộng `detect web/src` ra 14 finding: `side-tab` ×10 (đều ở `index.css`), `layout-transition` ×3, `overused-font` ×1. Các `side-tab` thật nằm ở `index.css:6397, 7425, 7433, 7441, 7449` và được dùng bởi `AdminBookingApprovalTab` / `AdminUsageSessionsTab`.

**Overlay trình duyệt:** Chèn `detect.js` thành công trên 5 view (Tổng quan 14, Duyệt đơn 11, Vi phạm 17, Người dùng 25, Báo cáo 10, Phiên sử dụng 27). Rule lặp lại: `low-contrast` (tới 17 ở Người dùng), `tiny-text` (7 ở Vi phạm), `undersized-ui-text` 9.5–10.5px ở sidebar, `side-tab` ×4 ở Phiên sử dụng, `layout-transition` ×2, `overused-font` Inter 56–73%, `pulsing-dot`, `cramped-padding`, `skipped-heading`. Giá trị đo được: `#fff` trên `#d97706` = **3.2:1** (badge điều hướng), `#94a3b8` trên `#f8fafc` = **2.5:1** (badge phiên đã huỷ), `#0284c7` trên `#f0f9ff` = **3.8:1**. Overlay chạy qua headless Edge CDP vì MCP screenshot trả viewport 0x0; live-server đã dừng.

## Ấn tượng tổng thể

Bộ khung chắc, từ vựng đúng nghiệp vụ HUIT, và luồng phân quyền đã đúng (staff 9 mục, admin 13 mục, staff vào `/admin` bị đá về login). Nhưng đây là console *vận hành* mà lại được thiết kế như *báo cáo trình diễn*: thứ đập vào mắt là 4 thẻ số liệu và một biểu đồ trống, còn việc thủ thư làm cả ngày — duyệt đơn, xử lý vi phạm — lại nằm sau một click mở card, không có xác nhận, không có hoàn tác. Cơ hội lớn nhất: biến tab Duyệt đơn thành một hàng đợi thật sự, và làm số liệu đáng tin.

## Những gì đang tốt

1. **Hộp thoại xác nhận khoá tài khoản** (`ConfirmContext.tsx:153-178`) có subMessage + itemDetails + icon theo mức độ — tốt hơn phần lớn đồ án. Câu "Người dùng này sẽ bị chặn đăng nhập và tạm ngưng quyền mượn phòng ngay lập tức." là đúng kiểu thông điệp hậu quả.
2. **Phân quyền theo vai trò được kiểm chứng live**: staff không thấy tab quản trị, vào `/admin` bị chặn (`AdminDashboardPage.tsx:283, 992-995`).
3. **Bảng báo cáo đúng nghiệp vụ**: xếp hạng phòng với `SỨC CHỨA / LƯỢT MƯỢN / TỔNG GIỜ DÙNG / TỶ LỆ LẤP ĐẦY`, bảng tài khoản bị cấm với `SỐ NGÀY CÒN` — thứ quản lý thư viện thật sự cần.

## Vấn đề ưu tiên

### [P1] Duyệt đơn một chạm, không xác nhận, không hoàn tác, không ghi người duyệt
- **Vì sao quan trọng:** `handleApproveBooking` (`AdminBookingApprovalTab.tsx:141-178`) gọi PATCH ngay khi bấm, duyệt **toàn bộ phòng** trong đơn, rồi chỉ báo bằng toast 3.5s. Bấm nhầm lúc cao điểm là mất phòng của sinh viên, không có đường lùi, không biết ai duyệt. Đây là hành động rủi ro cao nhất của sản phẩm nhưng lại được bảo vệ ít nhất.
- **Fix:** Sheet xác nhận liệt kê phòng + tiết + người đặt (tái dùng pattern modal từ chối); toast có "Hoàn tác trong 10s"; nút "Duyệt & đơn tiếp theo"; hiển thị người duyệt + thời điểm trên đơn.
- **Lệnh gợi ý:** `/impeccable harden`

### [P1] Số liệu trên dashboard mâu thuẫn, làm mất niềm tin vào hệ thống đặt phòng
- **Vì sao quan trọng:** Ảnh chụp thật cho thấy `Tổng lượt mượn phòng: 3` nhưng `Duyệt thành công: 0% (0 đơn)`; `Ca đang diễn ra: 1` trong khi cột hôm nay ghi "Chưa có ca trực"; báo cáo phòng hiện `LƯỢT MƯỢN 0` cạnh `TỔNG GIỜ DÙNG 70 giờ` và `19.4%`. Với sản phẩm mà toàn bộ giá trị là "trạng thái đơn chính xác", số liệu tự mâu thuẫn phá niềm tin nhanh hơn mọi lỗi giao diện.
- **Fix:** Tính cả 4 thẻ từ một query duy nhất; hiện "—" khi mẫu số = 0; thêm caption "chưa có dữ liệu trong kỳ" thay vì 0%.
- **Lệnh gợi ý:** `/impeccable harden`

### [P1] Ô tìm kiếm toàn cục ghi "Esc" nhưng Esc không làm gì, không có nút đóng
- **Vì sao quan trọng:** `AdminGlobalSearchModal.tsx:90-122` không có keydown handler, không `role="dialog"`, không focus trap. Người dùng bàn phím bị kẹt, chỉ thoát được bằng click backdrop hoặc chip "Esc" giả. UI còn tự hứa "Esc" — sai lời hứa tệ hơn không hứa.
- **Fix:** Thêm `keydown` Escape, nút X, `role="dialog"` + `aria-modal` + focus trap + trả focus về nút mở.
- **Lệnh gợi ý:** `/impeccable audit`

### [P1] Tương phản và cỡ chữ dưới ngưỡng AA ở các nhãn quan trọng
- **Vì sao quan trọng:** Detector tại runtime đo được 3.2:1 (badge trắng trên cam `#d97706`), 2.5:1 (badge phiên đã huỷ), 3.8:1 (hoàn thành), header bảng 4.45:1; nhãn sidebar 9.5–10.5px, text KPI 11.5px. Ngưỡng AA là 4.5:1 và ảnh hưởng trực tiếp người lớn tuổi / màn hình chiếu trong phòng họp.
- **Fix:** Đổi badge sang nền đậm hơn hoặc chữ tối; nâng text phụ lên ≥12px; đặt token màu trạng thái trong CSS thay vì rải rác.
- **Lệnh gợi ý:** `/impeccable colorize` + `/impeccable typeset`

### [P2] Bảng Vi phạm / Phiên sử dụng tràn và cắt mất cột thao tác ở màn 1440
- **Vì sao quan trọng:** Phiên sử dụng: bảng 1179px trong wrapper 1130px → header "THAO TÁC" và nút hành động bị cắt; scrollWidth trang 1466 > 1440. Vi phạm: cột mô tả ~130px làm mã `VP-20261023-002` xuống 3 dòng, pill "Cấm mượn (6 ngày)" tràn hàng, mỗi dòng cao ~225px. Đây là chỗ thủ thư thao tác nhiều nhất.
- **Fix:** Master/detail 2 dòng (mã + người ở dòng 1, mô tả clamp dòng 2), đưa Mức độ/Trạng thái lên header dòng, sticky cột thao tác; hoặc chuyển sang card-per-row dưới 1200px.
- **Lệnh gợi ý:** `/impeccable layout` + `/impeccable adapt`

## Cờ đỏ theo persona

**Alex (power user):** Tab không lưu vào URL — mọi lần chuyển tab vẫn là `/admin`, nên không link được, Back thoát khỏi console, F5 reset về Tổng quan (`AdminDashboardPage.tsx:1029-1090`). Không duyệt hàng loạt, không sort có chỉ báo, chỉ có Ctrl+K.

**Sam (accessibility):** 0 `aria-label` trong 13 component admin; toast không có `role="status"`/`aria-live` (`AdminDashboardPage.tsx:1006`); focus ring trong console rơi về outline 1px mặc định (chỉ `.roman-header`/`.rh-page` được style, `roman.css:459`); dialog xác nhận không trap focus và auto-focus vào nút phá huỷ (`ConfirmContext.tsx:195`) → Enter đúp là khoá tài khoản.

**Thủ thư Thu (duyệt 20 đơn/ca):** Card duyệt giấu phòng + giờ + tiết sau "Xem chi tiết"; 4 stat card chiếm chỗ cô ấy đã biết từ badge; dữ liệu demo có **0 đơn chờ duyệt** nên luồng chính cô ấy cần thử lại vô hình.

## Quan sát nhỏ

- 390px vỡ hẳn: sidebar cố định 250px, nội dung còn ~140px, H1 xuống 6 dòng, bảng 759px bị cắt; không có hamburger/drawer.
- Ảnh 1440: biểu đồ 220px chỉ có 3 cột ~26px màu `#e2e8f0`, không trục Y → đọc như khung trống.
- Nút "+ Đặt phòng nhanh" render dấu `+` cạnh icon plus (hai dấu cộng).
- "Thêm phòng mới" xuất hiện 2 lần trên cùng màn (hero + header card).
- Cột THAO TÁC của Phiên sử dụng ghi "Đã trả" — đọc như trạng thái, không như nút.
- Input ngày native hiện `mm/dd/yyyy` và `10/29/2026 10:48 AM` giữa UI dd/mm.
- Ô "Mã phiên sử dụng (Tùy chọn)" là text tự do → phải nhớ mã.
- Reset mật khẩu điền sẵn `Huit@123` (`AdminUsersTab.tsx:189`).
- Nút xoá vi phạm chỉ có `title`, không `aria-label`.
- Dữ liệu demo vi phạm chính nghiệp vụ: phiên `HUIT-97107` check-in 25/10 cho đơn 26/10.
- Bubble "Chat mới" đè lên góc dưới-phải bảng ở mọi tab.
- Tab Vi phạm hiển thị "2" ba lần (stat card, chip lọc, badge sub-tab).
- Trạng thái no-show lộ chuỗi backend thô: "Tự động hủy (không nhận phòng): Không nhận phòng đúng hạn (tự động hủy)".

## Câu hỏi để cân nhắc

1. Nếu thủ thư duyệt nhầm đơn lúc 9:00 cao điểm, đường phục hồi là gì — và vì sao sản phẩm có hộp thoại xác nhận cho khoá tài khoản nhưng không có cho duyệt?
2. Dashboard này phục vụ thư viện hay phục vụ buổi bảo vệ? "Duyệt thành công: 0% (0 đơn)" là chỉ số slide, không phải tín hiệu vận hành — thủ thư cần thấy gì lúc 7:55 trước ca?
3. Cửa sổ check-in 15 phút là ràng buộc sắc nhất của sản phẩm. Nó xuất hiện ở đâu trong console *trước khi* hành động, hay chỉ lộ ra khi đơn đã bị tự huỷ?
