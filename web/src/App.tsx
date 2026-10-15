import type { ReactElement } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { isStaffRole } from "./lib/auth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SchedulePage from "./pages/SchedulePage";
import BookingPage from "./pages/BookingPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ForbiddenPage from "./pages/ForbiddenPage";

function RequireAuth({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireStaff({ children }: { children: ReactElement }) {
  const { token, user } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isStaffRole(user?.role)) {
    return <ForbiddenPage />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/dat-phong"
            element={
              <RequireAuth>
                <BookingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/lich-phong"
            element={
              <RequireAuth>
                <SchedulePage />
              </RequireAuth>
            }
          />
          <Route
            path="/staff"
            element={
              <RequireStaff>
                <AdminDashboardPage />
              </RequireStaff>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireStaff>
                <AdminDashboardPage />
              </RequireStaff>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

