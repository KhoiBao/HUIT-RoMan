export interface RoomTypeCard {
  badge: string;
  title: string;
  icon: "users" | "person" | "lock" | "dots";
  rows: { icon: "building" | "person" | "users" | "door" | "clock" | "tv"; text: string }[];
  purpose: string;
  status: "ready" | "soon";
  statusText: string;
}

// Nội dung tĩnh theo thiết kế Figma (marketing copy, không lấy từ API).
export const roomTypeCards: RoomTypeCard[] = [
  {
    badge: "Loại 01",
    title: "Phòng học nhóm",
    icon: "users",
    rows: [
      { icon: "building", text: "Vị trí: Tầng 3" },
      { icon: "person", text: "Sức chứa: 5–7 người" },
      { icon: "door", text: "Số lượng: 4 phòng (A101-A104)" },
      { icon: "clock", text: "Tối đa: 2 giờ/lượt" },
    ],
    purpose:
      "Mục đích: Học tập, thảo luận nhóm, làm đồ án môn học. Có thể gia hạn thêm thời gian nếu phòng trống sau khung giờ sử dụng.",
    status: "ready",
    statusText: "Sẵn sàng phục vụ",
  },
  {
    badge: "Loại 02",
    title: "Phòng hội thảo / sự kiện",
    icon: "person",
    rows: [
      { icon: "building", text: "Vị trí: Tầng 3" },
      { icon: "users", text: "Sức chứa: 50–60 người" },
      {
        icon: "tv",
        text: "Thiết bị: TV/màn hình lớn, máy chiếu, micro âm thanh",
      },
    ],
    purpose:
      "Mục đích: Workshop, hội thảo, talk show chuyên gia, bảo vệ khóa luận và các sự kiện học thuật cấp khoa/trường.",
    status: "ready",
    statusText: "Sẵn sàng phục vụ",
  },
  {
    badge: "Coming Soon",
    title: "Không gian phòng loại 3",
    icon: "lock",
    rows: [{ icon: "building", text: "Vị trí dự kiến: Tầng 2 & Tầng 4" }],
    purpose: "Thông tin phòng sẽ được cập nhật trong thời gian tới.",
    status: "soon",
    statusText: "Đang cấu hình",
  },
  {
    badge: "Coming Soon",
    title: "Không gian phòng loại 4",
    icon: "dots",
    rows: [{ icon: "building", text: "Vị trí dự kiến: Khu vực Nghiên cứu cao học" }],
    purpose: "Thông tin phòng sẽ được cập nhật trong thời gian tới.",
    status: "soon",
    statusText: "Đang cấu hình",
  },
];

export interface ProcessStep {
  no: string;
  title: string;
  desc: string;
  foot: string;
  icon: "search" | "clipboard" | "user" | "check";
  tone: "navy" | "red";
}

export const processSteps: ProcessStep[] = [
  {
    no: "01",
    title: "Tra cứu & Chọn khung giờ",
    desc: "Kiểm tra tình trạng khả dụng trên ma trận lịch phòng thời gian thực, lựa chọn thời gian và loại phòng thích hợp.",
    foot: "Trực quan hóa 07:30 - 19:30",
    icon: "search",
    tone: "navy",
  },
  {
    no: "02",
    title: "Điền thông tin & Xác nhận",
    desc: "Cung cấp mã số sinh viên/cán bộ, danh sách người tham gia và mục đích học thuật để hệ thống phê duyệt tức thì.",
    foot: "Mã định danh sinh viên HUIT",
    icon: "clipboard",
    tone: "navy",
  },
  {
    no: "03",
    title: "Nhận phòng (Check-in 15p)",
    desc: "Có mặt tại quầy trực Tầng 3 để check-in trong vòng 15 phút. Quá thời gian quy định, lượt đặt sẽ tự động hủy.",
    foot: "Quy định giới hạn: 15 phút",
    icon: "user",
    tone: "red",
  },
  {
    no: "04",
    title: "Trả phòng & Đánh giá",
    desc: "Bàn giao thiết bị cho nhân viên hỗ trợ, bảo đảm vệ sinh không gian và gửi phản hồi chất lượng phòng trên hệ thống.",
    foot: "Bàn giao thiết bị & Ký tên",
    icon: "check",
    tone: "navy",
  },
];
