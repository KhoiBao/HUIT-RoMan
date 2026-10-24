import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LiveRoomStats } from "../lib/home";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DoorIcon,
  WrenchIcon,
} from "./Icon";

interface HomeHeroProps {
  stats: LiveRoomStats | null;
  loading: boolean;
  dateLabel: string;
  updatedLabel: string;
}

interface HeroSlide {
  src: string;
  alt: string;
  label: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    src: "/images/huit-library-reading.jpg",
    alt: "Khu vực đọc và trưng bày sách tại Thư viện HUIT",
    label: "Không gian đọc mở",
  },
  {
    src: "/images/huit-library-study.jpg",
    alt: "Sinh viên tự học tại khu vực học tập Thư viện HUIT",
    label: "Khu tự học hiện đại",
  },
  {
    src: "/images/huit-library-gate.jpg",
    alt: "Cổng kiểm soát thông minh tại Thư viện HUIT",
    label: "Kiểm soát thông minh",
  },
  {
    src: "/images/huit-library-books.jpg",
    alt: "Kệ sách và kho học liệu tại Thư viện HUIT",
    label: "Kho học liệu phong phú",
  },
];

const AUTOPLAY_DELAY = 6500;

function StatCell({
  label,
  value,
  suffix,
  tone,
  icon,
}: {
  label: string;
  value: number | null;
  suffix: string;
  tone: string;
  icon: ReactNode;
}) {
  return (
    <div className={`rh-stat ${tone}`}>
      <span className="rh-stat-icon">{icon}</span>
      <div className="rh-stat-main">
        <span className="rh-stat-label">{label}</span>
        <div className="rh-stat-value">
          <strong>{value ?? "--"}</strong>
          <small>{suffix}</small>
        </div>
      </div>
    </div>
  );
}

export default function HomeHero({
  stats,
  loading,
  dateLabel,
  updatedLabel,
}: HomeHeroProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const showPrevious = () => {
    setActive((current) =>
      current === 0 ? HERO_SLIDES.length - 1 : current - 1,
    );
  };

  const showNext = () => {
    setActive((current) => (current + 1) % HERO_SLIDES.length);
  };

  useEffect(() => {
    if (paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % HERO_SLIDES.length);
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="rh-hero"
      aria-label="Giới thiệu và trạng thái phòng"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="rh-hero-media">
        <div className="rh-hero-slides">
          {HERO_SLIDES.map((slide, index) => (
            <img
              key={slide.src}
              className={`rh-hero-slide${index === active ? " is-active" : ""}`}
              src={slide.src}
              alt={index === active ? slide.alt : ""}
              aria-hidden={index !== active}
              loading={index === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
        <div className="rh-hero-scrim" />
        <div className="rh-hero-pattern" aria-hidden="true" />

        <div className="rh-hero-inner">
          <div className="rh-hero-copy">
            <h1>
              Học tập chủ động.
              <br />
              <span>Không gian truyền cảm hứng.</span>
            </h1>
            <p>
              Tra cứu phòng trống, đăng ký sử dụng và quản lý lịch phòng học
              nhóm, phòng thuyết trình, phòng hội thảo tại Thư viện HUIT trên một
              nền tảng duy nhất.
            </p>
            <div className="rh-hero-actions">
              <Link to="/dat-phong" className="rh-btn rh-btn-primary">
                <CalendarIcon size={18} />
                Đặt phòng ngay
              </Link>
              <Link to="/lich-phong" className="rh-btn rh-btn-ghost">
                Xem lịch phòng
                <ArrowRightIcon size={18} />
              </Link>
            </div>

            <div className="rh-hero-slider-meta">
              <div className="rh-hero-dots" aria-label="Chọn ảnh">
                {HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.src}
                    type="button"
                    aria-label={`Ảnh ${index + 1}: ${slide.label}`}
                    aria-current={index === active ? "true" : undefined}
                    className={`rh-hero-dot${index === active ? " is-active" : ""}`}
                    onClick={() => setActive(index)}
                  />
                ))}
              </div>
              <span className="rh-hero-slide-label">{HERO_SLIDES[active].label}</span>
              <span className="rh-hero-counter">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(HERO_SLIDES.length).padStart(2, "0")}
              </span>
              <a
                className="rh-hero-credit"
                href="https://www.facebook.com/thuvienHUIT"
                target="_blank"
                rel="noreferrer"
              >
                Nguồn ảnh: HUIT Library
              </a>
            </div>
          </div>

          <div className="rh-status-card" aria-live="polite">
            <div className="rh-status-head">
              <div>
                <span className="rh-status-kicker">Trạng thái phòng hiện tại</span>
                <strong className="rh-status-date">{dateLabel}</strong>
              </div>
              <Link to="/lich-phong" className="rh-status-link">
                Xem chi tiết lịch phòng
                <ArrowRightIcon size={15} />
              </Link>
            </div>

            <div className="rh-status-updated">
              <span className="rh-live-dot" />
              <span>Cập nhật lúc {updatedLabel}</span>
              {loading && <span className="rh-status-loading">Đang tải…</span>}
            </div>

            <div className="rh-status-grid">
              <StatCell
                label="Phòng trống"
                value={stats?.available ?? null}
                suffix={`/ ${stats?.total ?? "--"} phòng`}
                tone="tone-available"
                icon={<DoorIcon size={16} />}
              />
              <StatCell
                label="Đã đặt"
                value={stats?.upcoming ?? null}
                suffix="sắp dùng"
                tone="tone-upcoming"
                icon={<ClockIcon size={16} />}
              />
              <StatCell
                label="Đang sử dụng"
                value={stats?.inUse ?? null}
                suffix="phòng"
                tone="tone-inuse"
                icon={<CalendarIcon size={16} />}
              />
              <StatCell
                label="Bảo trì"
                value={stats?.maintenance ?? null}
                suffix="phòng"
                tone="tone-maintenance"
                icon={<WrenchIcon size={16} />}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="rh-hero-arrow rh-hero-arrow-prev"
          onClick={showPrevious}
          aria-label="Ảnh trước"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <button
          type="button"
          className="rh-hero-arrow rh-hero-arrow-next"
          onClick={showNext}
          aria-label="Ảnh tiếp theo"
        >
          <ChevronRightIcon size={24} />
        </button>
      </div>
    </section>
  );
}
