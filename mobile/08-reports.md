# Báo cáo thống kê (F-008) — dự kiến (Planned)

## Mục đích
Xem báo cáo tóm tắt hoạt động đặt phòng (dùng stored proc `GetBookingSummary` có sẵn).

## Người dùng
Chính chủ khuyến khích: `Admin` (xem thống kê tổng hệ thống).

## Trạng thái hiện tại
Stored proc `GetBookingSummary` có sẵn trong DB, nhưng chưa nối vào API. Dự kiến triển khai sau.

## Luồng hoạt động dự kiến

1. Xem thống kê số lượt đặt phòng, phòng sử dụng nhiều nhất theo khoảng thời gian.
2. Lọc theo đơn vị, loại phòng, ngày bắt đầu / ngày kết thúc.

## API
Chưa có API reporting. Cần nối stored proc `GetBookingSummary` vào endpoint mới.

## Giao diện — màn hình Báo cáo thống kê (dự kiến, tối giản)

| Yếu tố | Giá trị |
|---|---|
| Màu nền | Secondary `#1A365D` |
| Tiêu đề màn hình | Headline, Inter, trắng |
| Thẻ số liệu | Nền trắng, con số lớn Headline trắng/Primary `#005A9E`, nhãn dưới Neutral `#75777D` |
| Lọc khoảng thời gian | 2 ô nhập ngày (từ / đến), nền trắng, chữ Neutral `#75777D`, viền mỏng Neutral |
| Nút Xem báo cáo | Nền Primary `#005A9E`, chữ trắng, toàn chiều dưới màn hình |

- Màn hình chỉ hiển thị các con số chính (số lượt đặt, phòng sử dụng nhiều nhất...).
- Không biểu đồ phức tạp, không gradient, không đổ bóng, không hình minh họa dán sẵn.

## Lưu ý
- Ưu tiên Must (Planned), vẫn chưa triển khai trong nhóm code hiện tại.
