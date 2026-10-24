import { Link } from "react-router-dom";
import {
  formatCapacityRange,
  formatFloorList,
  formatRoomCodeRange,
  type RoomTypeSummary,
} from "../lib/home";
import {
  ArrowRightIcon,
  BankIcon,
  BuildingIcon,
  ChevronRightIcon,
  ClockIcon,
  DoorIcon,
  LibraryIcon,
  PersonIcon,
  UsersIcon,
  WrenchIcon,
} from "./Icon";

function TypeIcon({
  name,
  size = 22,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const value = name.toLowerCase();
  if (value.includes("nhóm")) return <UsersIcon size={size} className={className} />;
  if (value.includes("hội trường")) return <BankIcon size={size} className={className} />;
  if (value.includes("họp")) return <PersonIcon size={size} className={className} />;
  if (value.includes("lý thuyết")) return <LibraryIcon size={size} className={className} />;
  if (value.includes("thực hành")) return <WrenchIcon size={size} className={className} />;
  return <BuildingIcon size={size} className={className} />;
}

function typeTone(name: string): string {
  const value = name.toLowerCase();
  if (value.includes("nhóm")) return "blue";
  if (value.includes("hội trường")) return "navy";
  if (value.includes("họp")) return "teal";
  if (value.includes("lý thuyết")) return "gold";
  if (value.includes("thực hành")) return "violet";
  return "slate";
}

function typePhoto(name: string): string {
  const value = name.toLowerCase();
  if (value.includes("hội trường")) return "/images/huit-library-hall.jpg";
  if (value.includes("nhóm")) return "/images/huit-study-space.jpg";
  return "/images/huit-reading-room.jpg";
}

function availabilityLabel(type: RoomTypeSummary): string {
  if (type.roomCount === 0) return "Chưa cấu hình";
  if (type.availableCount > 0) return `${type.availableCount} trống`;
  if (type.inUseCount > 0) return `${type.inUseCount} đang dùng`;
  if (type.upcomingCount > 0) return `${type.upcomingCount} đã đặt`;
  if (type.maintenanceCount > 0) return `${type.maintenanceCount} bảo trì`;
  return "Đang cập nhật";
}

function FeaturedSkeleton() {
  return (
    <article className="rh-room-card rh-room-card-skeleton" aria-hidden="true">
      <div className="rh-room-visual" />
      <div className="rh-room-body">
        <span className="rh-skeleton-line w-45" />
        <span className="rh-skeleton-line w-90" />
        <span className="rh-skeleton-line w-70" />
        <span className="rh-skeleton-line w-55" />
      </div>
    </article>
  );
}

function FeaturedCard({
  type,
  index,
}: {
  type: RoomTypeSummary;
  index: number;
}) {
  const tone = typeTone(type.name);
  return (
    <article className="rh-room-card">
      <div className={`rh-room-visual rh-room-visual-${tone}`}>
        <img
          className="rh-room-photo"
          src={typePhoto(type.name)}
          alt="Không gian học tập tại Thư viện HUIT"
          loading="lazy"
        />
        <div className="rh-room-photo-scrim" aria-hidden="true" />
        <div className="rh-room-visual-grid" aria-hidden="true" />
        <span className="rh-room-badge">
          {index === 0 ? "Loại 01" : "Loại 02"}
        </span>
        <span className={`rh-room-live ${type.availableCount > 0 ? "is-free" : "is-busy"}`}>
          <span className="rh-room-live-dot" />
          {availabilityLabel(type)}
        </span>
        <TypeIcon
          name={type.name}
          size={112}
          className="rh-room-watermark"
        />
        <div className="rh-room-visual-caption">
          <span>{formatRoomCodeRange(type.rooms)}</span>
          <strong>{type.roomCount} phòng</strong>
        </div>
      </div>

      <div className="rh-room-body">
        <div className="rh-room-title-row">
          <div>
            <span className="rh-room-kicker">
              {type.isBookingByPeriod ? "Đặt theo tiết học" : "Đặt theo khung giờ"}
            </span>
            <h3>{type.name}</h3>
          </div>
          <span className={`rh-room-status ${type.availableCount > 0 ? "is-free" : "is-busy"}`}>
            {type.availableCount > 0
              ? "Sẵn sàng phục vụ"
              : type.roomCount === 0
                ? "Chưa cấu hình"
                : "Đang có lịch"}
          </span>
        </div>

        <p className="rh-room-desc">
          {type.description ||
            "Thông tin mô tả loại phòng đang được cập nhật từ hệ thống."}
        </p>

        <div className="rh-room-meta">
          <span>
            <BuildingIcon size={15} />
            {formatFloorList(type.floors)}
          </span>
          <span>
            <UsersIcon size={15} />
            {formatCapacityRange(type.minCapacity, type.maxCapacity)}
          </span>
          <span>
            <DoorIcon size={15} />
            {type.roomCount} phòng
          </span>
          <span>
            <ClockIcon size={15} />
            {type.isBookingByPeriod ? "Theo tiết" : "Theo giờ"}
          </span>
        </div>

        {type.amenities.length > 0 && (
          <div className="rh-amenity-row">
            {type.amenities.map((amenity) => (
              <span key={amenity}>{amenity}</span>
            ))}
          </div>
        )}

        <div className="rh-room-foot">
          <span className="rh-room-foot-note">
            {type.roomCount > 0
              ? `${type.roomCount} phòng trong hệ thống`
              : "Đang chờ cấu hình phòng"}
          </span>
          <Link to="/dat-phong" className="rh-btn rh-btn-primary rh-btn-sm">
            Xem phòng &amp; đặt ngay
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function RoomTypesSection({
  featured,
  others,
  loading,
}: {
  featured: RoomTypeSummary[];
  others: RoomTypeSummary[];
  loading: boolean;
}) {
  return (
    <section className="rh-section" aria-labelledby="rh-room-types-title">
      <div className="rh-container">
        <div className="rh-section-head">
          <div>
            <span className="rh-eyebrow">Danh mục không gian</span>
            <h2 id="rh-room-types-title">
              Khám phá phòng học tập &amp; hội thảo
            </h2>
            <p className="rh-lead">
              Mỗi loại phòng có cấu hình sức chứa, vị trí và tiện ích riêng.
              Dữ liệu bên dưới được đồng bộ trực tiếp từ hệ thống RoMan.
            </p>
          </div>
          <Link to="/lich-phong" className="rh-text-link">
            Xem toàn bộ phòng
            <ArrowRightIcon size={16} />
          </Link>
        </div>

        <div className="rh-room-layout">
          <div className="rh-room-featured">
            {loading ? (
              <>
                <FeaturedSkeleton />
                <FeaturedSkeleton />
              </>
            ) : featured.length > 0 ? (
              featured.map((type, index) => (
                <FeaturedCard key={type.id} type={type} index={index} />
              ))
            ) : (
              <div className="rh-empty-state">
                <BuildingIcon size={28} />
                <strong>Chưa tải được danh mục phòng</strong>
                <p>
                  Vui lòng kiểm tra kết nối API hoặc thử tải lại trang để lấy
                  dữ liệu mới nhất từ hệ thống.
                </p>
              </div>
            )}
          </div>

          <aside className="rh-type-side" aria-label="Các loại phòng khác">
            <div className="rh-type-side-head">
              <span>Danh mục khác</span>
              <strong>{loading ? "Đang tải" : `${others.length} loại phòng`}</strong>
            </div>

            {loading ? (
              <div className="rh-type-side-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ) : (
              others.map((type) => (
                <Link
                  to="/dat-phong"
                  className="rh-type-mini"
                  key={type.id}
                >
                  <span className={`rh-type-mini-icon tone-${typeTone(type.name)}`}>
                    <TypeIcon name={type.name} size={20} />
                  </span>
                  <span className="rh-type-mini-main">
                    <strong>{type.name}</strong>
                    <small>
                      {type.roomCount} phòng ·{" "}
                      {formatCapacityRange(type.minCapacity, type.maxCapacity)}
                    </small>
                  </span>
                  <span className="rh-type-mini-avail">
                    {availabilityLabel(type)}
                  </span>
                  <ChevronRightIcon size={17} />
                </Link>
              ))
            )}

            <Link to="/lich-phong" className="rh-type-side-link">
              Xem toàn bộ lịch phòng
              <ArrowRightIcon size={15} />
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
