import type { ReactElement } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SchedulePage from "./pages/SchedulePage";
import BookingPage from "./pages/BookingPage";
import PlaceholderHome from "./pages/PlaceholderHome";

function RequireAuth({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
              <RequireAuth>
                <PlaceholderHome title="Trang nhân sự" />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <PlaceholderHome title="Trang quản trị" />
              </RequireAuth>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
