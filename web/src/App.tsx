import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth, RequireStaff } from "./auth/RequireAuth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SchedulePage from "./pages/SchedulePage";
import BookingPage from "./pages/BookingPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PortalLayout from "./components/PortalLayout";
import { LiveChatWidget } from "./components/chat/LiveChatWidget";
import { ConfirmProvider } from "./context/ConfirmContext";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PortalLayout />}>
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
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <LiveChatWidget />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}


