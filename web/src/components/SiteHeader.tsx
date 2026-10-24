import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isStaffRole } from "../lib/auth";
import { LogOutIcon, PlusIcon } from "./Icon";
import UserProfileModal from "./UserProfileModal";

function roleLabel(role?: string | null): string {
  const value = (role ?? "").trim().toLowerCase();
  if (value === "admin" || value === "quan-tri" || value === "quản trị viên") {
    return "Quản trị viên";
  }
  if (
    value === "employee" ||
    value === "nhan-su" ||
    value === "nhân viên" ||
    value === "thủ thư" ||
    value === "quản lý phòng"
  ) {
    return "Nhân sự HUIT";
  }
  if (value === "lecturer" || value === "giảng viên") return "Giảng viên";
  if (value === "student" || value === "sinh viên") return "Sinh viên";
  return "Tài khoản HUIT";
}

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="m6 6 12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  const displayName = user?.fullName?.trim() || user?.cardCode || "Tài khoản HUIT";
  const role = roleLabel(user?.role);
  const isStaff = isStaffRole(user?.role);
  const isMyBookings =
    location.pathname === "/dat-phong" &&
    new URLSearchParams(location.search).get("tab") === "my-bookings";

  const handleLogout = () => {
    logout();
  };

  const navLinkClass = (
    isActive: boolean,
    forceInactive = false
  ): string =>
    `roman-nav-link${isActive && !forceInactive ? " is-active" : ""}`;

  return (
    <>
      <header className="roman-header">
        <div className="roman-header-inner">
          <Link to="/home" className="roman-brand" aria-label="RoMan — Trang chủ">
            <span className="roman-brand-logo">
              <img src="/roman-logo-icon.png" alt="Logo RoMan Room Booking" />
            </span>
            <span className="roman-brand-text">
              <span className="roman-brand-name">RoMan</span>
              <span className="roman-brand-sub">
                Hệ thống quản lý phòng dùng chung HUIT
              </span>
            </span>
          </Link>

          <nav className="roman-nav" aria-label="Điều hướng chính">
            <NavLink
              to="/home"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              Trang chủ
            </NavLink>
            <NavLink
              to="/lich-phong"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              Lịch phòng
            </NavLink>
            <NavLink
              to="/dat-phong"
              end
              className={({ isActive }) => navLinkClass(isActive, isMyBookings)}
            >
              Đặt phòng
            </NavLink>
            <NavLink
              to="/dat-phong?tab=my-bookings"
              className={() => navLinkClass(isMyBookings)}
            >
              Phòng đã đăng ký
            </NavLink>
            {isStaff && (
              <NavLink
                to="/admin"
                className={({ isActive }) => navLinkClass(isActive)}
              >
                Quản lý
              </NavLink>
            )}
          </nav>

          <div className="roman-header-actions">
            <Link to="/dat-phong" className="roman-header-cta">
              <PlusIcon size={15} />
              Đặt phòng
            </Link>
            <button
              type="button"
              className="roman-user"
              onClick={() => setShowProfileModal(true)}
              title="Xem thông tin tài khoản"
            >
              <span className="roman-avatar">{initials(displayName)}</span>
              <span className="roman-user-text">
                <strong>{displayName}</strong>
                <small>{role}</small>
              </span>
            </button>
            <button
              type="button"
              className="roman-icon-btn"
              onClick={handleLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOutIcon size={18} />
            </button>
            <button
              type="button"
              className="roman-mobile-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="roman-mobile-nav" aria-label="Điều hướng di động">
            <NavLink
              to="/home"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              Trang chủ
            </NavLink>
            <NavLink
              to="/lich-phong"
              className={({ isActive }) => navLinkClass(isActive)}
            >
              Lịch phòng
            </NavLink>
            <NavLink
              to="/dat-phong"
              end
              className={({ isActive }) => navLinkClass(isActive, isMyBookings)}
            >
              Đặt phòng
            </NavLink>
            <NavLink
              to="/dat-phong?tab=my-bookings"
              className={() => navLinkClass(isMyBookings)}
            >
              Phòng đã đăng ký
            </NavLink>
            {isStaff && (
              <NavLink
                to="/admin"
                className={({ isActive }) => navLinkClass(isActive)}
              >
                Quản lý
              </NavLink>
            )}
            <button type="button" className="roman-mobile-logout" onClick={handleLogout}>
              <LogOutIcon size={16} />
              Đăng xuất
            </button>
          </nav>
        )}
      </header>

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}
