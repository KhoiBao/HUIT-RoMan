import { useNavigate } from "react-router-dom";
import {
  CalendarPlusIcon,
  ClockIcon,
  GlobeIcon,
  HeadsetIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
} from "./Icon";

export default function InfoFooter() {
  const navigate = useNavigate();
  return (
    <div className="info-footer-wrapper">
      <div className="info-footer-container">
        <section className="section info-grid">
          <div className="info-left">
          <div className="eyebrow">HUIT — KHÔNG GIAN HỌC THUẬT DÙNG CHUNG</div>
          <h2>Không gian kiến tạo tri thức &amp; Đổi mới sáng tạo</h2>
          <p>
            Trường Đại học Công Thương TP.HCM là đầu mối lưu trữ, cung cấp
            học liệu số, cơ sở dữ liệu chuyên ngành và tổ chức các không gian
            học thuật phục vụ trên 30.000 sinh viên, học viên cao học và cán
            bộ giảng viên. Hệ thống phòng học nhóm và hội thảo được triển
            khai nhằm nâng cao tính chủ động trong học tập theo định hướng
            nghiên cứu ứng dụng.
          </p>
          <div className="info-boxes">
            <div className="info-box">
              <div className="info-box-head">
                <ClockIcon />
                <strong>Khung giờ hoạt động</strong>
              </div>
              <p>07:30 – 19:30 (Thứ Hai đến Thứ Bảy)</p>
              <p>Nghỉ vào Chủ Nhật và các ngày Lễ theo quy định.</p>
            </div>
            <div className="info-box">
              <div className="info-box-head">
                <HeadsetIcon />
                <strong>Quầy hỗ trợ người dùng</strong>
              </div>
              <p>Quầy trực Tầng 3 - Tòa nhà E</p>
              <p>Email: thuvien@huit.edu.vn | Nội bộ: 1673</p>
            </div>
          </div>
        </div>
        <aside className="contact-card">
          <h3>Thông tin liên hệ</h3>
          <div className="contact-row">
            <PinIcon />
            <span>
              140 Lê Trọng Tấn, Phường Tây Thạnh, Quận Tân Phú, TP. Hồ Chí
              Minh
            </span>
          </div>
          <div className="contact-row">
            <PhoneIcon />
            <span>(028) 3816 1673 - (028) 3816 3318</span>
          </div>
          <div className="contact-row">
            <GlobeIcon />
            <span>lib.huit.edu.vn</span>
          </div>
          <button
            type="button"
            className="btn-secondary-block"
            onClick={() => navigate("/dat-phong")}
          >
            <CalendarPlusIcon />
            Đăng ký sử dụng phòng ngay
          </button>
        </aside>
      </section>
      </div>

      <footer className="site-footer">
        <div className="foot-grid">
          <div>
            <div className="foot-school">
              Trường Đại học Công Thương TP.HCM (HUIT)
            </div>
            <div className="foot-unit">Hệ thống quản lý phòng dùng chung RoMan</div>
            <p>
              Hệ thống số hóa phục vụ công tác tra cứu, đăng ký không gian
              học tập nhóm, phòng hội thảo và phòng nghiên cứu chuyên đề.
            </p>
          </div>
          <div>
            <div className="foot-head">Thông tin liên hệ &amp; Địa điểm</div>
            <div className="contact-row">
              <PinIcon />
              <span>140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP. HCM</span>
            </div>
            <div className="contact-row">
              <PhoneIcon />
              <span>Hotline: (028) 3816 1673</span>
            </div>
            <div className="contact-row">
              <ClockIcon />
              <span>07:30 - 19:30 (Thứ 2 - Thứ 7)</span>
            </div>
            <div className="contact-row">
              <MailIcon />
              <span>thuvien@huit.edu.vn</span>
            </div>
          </div>
          <div>
            <div className="foot-head">Quy định &amp; Hỗ trợ</div>
            <ul className="foot-links">
              <li>Nội quy sử dụng phòng học nhóm</li>
              <li>Chính sách mượn - trả trang thiết bị số</li>
              <li>Cổng thông tin sinh viên HUIT</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>
            © 2025 RoMan. All rights reserved. Bản quyền thuộc về Trường Đại
            học Công Thương TP.HCM.
          </span>
          <span>Phiên bản v2.4.0-Operational</span>
        </div>
      </footer>
    </div>
  );
}
