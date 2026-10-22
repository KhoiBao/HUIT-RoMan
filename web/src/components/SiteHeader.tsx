import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isStaffRole } from "../lib/auth";
import { PlusIcon, LogOutIcon } from "./Icon";
import UserProfileModal from "./UserProfileModal";

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab");
  const isDatPhongActive = location.pathname === "/dat-phong" && currentTab !== "my-bookings";
  const isMyBookingsActive = location.pathname === "/dat-phong" && currentTab === "my-bookings";

  const displayName = user?.fullName || "Nguyễn Văn A";
  const displayCode = user?.cardCode || "2001230417";

  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          {/* Brand */}
          <NavLink to="/home" className="site-brand-link">
            <div className="huit-logo-box">
              <span className="huit-logo-letter">H.</span>
              <span className="huit-logo-tag">HUIT Library</span>
            </div>
            <div className="site-brand-text">
              <div className="site-name-huit">THƯ VIỆN HUIT</div>
              <div className="site-sub-huit">
                Trung tâm Thông tin - Thư viện
              </div>
            </div>
          </NavLink>

          {/* Navigation Tabs */}
          <nav className="site-nav-main">
            <NavLink
              to="/home"
              className={({ isActive }) =>
                `nav-tab-item ${isActive ? "active" : ""}`
              }
            >
              Trang chủ
            </NavLink>
            <NavLink
              to="/lich-phong"
              className={({ isActive }) =>
                `nav-tab-item ${isActive ? "active" : ""}`
              }
            >
              Lịch phòng
            </NavLink>
            <Link
              to="/dat-phong"
              className={`nav-tab-item ${isDatPhongActive ? "active" : ""}`}
            >
              Đặt phòng
            </Link>
            <Link
              to="/dat-phong?tab=my-bookings"
              className={`nav-tab-item ${isMyBookingsActive ? "active" : ""}`}
            >
              Phòng đã đăng ký
            </Link>
            {isStaffRole(user?.role) && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `nav-tab-item ${isActive ? "active" : ""}`
                }
              >
                Quản lý (Staff)
              </NavLink>
            )}
          </nav>

          {/* Right Actions */}
          <div className="site-header-right">
            {/* Notification bell */}
            <button
              type="button"
              className="header-bell-btn"
              title="Thông báo hệ thống"
              aria-label="Thông báo"
            >
              <svg
                className="bell-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="bell-badge-dot"></span>
            </button>

            {/* Đặt phòng Button */}
            <button
              type="button"
              className="btn-header-booking"
              onClick={() => navigate("/dat-phong")}
            >
              <PlusIcon size={16} />
              <span>Đặt phòng</span>
            </button>

            {/* User Profile */}
            <div
              className="header-user-profile clickable"
              title="Nhấn để xem thông tin chi tiết tài khoản"
              onClick={() => setShowProfileModal(true)}
            >
              <div className="user-avatar-circle">
                {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : "NA"}
              </div>
              <div className="user-meta-info">
                <span className="user-name-bold">{displayName}</span>
                <span className="user-code-small">{displayCode}</span>
              </div>
              <button
                type="button"
                className="user-logout-mini"
                title="Đăng xuất"
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
              >
                <LogOutIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}


