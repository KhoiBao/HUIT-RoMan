import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { clearExplicitLogout, getHomePathForRole, validateLoginInput } from "../lib/auth";
import {
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  IdCardIcon,
  LibraryIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
} from "../components/Icon";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    setNotice(null);
    const check = validateLoginInput(identifier, password);
    if (!check.valid) {
      setFieldError(
        check.identifier ?? check.password ?? "Thông tin chưa hợp lệ",
      );
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const loggedInUser = await login(identifier, password, remember);
      clearExplicitLogout();
      navigate(
        location.state?.from ?? getHomePathForRole(loggedInUser?.role),
        { replace: true },
      );
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal">
      <div className="portal-grid">
        <aside className="info-card">
          <div className="brand">
            <div>
              <div className="brand-eyebrow">HUIT • ROOM MANAGEMENT</div>
              <div className="brand-title">
                Hệ thống quản lý phòng dùng chung HUIT
              </div>
              <div className="brand-sub">
                Thư viện HUIT · Trường Đại học Công Thương Thành phố Hồ Chí
                Minh
              </div>
            </div>
          </div>

          <hr className="rule" />

          <p className="lede">
            Hệ thống quản lý đăng ký và khai thác phòng dùng chung tại Trường Đại học Công Thương Thành phố Hồ Chí Minh.
          </p>

          <figure className="photo">
            <img
              className="photo-img"
              src="/images/huit-campus-gate.jpg"
              alt="Cổng Trường Đại học Công Thương Thành phố Hồ Chí Minh tại 140 Lê Trọng Tấn"
            />
            <figcaption className="photo-caption">
              <span>Cơ sở chính: 140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú</span>
              <LibraryIcon />
            </figcaption>
          </figure>

          <div className="contacts">
            <div className="contact-row">
              <PhoneIcon />
              <span>
                Tổng đài hỗ trợ: <strong>(028) 3816 1673</strong>
              </span>
            </div>
            <div className="contact-row">
              <MailIcon />
              <span>
                Hỗ trợ kỹ thuật: <strong>thuvien@huit.edu.vn</strong>
              </span>
            </div>
            <div className="contact-row">
              <ClockIcon />
              <span>Thời gian phục vụ: Thứ 2 - Thứ 7, theo khung giờ hệ thống</span>
            </div>
          </div>
        </aside>

        <section className="login-card">
          <h1>Đăng nhập</h1>
          <p className="login-sub">
            Sử dụng tài khoản Sinh viên / Giảng viên / Cán bộ viên chức
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>
                Email HUIT <b>*</b>
              </span>
              <div className="input-wrap">
                <span className="input-icon">
                  <IdCardIcon />
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="VD: username@huit.edu.vn"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </label>

            <label className="field">
              <span>
                Mật khẩu <b>*</b>
              </span>
              <div className="input-wrap">
                <span className="input-icon">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu truy cập"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            {fieldError && <p className="error">{fieldError}</p>}
            {serverError && <p className="error">{serverError}</p>}
            {notice && <p className="notice">{notice}</p>}

            <div className="form-row">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Ghi nhớ đăng nhập
              </label>
              <button
                type="button"
                className="link-btn"
                onClick={() => setShowForgotModal(true)}
              >
                Quên mật khẩu?
              </button>
            </div>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              {!loading && <ArrowRightIcon />}
            </button>
          </form>
        </section>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSuccess={(id) => {
          setIdentifier(id);
          setPassword("");
          setFieldError(null);
          setServerError(null);
          setNotice(
            "Đặt lại mật khẩu thành công! Vui lòng nhập mật khẩu mới vừa đổi để đăng nhập."
          );
        }}
      />
    </div>
  );
}

