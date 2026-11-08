import { Link } from "react-router-dom";

interface RuleSection {
  id: string;
  title: string;
  items: string[];
}

const guideSteps = [
  {
    no: "01",
    title: "Tra cứu & Chọn khung giờ",
    desc: "Kiểm tra tình trạng khả dụng trên ma trận lịch phòng theo thời gian thực, sau đó chọn thời gian và loại phòng phù hợp.",
  },
  {
    no: "02",
    title: "Điền thông tin & Gửi yêu cầu",
    desc: "Cung cấp thông tin người tham gia và mục đích học thuật. Yêu cầu được gửi tới nhân sự phụ trách để xử lý theo quy định.",
  },
  {
    no: "03",
    title: "Nhận phòng (Check-in 15 phút)",
    desc: "Có mặt tại quầy trực để check-in trong vòng 15 phút. Quá thời gian quy định, lượt đặt sẽ tự động hủy theo nghiệp vụ.",
  },
  {
    no: "04",
    title: "Trả phòng & Xác nhận",
    desc: "Bàn giao thiết bị cho nhân viên hỗ trợ, bảo đảm vệ sinh không gian và hoàn tất phiên sử dụng trên hệ thống.",
  },
];

const roomRules = [
  "Check-in trong 15 phút kể từ giờ bắt đầu.",
  "Trả phòng đúng giờ, không ảnh hưởng ca sau.",
  "Giữ trật tự, không gây ồn ảnh hưởng phòng khác.",
  "Không mang đồ ăn, thức uống có mùi vào phòng.",
  "Tắt thiết bị và giữ vệ sinh khi rời phòng.",
];

const sections: RuleSection[] = [
  {
    id: "quy-dinh-chung",
    title: "1. Quy định chung",
    items: [
      "Mang bảng tên và trang phục theo quy định của trường.",
      "Để túi xách, vật dụng cá nhân, giày dép đúng nơi quy định và tự chịu trách nhiệm về tài sản cá nhân.",
      "Không mang đồ ăn, nước uống (không đóng chai) vào thư viện.",
      "Không mang chất dễ gây cháy, nổ vào Thư viện; không hút thuốc lá trong thư viện.",
      "Nói khẽ, bước nhẹ và giữ gìn trật tự, vệ sinh chung trong khuôn viên thư viện.",
      "Điện thoại cài đặt ở chế độ rung; trao đổi, thảo luận nhóm trong các khu vực được phép (phòng học nhóm, Lầu 2).",
      "Nghiêm cấm các hành động phản cảm, thiếu văn minh; các phát ngôn gây tổn hại đến uy tín của Nhà trường, của Thư viện.",
      "Không tự ý điều chỉnh các trang thiết bị khi chưa được phép; xếp ghế ngay ngắn sau khi sử dụng.",
      "Có ý thức bảo vệ tài sản của Thư viện: không viết, vẽ lên bàn ghế, thiết bị; không ghi chú lên tài liệu, không sao chép tài liệu khi chưa được sự đồng ý của cán bộ thư viện.",
      "Tuyệt đối không mang tài liệu ra khỏi phòng đọc khi chưa được sự đồng ý của cán bộ thư viện; tài liệu sau khi đọc xong đặt tại “Khu vực trả sách sau khi sử dụng”.",
      "Không tự ý cài đặt các chương trình vào máy tính của Thư viện khi chưa được sự đồng ý của cán bộ thư viện.",
      "Không truy cập website có nội dung bị nghiêm cấm, không truyền thông tin nguy hại đến an ninh quốc gia hoặc phá hoại hệ thống mạng thư viện.",
      "Sử dụng dịch vụ và trang thiết bị theo đúng chính sách, thủ tục và hướng dẫn của Thư viện.",
      "Sử dụng tài liệu theo quy định của Luật sở hữu trí tuệ.",
      "Không vào khu vực dành riêng cho cán bộ thư viện khi không có nhiệm vụ.",
      "Người không thuộc Trường có nhu cầu sử dụng dịch vụ của Thư viện phải có giấy giới thiệu của cơ quan chủ quản kèm theo giấy tờ tùy thân; sử dụng thư viện từ 2 lần trở lên phải đăng ký làm Thẻ thư viện theo quy định.",
    ],
  },
  {
    id: "the-thu-vien",
    title: "2. Quy định về Thẻ thư viện",
    items: [
      "Thẻ thư viện là cơ sở để quản lý bạn đọc trong thư viện.",
      "Đối với người sử dụng trong trường, Thẻ giảng viên, viên chức, sinh viên, học viên đồng thời là Thẻ thư viện.",
      "Đối với người sử dụng ngoài trường, Thẻ thư viện là thẻ do Thư viện cấp khi đăng ký làm thẻ và sử dụng thư viện.",
      "Người sử dụng có trách nhiệm tham gia lớp hướng dẫn sử dụng thư viện để được kích hoạt thẻ sinh viên làm thẻ thư viện.",
      "Thẻ thư viện có giá trị trong suốt thời gian học tập, công tác tại trường và có thời hạn sử dụng trong 1 năm. Người sử dụng phải gia hạn thẻ hàng năm để tiếp tục sử dụng các dịch vụ thư viện.",
    ],
  },
  {
    id: "khong-gian-tien-ich",
    title: "3. Quy định sử dụng không gian và tiện ích của Thư viện",
    items: [
      "Đăng ký sử dụng không gian và tiện ích của Thư viện trực tiếp tại Quầy thông tin, hoặc đăng ký trực tuyến trên hệ thống đặt phòng.",
      "Người đăng ký nhận kết quả đặt phòng sau 15 phút.",
      "Kết quả đặt phòng sẽ bị hủy trong trường hợp người đặt đến trễ trên 15 phút so với thời gian đăng ký; người đặt có thể tự hủy kết quả đăng ký trên hệ thống hoặc thông báo cho cán bộ phụ trách.",
      "Thời gian sử dụng 120 phút/lượt, được phép gia hạn khi không có người chờ mượn.",
      "Người sử dụng có trách nhiệm kiểm tra thiết bị khi nhận/trả phòng; tắt máy lạnh, đèn trước khi rời khỏi phòng.",
    ],
  },
];

export default function RegulationsPage() {
  return (
    <div className="rh-page">
      <section className="rh-rules-hero">
        <div className="rh-container">
          <div className="rh-section-head center">
            <div>
              <span className="rh-eyebrow">Thư viện HUIT</span>
              <h2>Quy định &amp; Hướng dẫn sử dụng</h2>
              <p className="rh-lead">
                Quy định áp dụng cho mọi người sử dụng không gian, phòng học
                nhóm và phòng hội thảo của Thư viện. Nội dung quy định được
                trích từ{" "}
                <a
                  href="https://thuvien.huit.edu.vn/Page/quy-dinh-su-dung-thu-vien"
                  target="_blank"
                  rel="noreferrer"
                >
                  Cổng thông tin Thư viện HUIT
                </a>
                .
              </p>
            </div>
          </div>

          <nav className="rh-rules-nav" aria-label="Mục lục quy định">
            <a href="#huong-dan">Hướng dẫn sử dụng</a>
            <a href="#noi-quy">Nội quy sử dụng phòng</a>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title.replace(/^\d+\.\s*/, "")}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="rh-rules-body">
        <div className="rh-container">
          <div className="rh-rules-card" id="huong-dan">
            <h3>Hướng dẫn sử dụng hệ thống đặt phòng</h3>
            <ol className="rh-rules-steps">
              {guideSteps.map((step) => (
                <li key={step.no}>
                  <strong>
                    {step.no} — {step.title}
                  </strong>
                  <p>{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="rh-rules-card" id="noi-quy">
            <h3>Nội quy sử dụng phòng</h3>
            <ul>
              {roomRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>

          {sections.map((section) => (
            <div className="rh-rules-card" id={section.id} key={section.id}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}

          <p className="rh-rules-source">
            Nguồn: Trung tâm Thông tin – Thư viện, Trường Đại học Công Thương
            TP.HCM ·{" "}
            <a
              href="https://thuvien.huit.edu.vn"
              target="_blank"
              rel="noreferrer"
            >
              thuvien.huit.edu.vn
            </a>{" "}
            · <Link to="/home">Về trang chủ</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
