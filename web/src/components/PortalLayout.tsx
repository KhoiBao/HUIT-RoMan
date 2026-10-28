import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import InfoFooter from "./InfoFooter";
import SiteHeader from "./SiteHeader";

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
  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/staff");

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
