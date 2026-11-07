import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import InfoFooter from "./InfoFooter";
import SiteHeader from "./SiteHeader";
import { useAuth } from "../auth/AuthContext";
import { getHomePathForRole, isStaffRole } from "../lib/auth";

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function PortalLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isStaff = isStaffRole(user?.role);
  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/staff");

  // Quản lý & Nhân viên chỉ được ở trang quản lý, không được về lại trang chủ giống sinh viên và giáo viên
  if (isStaff && !isAdminRoute) {
    return <Navigate to={getHomePathForRole(user?.role)} replace />;
  }

  if (isAdminRoute) {
    return (
      <div className="admin-portal-root">
        <ScrollManager />
        <Outlet />
      </div>
    );
  }

  return (
    <div className="portal-layout">
      <ScrollManager />
      <SiteHeader />
      <div className="portal-layout-main">
        <Outlet />
      </div>
      <InfoFooter />
    </div>
  );
}
