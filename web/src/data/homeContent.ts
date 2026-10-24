export interface ProcessStep {
  no: string;
  title: string;
  desc: string;
  foot: string;
  icon: "search" | "clipboard" | "user" | "check";
  tone: "navy" | "red";
}

// Nội dung nghiệp vụ cố định. Mọi con số phòng, sức chứa, khung giờ và lịch
// đặt đều được tải trực tiếp từ API (xem lib/home.ts).
export const processSteps: ProcessStep[] = [
  {
    no: "01",
    title: "Tra cứu & Chọn khung giờ",
    desc: "Kiểm tra tình trạng khả dụng trên ma trận lịch phòng theo thời gian thực, sau đó chọn thời gian và loại phòng phù hợp.",
    foot: "Lịch phòng cập nhật từ hệ thống",
    icon: "search",
    tone: "navy",
  },
  {
    no: "02",
    title: "Điền thông tin & Gửi yêu cầu",
    desc: "Cung cấp thông tin người tham gia và mục đích học thuật. Yêu cầu được gửi tới nhân sự phụ trách để xử lý theo quy định.",
    foot: "Mã định danh sinh viên HUIT",
    icon: "clipboard",
    tone: "navy",
  },
  {
    no: "03",
    title: "Nhận phòng (Check-in 15 phút)",
    desc: "Có mặt tại quầy trực để check-in trong vòng 15 phút. Quá thời gian quy định, lượt đặt sẽ tự động hủy theo nghiệp vụ.",
    foot: "Quy định giới hạn: 15 phút",
    icon: "user",
    tone: "red",
  },
  {
    no: "04",
    title: "Trả phòng & Xác nhận",
    desc: "Bàn giao thiết bị cho nhân viên hỗ trợ, bảo đảm vệ sinh không gian và hoàn tất phiên sử dụng trên hệ thống.",
    foot: "Bàn giao thiết bị & xác nhận",
    icon: "check",
    tone: "navy",
  },
];

export const roomRules = [
  "Check-in trong 15 phút kể từ giờ bắt đầu.",
  "Trả phòng đúng giờ, không ảnh hưởng ca sau.",
  "Giữ trật tự, không gây ồn ảnh hưởng phòng khác.",
  "Không mang đồ ăn, thức uống có mùi vào phòng.",
  "Tắt thiết bị và giữ vệ sinh khi rời phòng.",
];
