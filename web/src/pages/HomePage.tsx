import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import Slider from "../components/Slider";
import StatusStrip from "../components/StatusStrip";
import RoomTypesSection from "../components/RoomTypesSection";
import ProcessSection from "../components/ProcessSection";
import InfoFooter from "../components/InfoFooter";
import { CalendarIcon, PlusIcon } from "../components/Icon";
import { fetchMyUsageSessions, type UsageSessionItem } from "../lib/usage";

export default function HomePage() {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<UsageSessionItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchMyUsageSessions()
      .then((list) => {
        if (!isMounted) return;
        const relevant = list.filter(
          (s) => s.status === "Chờ nhận phòng" || s.status === "Đang sử dụng"
        );
        setActiveSessions(relevant);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const pendingSession = activeSessions.find((s) => s.status === "Chờ nhận phòng");
  const inUseSession = activeSessions.find((s) => s.status === "Đang sử dụng");

  return (
    <div className="home-page">
      <SiteHeader />
      <main className="home-main-grid">
        <div className="hero-copy">
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

          {/* Smart banner if user has pending room to check-in */}
          {pendingSession && (
            <div className="home-active-banner">
              <div className="home-banner-content">
                <span className="banner-pulse-dot"></span>
                <div>
                  <strong>Bạn có phòng sẵn sàng nhận: {pendingSession.roomCode} ({pendingSession.roomName})</strong>
                  <p>Mã nhận phòng: <strong>{pendingSession.confirmationCode}</strong></p>
                </div>
              </div>
              <button
                type="button"
                className="btn-banner-action"
                onClick={() => navigate("/dat-phong?tab=my-bookings")}
              >
                Nhận phòng ngay →
              </button>
            </div>
          )}

          {/* Smart banner if user is currently using a room */}
          {!pendingSession && inUseSession && (
            <div className="home-active-banner" style={{ borderColor: "rgba(5, 150, 105, 0.4)", background: "linear-gradient(135deg, rgba(5, 150, 105, 0.08), rgba(0, 90, 158, 0.1))" }}>
              <div className="home-banner-content">
                <span className="pulse-dot-green"></span>
                <div>
                  <strong>Bạn đang sử dụng phòng: {inUseSession.roomCode} ({inUseSession.roomName})</strong>
                  <p>Đừng quên thực hiện trả phòng khi kết thúc buổi sử dụng.</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-banner-action"
                style={{ background: "#059669" }}
                onClick={() => navigate("/dat-phong?tab=my-bookings")}
              >
                Xem & Trả phòng →
              </button>
            </div>
          )}

          <StatusStrip />
        </div>
        <div className="hero-slider">
          <Slider />
        </div>
      </main>
      <div className="home-sections">
        <RoomTypesSection />
        <ProcessSection />
      </div>
      <InfoFooter />
    </div>
  );
}
