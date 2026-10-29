import { useState, useEffect, useRef } from "react";
import {
  globalSearch,
  type GlobalSearchResult,
} from "../../lib/violations";
import { formatRole } from "../../lib/auth";
import {
  SearchIcon,
  DoorIcon,
  UsersIcon,
  ClipboardListIcon,
  AlertTriangleIcon,
  XIcon,
  RefreshCwIcon,
  BanIcon,
  ClockIcon,
} from "../Icon";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (
    tab: "rooms" | "users" | "approvals" | "violations"
  ) => void;
}

export default function AdminGlobalSearchModal({
  isOpen,
  onClose,
  onSelectCategory,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    "ALL" | "ROOMS" | "USERS" | "BOOKINGS" | "VIOLATIONS"
  >("ALL");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult>({
    query: "",
    rooms: [],
    users: [],
    bookings: [],
    violations: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape để đóng + trap focus trong dialog
  useEffect(() => {
    if (!isOpen) return;
    const root = cardRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        query: "",
        rooms: [],
        users: [],
        bookings: [],
        violations: [],
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await globalSearch(query.trim());
        setResults(data);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.rooms.length +
    results.users.length +
    results.bookings.length +
    results.violations.length;

  return (
    <div
      className="admin-modal-overlay global-search-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={cardRef}
        className="admin-modal-card global-search-card"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm nhanh toàn hệ thống"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="global-search-header">
          <SearchIcon size={20} className="global-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm kiếm nhanh phòng, người mượn, phiếu mượn, biên bản vi phạm..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="global-search-input"
            aria-label="Từ khóa tìm kiếm"
          />
          {loading && <RefreshCwIcon size={18} className="spin-icon" />}
          {query && !loading && (
            <button
              type="button"
              className="global-search-clear"
              onClick={() => setQuery("")}
              aria-label="Xóa từ khóa"
            >
              <XIcon size={16} />
            </button>
          )}
          <button
            type="button"
            className="global-search-close-btn"
            onClick={onClose}
            aria-label="Đóng tìm kiếm (Esc)"
            title="Đóng (Esc)"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Filter Categories Chips */}
        <div className="global-search-chips">
          <button
            type="button"
            className={`search-chip ${activeCategory === "ALL" ? "active" : ""}`}
            onClick={() => setActiveCategory("ALL")}
          >
            Tất cả ({totalResults})
          </button>
          <button
            type="button"
            className={`search-chip ${activeCategory === "ROOMS" ? "active" : ""}`}
            onClick={() => setActiveCategory("ROOMS")}
          >
            <DoorIcon size={14} /> Phòng ({results.rooms.length})
          </button>
          <button
            type="button"
            className={`search-chip ${activeCategory === "USERS" ? "active" : ""}`}
            onClick={() => setActiveCategory("USERS")}
          >
            <UsersIcon size={14} /> Người mượn ({results.users.length})
          </button>
          <button
            type="button"
            className={`search-chip ${
              activeCategory === "BOOKINGS" ? "active" : ""
            }`}
            onClick={() => setActiveCategory("BOOKINGS")}
          >
            <ClipboardListIcon size={14} /> Phiếu mượn ({results.bookings.length})
          </button>
          <button
            type="button"
            className={`search-chip ${
              activeCategory === "VIOLATIONS" ? "active" : ""
            }`}
            onClick={() => setActiveCategory("VIOLATIONS")}
          >
            <AlertTriangleIcon size={14} /> Biên bản vi phạm (
            {results.violations.length})
          </button>
        </div>

        {/* Results Container */}
        <div className="global-search-body">
          {!query.trim() ? (
            <div className="global-search-empty-state">
              <SearchIcon size={40} className="text-muted" />
              <h4>Tra cứu tập trung toàn hệ thống</h4>
              <p>
                Nhập tên phòng (VD: <em>A101</em>), tên sinh viên/MSSV (VD:{" "}
                <em>200123456</em>), mã đơn phiếu mượn (VD: <em>#1</em>), hoặc mã
                biên bản vi phạm (VD: <em>VP-</em>).
              </p>
            </div>
          ) : totalResults === 0 && !loading ? (
            <div className="global-search-empty-state">
              <AlertTriangleIcon size={36} className="text-muted" />
              <h4>Không tìm thấy kết quả phù hợp cho &quot;{query}&quot;</h4>
              <p>Vui lòng thử từ khóa khác hoặc kiểm tra lại chính tả.</p>
            </div>
          ) : (
            <div className="global-search-sections-wrap">
              {/* 1. ROOMS */}
              {(activeCategory === "ALL" || activeCategory === "ROOMS") &&
                results.rooms.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-header">
                      <span className="section-title">
                        <DoorIcon size={16} /> Phòng học &amp; Hội thảo (
                        {results.rooms.length})
                      </span>
                      <button
                        type="button"
                        className="section-more-btn"
                        onClick={() => {
                          onSelectCategory("rooms");
                          onClose();
                        }}
                      >
                        Đến Quản lý phòng &rarr;
                      </button>
                    </div>
                    <div className="search-grid-items">
                      {results.rooms.map((r) => (
                        <div
                          key={r.id}
                          className="search-item-card"
                          onClick={() => {
                            onSelectCategory("rooms");
                            onClose();
                          }}
                        >
                          <div className="item-icon-col icon-blue">
                            <DoorIcon size={20} />
                          </div>
                          <div className="item-info-col">
                            <strong className="item-name">{r.name}</strong>
                            <span className="item-sub">
                              Mã: <strong>{r.roomCode}</strong> • {r.building} - {r.floor} • Sức chứa: {r.capacity} người
                            </span>
                            <span className="item-badge-pill">
                              {r.roomTypeName || "Phòng tiêu chuẩn"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 2. USERS / BORROWERS */}
              {(activeCategory === "ALL" || activeCategory === "USERS") &&
                results.users.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-header">
                      <span className="section-title">
                        <UsersIcon size={16} /> Người mượn &amp; Tài khoản (
                        {results.users.length})
                      </span>
                      <button
                        type="button"
                        className="section-more-btn"
                        onClick={() => {
                          onSelectCategory("users");
                          onClose();
                        }}
                      >
                        Đến Quản lý người dùng &rarr;
                      </button>
                    </div>
                    <div className="search-grid-items">
                      {results.users.map((u) => (
                        <div
                          key={u.id}
                          className="search-item-card"
                          onClick={() => {
                            onSelectCategory("users");
                            onClose();
                          }}
                        >
                          <div className="item-icon-col icon-purple">
                            <UsersIcon size={20} />
                          </div>
                          <div className="item-info-col">
                            <div className="item-title-row">
                              <strong className="item-name">{u.fullName}</strong>
                              {u.hasActiveRestriction && (
                                <span className="item-danger-badge">
                                  <BanIcon size={11} /> Đang bị cấm mượn
                                </span>
                              )}
                            </div>
                            <span className="item-sub">
                              MSSV/Mã: <strong>{u.cardCode}</strong> • {u.email}
                            </span>
                            <span className="item-badge-pill">
                              {formatRole(u.role)} - {u.departmentName || "Khoa CNTT"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 3. BOOKINGS / PHIẾU MƯỢN */}
              {(activeCategory === "ALL" || activeCategory === "BOOKINGS") &&
                results.bookings.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-header">
                      <span className="section-title">
                        <ClipboardListIcon size={16} /> Phiếu đăng ký mượn phòng (
                        {results.bookings.length})
                      </span>
                      <button
                        type="button"
                        className="section-more-btn"
                        onClick={() => {
                          onSelectCategory("approvals");
                          onClose();
                        }}
                      >
                        Đến Duyệt đơn &rarr;
                      </button>
                    </div>
                    <div className="search-grid-items">
                      {results.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="search-item-card"
                          onClick={() => {
                            onSelectCategory("approvals");
                            onClose();
                          }}
                        >
                          <div className="item-icon-col icon-amber">
                            <ClipboardListIcon size={20} />
                          </div>
                          <div className="item-info-col">
                            <div className="item-title-row">
                              <strong className="item-name">
                                #{b.id} - {b.activityName}
                              </strong>
                              <span className="status-pill-small">
                                {b.status}
                              </span>
                            </div>
                            <span className="item-sub">
                              Người đặt: <strong>{b.borrowerName}</strong> (
                              {b.borrowerCode}) • {b.roomsSummary}
                            </span>
                            <span className="item-time">
                              <ClockIcon size={12} />{" "}
                              {new Date(b.requestedAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 4. VIOLATIONS / BIÊN BẢN VI PHẠM */}
              {(activeCategory === "ALL" || activeCategory === "VIOLATIONS") &&
                results.violations.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-header">
                      <span className="section-title">
                        <AlertTriangleIcon size={16} /> Biên bản vi phạm &amp; Kỷ
                        luật ({results.violations.length})
                      </span>
                      <button
                        type="button"
                        className="section-more-btn"
                        onClick={() => {
                          onSelectCategory("violations");
                          onClose();
                        }}
                      >
                        Đến Xử lý vi phạm &rarr;
                      </button>
                    </div>
                    <div className="search-grid-items">
                      {results.violations.map((v) => (
                        <div
                          key={v.id}
                          className="search-item-card"
                          onClick={() => {
                            onSelectCategory("violations");
                            onClose();
                          }}
                        >
                          <div className="item-icon-col icon-rose">
                            <AlertTriangleIcon size={20} />
                          </div>
                          <div className="item-info-col">
                            <div className="item-title-row">
                              <strong className="item-name">
                                {v.code} - {v.violationTypeName}
                              </strong>
                              <span className="item-danger-badge">
                                Mức {v.severity}
                              </span>
                            </div>
                            <span className="item-sub">
                              Người vi phạm: <strong>{v.offenderName}</strong> (
                              {v.offenderCode})
                            </span>
                            <p className="item-desc-text">{v.description}</p>
                            <span className="item-penalty-badge">
                              Phạt: {v.penaltyApplied} • {v.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
