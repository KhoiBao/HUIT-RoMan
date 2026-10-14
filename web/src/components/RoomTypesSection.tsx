import { useNavigate } from "react-router-dom";
import { roomTypeCards, type RoomTypeCard } from "../data/homeContent";
import {
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
  DoorIcon,
  DotsIcon,
  LockIcon,
  PersonIcon,
  TvIcon,
  UsersIcon,
} from "./Icon";

function RowIcon({ icon }: { icon: RoomTypeCard["rows"][number]["icon"] }) {
  switch (icon) {
    case "building":
      return <BuildingIcon />;
    case "person":
      return <PersonIcon />;
    case "users":
      return <UsersIcon />;
    case "door":
      return <DoorIcon />;
    case "clock":
      return <ClockIcon />;
    case "tv":
      return <TvIcon />;
  }
}

function TopIcon({ icon }: { icon: RoomTypeCard["icon"] }) {
  switch (icon) {
    case "users":
      return <UsersIcon size={24} />;
    case "person":
      return <PersonIcon size={24} />;
    case "lock":
      return <LockIcon size={24} />;
    case "dots":
      return <DotsIcon size={24} />;
  }
}

export default function RoomTypesSection() {
  const navigate = useNavigate();
  return (
    <section className="section">
      <div className="eyebrow">CƠ SỞ VẬT CHẤT HỌC THUẬT</div>
      <h2>Các loại phòng phục vụ</h2>
      <p className="section-desc">
        Đáp ứng chuẩn mực học tập độc lập, nghiên cứu nhóm và các sự kiện
        chuyên đề của cán bộ, giảng viên và người học tại HUIT.
      </p>
      <div className="room-grid">
        {roomTypeCards.map((card) => (
          <article
            key={card.title}
            className={card.status === "ready" ? "room-card" : "room-card soon"}
          >
            <div className="room-top">
              <span
                className={
                  card.status === "ready" ? "type-badge" : "soon-badge"
                }
              >
                {card.badge}
              </span>
              <span className="room-top-icon">
                <TopIcon icon={card.icon} />
              </span>
            </div>
            <h3>{card.title}</h3>
            <div className="room-rows">
              {card.rows.map((r) => (
                <div key={r.text} className="room-row">
                  <RowIcon icon={r.icon} />
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
            <p className="room-purpose">{card.purpose}</p>
            <div className="room-foot">
              <span
                className={
                  card.status === "ready" ? "ready-text" : "config-text"
                }
              >
                {card.statusText}
              </span>
              {card.status === "ready" ? (
                <button
                  type="button"
                  className="btn-primary sm"
                  onClick={() => navigate("/dat-phong")}
                >
                  Xem chi tiết &amp; Đặt phòng
                  <ArrowRightIcon size={16} />
                </button>
              ) : (
                <button type="button" className="btn-disabled" disabled>
                  Chưa kích hoạt
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
