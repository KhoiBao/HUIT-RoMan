import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LockIcon, ArrowRightIcon, CalendarIcon } from "../components/Icon";

export default function ForbiddenPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleName = user?.role || "Sinh viên";

  return (
    <div className="forbidden-page-layout">
      <main className="forbidden-main">
        <div className="forbidden-card">
          <div className="forbidden-icon-badge">
            <LockIcon size={40} className="forbidden-lock-svg" />
          </div>

          <span className="forbidden-code-pill">LỖI 403 • TRUY CẬP BỊ TỪ CHỐI</span>

          <h1 className="forbidden-title">Khu vực kiểm soát quyền Quản trị</h1>

          <p className="forbidden-desc">
            Trang điều hành <strong>Quản lý phòng Thư viện HUIT (Staff)</strong>{" "}
            chỉ dành riêng cho Cán bộ, Nhân viên và Quản trị viên hệ thống.
          </p>

          <div className="forbidden-user-info-box">
            <div className="user-info-row">
              <span className="info-label">Tài khoản hiện tại:</span>
              <span className="info-val">
                {user?.fullName || "Người dùng"} ({user?.cardCode})
              </span>
            </div>
            <div className="user-info-row">
              <span className="info-label">Vai trò ghi nhận:</span>
              <span className="info-role-badge">{roleName}</span>
            </div>
            <div className="forbidden-notice-text">
              * Nếu bạn là Cán bộ / Thủ thư phụ trách, vui lòng đăng nhập bằng
              tài khoản email công vụ được cấp quyền (VD: <em>NV001, TV001, admin</em>).
            </div>
          </div>

          <div className="forbidden-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/home")}
            >
              Quay về Trang chủ
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/lich-phong")}
            >
              <CalendarIcon size={16} />
              Xem Lịch phòng
            </button>
            <button
              type="button"
              className="btn-ghost-logout"
              onClick={logout}
            >
              Đổi tài khoản đăng nhập <ArrowRightIcon size={14} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
