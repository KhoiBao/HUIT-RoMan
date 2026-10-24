// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { TOKEN_KEY, USER_KEY } from "../lib/api";
import { AuthProvider, useAuth } from "./AuthContext";
import { RequireAuth } from "./RequireAuth";

function ProtectedPage() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={logout}>
      Đăng xuất
    </button>
  );
}

function LoginProbe() {
  const location = useLocation();
  return <div data-testid="login-state">{JSON.stringify(location.state)}</div>;
}

function TestRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginProbe />} />
      <Route
        path="/lich-phong"
        element={
          <RequireAuth>
            <ProtectedPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

beforeEach(() => {
  localStorage.setItem(TOKEN_KEY, "student-token");
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({ id: 1, cardCode: "200123456", role: "Student" })
  );
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

describe("logout session reset", () => {
  test("does not carry the previous account's protected page into the next login", () => {
    render(
      <MemoryRouter initialEntries={["/lich-phong"]}>
        <AuthProvider>
          <TestRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    expect(screen.getByTestId("login-state").textContent).toBe("null");
  });
});
