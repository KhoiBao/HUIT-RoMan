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
  ClockIcon,
  DoorIcon,
  LibraryIcon,
  PersonIcon,
  UsersIcon,
  WrenchIcon,
} from "./Icon";

const TYPE_ORDER = [
  "học nhóm",
  "thuyết trình",
  "hội thảo",
  "lý thuyết",
  "thực hành",
];

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
  if (value.includes("nhóm")) return "/images/huit-group-room.jpg";
  if (value.includes("thuyết trình")) return "/images/huit-presentation-room.jpg";
  if (value.includes("hội thảo")) return "/images/huit-conference-hall.jpg";
  if (value.includes("lý thuyết")) return "/images/huit-theory-room.jpg";
  if (value.includes("thực hành")) return "/images/huit-practice-room.jpg";
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

function sortTypes(types: RoomTypeSummary[]): RoomTypeSummary[] {
  const rank = (name: string) => {
    const value = name.toLowerCase();
    const index = TYPE_ORDER.findIndex((keyword) => value.includes(keyword));
    return index === -1 ? TYPE_ORDER.length : index;
  };
  return [...types].sort(
    (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, "vi")
  );
}

function TypeCardSkeleton() {
  return (
    <article className="rh-type-card rh-type-card-skeleton" aria-hidden="true">
      <div className="rh-type-card-visual" />
      <div className="rh-type-card-body">
        <span className="rh-skeleton-line w-45" />
        <span className="rh-skeleton-line w-90" />
        <span className="rh-skeleton-line w-70" />
        <span className="rh-skeleton-line w-55" />
      </div>
    </article>
  );
}

function TypeCard({ type }: { type: RoomTypeSummary }) {
  const tone = typeTone(type.name);
  return (
    <article className="rh-type-card">
      <div className={`rh-type-card-visual tone-${tone}`}>
        <img
          className="rh-type-card-photo"
          src={typePhoto(type.name)}
          alt={`${type.name} tại HUIT`}
          loading="lazy"
        />
        <div className="rh-type-card-scrim" aria-hidden="true" />
        <span className="rh-type-card-mode">
          {type.isBookingByPeriod ? "Theo tiết học" : "Theo khung giờ"}
        </span>
        <span
          className={`rh-type-card-live ${
            type.availableCount > 0 ? "is-free" : "is-busy"
          }`}
        >
          <span className="rh-type-card-live-dot" />
          {availabilityLabel(type)}
        </span>
        <div className="rh-type-card-caption">
          <span>{formatRoomCodeRange(type.rooms)}</span>
          <strong>{type.roomCount} phòng</strong>
        </div>
      </div>

      <div className="rh-type-card-body">
        <div className="rh-type-card-title">
          <span className={`rh-type-card-icon tone-${tone}`}>
            <TypeIcon name={type.name} size={19} />
          </span>
          <div className="rh-type-card-heading">
            <span className="rh-type-card-kicker">
              {type.buildings.length > 0
                ? `Tòa ${type.buildings.join(", ")}`
                : "Khuôn viên HUIT"}
            </span>
            <h3>{type.name}</h3>
          </div>
        </div>

        <p className="rh-type-card-desc">
          {type.description ||
            "Thông tin mô tả loại phòng đang được cập nhật từ hệ thống."}
        </p>

        <div className="rh-type-card-meta">
          <span>
            <BuildingIcon size={14} />
            {formatFloorList(type.floors)}
          </span>
          <span>
            <UsersIcon size={14} />
            {formatCapacityRange(type.minCapacity, type.maxCapacity)}
          </span>
          <span>
            <DoorIcon size={14} />
            {type.roomCount} phòng
          </span>
          <span>
            <ClockIcon size={14} />
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

        <div className="rh-type-card-foot">
          <span className="rh-type-card-foot-note">
            {type.availableCount > 0
              ? `${type.availableCount}/${type.roomCount} phòng đang trống`
              : type.roomCount > 0
                ? "Xem lịch để chọn khung giờ trống"
                : "Đang chờ cấu hình phòng"}
          </span>
          <Link
            to="/dat-phong"
            className="rh-btn rh-btn-primary rh-btn-sm"
            aria-label={`Xem phòng và đặt ${type.name}`}
          >
            Đặt phòng
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function RoomTypesSection({
  types,
  loading,
}: {
  types: RoomTypeSummary[];
  loading: boolean;
}) {
  const ordered = sortTypes(types);

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
              Mỗi loại phòng có sức chứa, vị trí và cách đặt riêng. Dữ liệu bên
              dưới được đồng bộ trực tiếp từ hệ thống RoMan.
            </p>
          </div>
          <Link to="/lich-phong" className="rh-text-link">
            Xem toàn bộ phòng
            <ArrowRightIcon size={16} />
          </Link>
        </div>

        <div className="rh-type-grid">
          {loading ? (
            <>
              <TypeCardSkeleton />
              <TypeCardSkeleton />
              <TypeCardSkeleton />
            </>
          ) : ordered.length > 0 ? (
            ordered.map((type) => <TypeCard key={type.id} type={type} />)
          ) : (
            <div className="rh-empty-state">
              <BuildingIcon size={28} />
              <strong>Chưa tải được danh mục phòng</strong>
              <p>
                Vui lòng kiểm tra kết nối API hoặc thử tải lại trang để lấy dữ
                liệu mới nhất từ hệ thống.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
