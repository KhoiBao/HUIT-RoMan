import { useAuth } from "../auth/AuthContext";

export default function PlaceholderHome({ title }: { title: string }) {
  const { user, logout } = useAuth();
  return (
    <div className="home-shell">
      <header className="home-header">
        <strong>{title}</strong>
        <div className="home-user">
          <span>
            {user?.fullName ?? user?.cardCode ?? "Người dùng"} — {user?.role ?? ""}
          </span>
          <button type="button" className="ghost-btn" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="home-main">
        <p>Trang {title} — khung chờ nghiệp vụ đặt phòng / duyệt / thống kê.</p>
      </main>
    </div>
  );
}
