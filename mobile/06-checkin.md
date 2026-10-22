# Check-in / Check-out (F-006) — dự kiến

## Mục đích
Nhận phòng và trả phòng sau khi đơn đặt phòng được duyệt (thuộc module `Usage`).

## Người dùng
Người dùng (`Student`, `Lecturer`) đã có đơn trạng thái `Đã duyệt`.

## Trạng thái hiện tại
Chưa có Service / Controller ở backend — module `Usage` còn trống. Tài liệu này ghi lại chức năng dự kiến khi module hoàn thiện.

## Luồng hoạt động dự kiến

1. Xem danh sách đơn `Đã duyệt` của mình.
2. **Check-in** khi đến phòng: tạo `UsageSession` (bắt đầu sử dụng).
3. **Check-out** khi kết thúc: kết thúc `UsageSession`.

## API
Chưa có API. Các entity liên quan: `UsageSession`, `Period`, `Shift`, `ShiftLog`.

## Giao diện — màn hình Check-in / Check-out (dự kiến, tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` |
| Tiêu đề màn hình | Headline, Inter, trắng |
| Danh sách đơn đã duyệt | Mỗi đơn 1 dòng trắng, chữ Neutral `#75777D`, divider Neutral |
| Nút Check-in | Nền Primary `#005A9E`, chữ trắng, bo nhẹ |
| Nút Check-out | Nền Tertiary `#8E4302`, chữ trắng, bo nhẹ |
| Trạng thái phiên | Label, Inter, Neutral `#75777D`, nhỏ |

- Chỉ hiển thị đơn trạng thái `Đã duyệt` của người dùng đang đăng nhập.
- 1 nút hành động duy nhất mỗi dòng (Check-in hoặc Check-out, tuỳ trạng thái phiên).
- Không gradient, không đổ bóng, không hình minh họa.

## Lưu ý
- Chỉ triển khai sau khi backend hoàn thiện module `Usage`.
- Ưu tiên Must (Planned), vẫn chưa làm trong đồ án này.
