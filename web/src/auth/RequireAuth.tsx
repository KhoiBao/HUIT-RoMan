import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isExplicitLogoutPending, isStaffRole } from "../lib/auth";
import { useAuth } from "./AuthContext";
import ForbiddenPage from "../pages/ForbiddenPage";

export function RequireAuth({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={
          isExplicitLogoutPending()
            ? null
            : { from: location.pathname + location.search }
        }
      />
    );
  }
  return children;
}

export function RequireStaff({ children }: { children: ReactElement }) {
  const { token, user } = useAuth();
  const location = useLocation();
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={
          isExplicitLogoutPending()
            ? null
            : { from: location.pathname + location.search }
        }
      />
    );
  }
  if (!isStaffRole(user?.role)) {
    return <ForbiddenPage />;
  }
  return children;
}
