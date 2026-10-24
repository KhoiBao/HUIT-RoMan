import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { roomRules } from "../data/homeContent";
import { fetchPeriodsApi } from "../lib/schedule";
import { getServiceHours } from "../lib/home";
import {
  ArrowRightIcon,
  CalendarPlusIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeIcon,
  HeadsetIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  ShieldCheckIcon,
} from "./Icon";

const CURRENT_YEAR = new Date().getFullYear();

export default function InfoFooter({
  showInfoCards = true,
}: {
  showInfoCards?: boolean;
}) {
  const [serviceHours, setServiceHours] = useState<{
    open: string;
    close: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPeriodsApi()
      .then((periods) => {
        if (mounted) setServiceHours(getServiceHours(periods));
      })
      .catch(() => {
        if (mounted) setServiceHours(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const year = CURRENT_YEAR;
  const hoursLabel = serviceHours
    ? `${serviceHours.open} – ${serviceHours.close}`
    : "Đang cập nhật";

  return (
    <div className="roman-footer-wrap">
      {showInfoCards && (
      <section className="roman-info-section" aria-label="Thông tin sử dụng phòng">
        <div className="roman-info-grid">
          <article className="roman-info-card">
            <div className="roman-info-icon roman-info-icon-blue">
              <ShieldCheckIcon size={22} />
            </div>
            <div className="roman-info-body">
              <span className="roman-info-kicker">Nội quy</span>
              <h3>Quy định đặt phòng</h3>
              <ul className="roman-rule-list">
                {roomRules.map((rule) => (
                  <li key={rule}>
                    <CheckCircleIcon size={14} />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link to="/home#quy-trinh" className="roman-info-link">
              Xem hướng dẫn
              <ArrowRightIcon size={15} />
            </Link>
          </article>

          <article className="roman-info-card">
            <div className="roman-info-icon roman-info-icon-gold">
              <ClockIcon size={22} />
            </div>
            <div className="roman-info-body">
              <span className="roman-info-kicker">Thời gian</span>
              <h3>Khung giờ phục vụ</h3>
              <div className="roman-hours-label">{hoursLabel}</div>
              <p className="roman-info-note">
                Thứ Hai – Thứ Bảy, theo khung tiết học đang cấu hình trong hệ
                thống.
              </p>
              <p className="roman-info-note">
                Chủ Nhật và ngày lễ nghỉ theo quy định của Nhà trường.
              </p>
            </div>
          </article>

          <article className="roman-info-card">
            <div className="roman-info-icon roman-info-icon-green">
              <HeadsetIcon size={22} />
            </div>
            <div className="roman-info-body">
              <span className="roman-info-kicker">Hỗ trợ</span>
              <h3>Kênh hỗ trợ trực tiếp</h3>
              <div className="roman-support-line">
                <PinIcon size={15} />
                <span>Quầy trực Tầng 3 – Tòa nhà E</span>
              </div>
              <div className="roman-support-line">
                <PhoneIcon size={15} />
                <a href="tel:02838161673">(028) 3816 1673</a>
              </div>
              <div className="roman-support-line">
                <MailIcon size={15} />
                <a href="mailto:thuvien@huit.edu.vn">thuvien@huit.edu.vn</a>
              </div>
            </div>
            <a href="mailto:thuvien@huit.edu.vn" className="roman-info-link">
              Gửi yêu cầu hỗ trợ
              <ArrowRightIcon size={15} />
            </a>
          </article>
        </div>
      </section>
      )}

      <footer className="roman-footer">
        <div className="roman-footer-inner">
          <div className="roman-footer-grid">
            <div className="roman-footer-brand">
              <Link to="/home" className="roman-footer-logo">
                <span className="roman-footer-logo-box">
                  <img
                    src="/huit-logo.svg"
                    alt="Logo Trường Đại học Công Thương TP.HCM"
                  />
                </span>
                <span>
                  <strong>RoMan</strong>
                  <small>HUIT · Phòng dùng chung</small>
                </span>
              </Link>
              <p>
                Hệ thống số hóa công tác tra cứu, đăng ký và khai thác không
                gian học tập nhóm, phòng họp, hội trường và phòng thực hành
                tại HUIT.
              </p>
              <Link to="/dat-phong" className="roman-footer-cta">
                <CalendarPlusIcon size={16} />
                Đăng ký sử dụng phòng
              </Link>
            </div>

            <div className="roman-footer-col">
              <h4>Liên kết nhanh</h4>
              <ul>
                <li>
                  <Link to="/home">Trang chủ</Link>
                </li>
                <li>
                  <Link to="/lich-phong">Lịch phòng</Link>
                </li>
                <li>
                  <Link to="/dat-phong">Đặt phòng</Link>
                </li>
                <li>
                  <Link to="/dat-phong?tab=my-bookings">
                    Phòng đã đăng ký
                  </Link>
                </li>
              </ul>
            </div>

            <div className="roman-footer-col">
              <h4>Quy định &amp; hỗ trợ</h4>
              <ul>
                <li>
                  <Link to="/home#quy-trinh">Quy trình 4 bước</Link>
                </li>
                <li>
                  <Link to="/home#quy-trinh">Nội quy sử dụng phòng</Link>
                </li>
                <li>
                  <a
                    href="https://thuvien.huit.edu.vn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cổng thông tin Thư viện
                  </a>
                </li>
                <li>
                  <a
                    href="https://huit.edu.vn"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Website HUIT
                  </a>
                </li>
              </ul>
            </div>

            <div className="roman-footer-col">
              <h4>Thông tin liên hệ</h4>
              <div className="roman-footer-contact">
                <PinIcon size={15} />
                <span>
                  140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh
                </span>
              </div>
              <div className="roman-footer-contact">
                <PhoneIcon size={15} />
                <a href="tel:02838161673">(028) 3816 1673</a>
              </div>
              <div className="roman-footer-contact">
                <MailIcon size={15} />
                <a href="mailto:thuvien@huit.edu.vn">thuvien@huit.edu.vn</a>
              </div>
              <div className="roman-footer-contact">
                <GlobeIcon size={15} />
                <a
                  href="https://thuvien.huit.edu.vn"
                  target="_blank"
                  rel="noreferrer"
                >
                  thuvien.huit.edu.vn
                </a>
              </div>
            </div>
          </div>

          <div className="roman-footer-bottom">
            <span>
              © {year} RoMan. Bản quyền thuộc Trường Đại học Công Thương TP.HCM.
            </span>
            <span>HUIT · Không gian học thuật dùng chung</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
