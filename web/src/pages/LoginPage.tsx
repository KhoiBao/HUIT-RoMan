import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getHomePathForRole, validateLoginInput } from "../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const check = validateLoginInput(email, password);
    if (!check.valid) {
      setFieldError(check.email ?? check.password ?? "Thông tin chưa hợp lệ");
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem("huit-roman-user");
      const role = stored ? (JSON.parse(stored) as { role?: string }).role : null;
      navigate(location.state?.from ?? getHomePathForRole(role), {
        replace: true,
      });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Đăng nhập thất bại",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">RoMan</div>
          <h1>Hệ thống quản lý phòng dùng chung</h1>
          <p>Trường Đại học Công Thương TP.HCM (HUIT)</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Email HUIT</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="200123456@huit.edu.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <div className="password-row">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </label>

          {fieldError && <p className="error">{fieldError}</p>}
          {serverError && <p className="error">{serverError}</p>}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>

        <div className="login-hint">
          <p>Tài khoản do quản trị viên cấp. Demo: SwiftMail</p>
          <p className="muted">Gặp lỗi? Liên hệ quản trị hệ thống.</p>
        </div>
      </div>
    </div>
  );
}
