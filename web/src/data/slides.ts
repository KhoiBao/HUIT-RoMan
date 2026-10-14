import imgKhongGian from "../assets/slides/slide-khong-gian.svg";
import imgPhongHoc from "../assets/slides/slide-phong-hoc.svg";
import imgHoiTruong from "../assets/slides/slide-hoi-truong.svg";

export interface Slide {
  image: string;
  alt: string;
  title: string;
  badge: string;
  desc: string;
}

// TEXT + ẢNH TẠM — thay ảnh thật vào src/assets/slides/ (giữ nguyên tên file),
// sửa title/badge/desc tại đây khi có thông tin chính thức.
export const slides: Slide[] = [
  {
    image: imgKhongGian,
    alt: "Không gian học tập và sự kiện HUIT",
    title: "Khu phức hợp Tầng 3",
    badge: "Tòa nhà E",
    desc: "Không gian học tập nhóm và phòng hội thảo đa chức năng được trang bị hạ tầng CNTT chuẩn quốc gia phục vụ nghiên cứu khoa học.",
  },
  {
    image: imgPhongHoc,
    alt: "Phòng học",
    title: "Phòng học lý thuyết",
    badge: "Tòa nhà C",
    desc: "Không gian lớp học tiêu chuẩn phục vụ giảng dạy và học tập hằng ngày.",
  },
  {
    image: imgHoiTruong,
    alt: "Hội trường",
    title: "Hội trường lớn",
    badge: "Tòa nhà A",
    desc: "Không gian tổ chức hội thảo, sự kiện và sinh hoạt học thuật quy mô lớn.",
  },
];
