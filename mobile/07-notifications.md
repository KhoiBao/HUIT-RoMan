# Thông báo (F-007) — dự kiến (Should Have)

## Mục đích
Gửi thông báo khi trạng thái đơn đặt phòng thay đổi (duyệt / từ chối) và nhắc lịch phòng sắp tới.

## Người dùng
Tất cả nhóm người dùng.

## Trạng thái hiện tại
Chưa làm — module `Communication` còn trống. Ưu tiên "Sau nếu còn thời gian".

## Luồng hoạt động dự kiến

1. Nhận thông báo (push / in-app) khi đơn của mình được duyệt hoặc từ chối.
2. Xem danh sách thông báo, đánh dấu đã đọc.

## API
Chưa có API. Các entity liên quan: `Notification`, `ChatConversation`, `ChatMessage` (chưa làm).

## Giao diện — màn hình Thông báo (dự kiến, tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` |
| Tiêu đề màn hình | Headline, Inter, trắng |
| Danh sách thông báo | Mỗi thông báo 1 dòng trắng: tiêu đề Neutral `#75777D`, nội dung nhỏ, thời gian Neutral nhạt |
| Thông báo chưa đọc | Chấm màu Primary `#005A9E` bên trái tiêu đề |
| Đánh dấu đã đọc | Nền trắng chuyển Neutral nhạt, chữ màu Neutral nhạt hơn |

- Danh sách cuốn dọc, nhiều khoảng trống giữa các mục.
- Không gradient, không đổ bóng, không hình minh họa dán sẵn.

## Lưu ý
- Ưu tiên Should Have, có thể bỏ nếu hết thời gian.
- Không nằm trong nhóm Must Have của project_scope.
