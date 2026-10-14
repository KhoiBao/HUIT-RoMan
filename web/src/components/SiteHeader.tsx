import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function SiteHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-brand">
          <div className="site-logo">R</div>
          <div>
            <div className="site-name">RoMan</div>
            <div className="site-sub">
              Hệ thống quản lý đăng ký và khai thác phòng dùng chung
            </div>
          </div>
        </div>
        <nav className="site-nav">
          <NavLink to="/home">Trang chủ</NavLink>
          <NavLink to="/dat-phong">Đặt phòng</NavLink>
          <NavLink to="/lich-phong">Lịch phòng</NavLink>
        </nav>
        <div className="site-user">
          <span>
            {user?.fullName ?? user?.cardCode ?? "Người dùng"}
          </span>
          <button type="button" className="link-btn" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
