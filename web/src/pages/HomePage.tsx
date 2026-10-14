import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Slider from "../components/Slider";
import StatusStrip from "../components/StatusStrip";
import { CalendarIcon, PlusIcon } from "../components/Icon";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="home-page">
      <SiteHeader />
      <main className="home-main-grid">
        <div className="hero-copy">
          <span className="hero-badge">
            <i className="dot-live" />
            HỆ THỐNG ĐẶT PHÒNG TRỰC TUYẾN HUIT
          </span>
          <h1>Không gian học tập và sự kiện HUIT</h1>
          <p>
            Tra cứu phòng trống, đăng ký sử dụng phòng và quản lý lịch phòng
            tại HUIT nhanh chóng, chuẩn hóa theo quy định học thuật.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/dat-phong")}
            >
              <PlusIcon />
              Đặt phòng ngay
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/lich-phong")}
            >
              <CalendarIcon />
              Xem lịch phòng
            </button>
          </div>
          <StatusStrip />
        </div>
        <div className="hero-slider">
          <Slider />
        </div>
      </main>
    </div>
  );
}
