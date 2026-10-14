import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { validateLoginInput } from "../lib/auth";
import {
  ArrowRightIcon,
  BankIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  IdCardIcon,
  InfoIcon,
  LibraryIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
} from "../components/Icon";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      await login(identifier, password, remember);
      navigate(location.state?.from ?? "/home", { replace: true });
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
            <div className="brand-logo">
              <BankIcon />
            </div>
            <div>
              <div className="brand-eyebrow">HUIT • ROOM MANAGEMENT</div>
              <div className="brand-title">RoMan</div>
              <div className="brand-sub">
                Hệ thống quản lý đăng ký và khai thác phòng dùng chung tại
                Trường Đại học Công Thương Thành phố Hồ Chí Minh
              </div>
            </div>
          </div>

          <hr className="rule" />

          <p className="lede">
            Hệ thống quản lý đăng ký và khai thác phòng dùng chung tại Trường Đại học Công Thương Thành phố Hồ Chí Minh.
          </p>

          <div className="photo" role="img" aria-label="Không gian học tập HUIT">
            <svg className="photo-art" viewBox="0 0 400 180" aria-hidden="true">
              <g fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3">
                <path d="M40 150V60l30-12v102" />
                <path d="M78 150V60l30-12v102" />
                <path d="M116 150V60l30-12v102" />
                <path d="M40 78h106M40 104h106M40 130h106" />
              </g>
              <g fill="#ffffff" fillOpacity="0.22">
                <rect x="230" y="40" width="130" height="110" rx="6" />
                <rect x="244" y="56" width="102" height="8" rx="4" />
                <rect x="244" y="72" width="102" height="8" rx="4" />
                <rect x="244" y="88" width="70" height="8" rx="4" />
              </g>
            </svg>
            <div className="photo-caption">
              <span>Cơ sở chính: 140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú</span>
              <LibraryIcon />
            </div>
          </div>

          <div className="policy">
            <div className="policy-head">
              <InfoIcon />
              <strong>Chính sách định danh và cấp quyền</strong>
            </div>
            <p>
              <strong>Sinh viên &amp; Học viên:</strong> Sử dụng Mã số sinh
              viên (MSSV) kèm email định danh do nhà trường cung cấp
              (@huit.edu.vn).
            </p>
            <p>
              <strong>Cán bộ &amp; Giảng viên:</strong> Đăng nhập thông qua
              tài khoản quản lý nhân sự tập trung hoặc Cổng SSO trường.
            </p>
          </div>

          <div className="contacts">
            <div className="contact-row">
              <PhoneIcon />
              <span>
                Tổng đài hỗ trợ: <strong>(028) 3816 1673</strong> (Số nội bộ:
                124)
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
              <span>Thời gian phục vụ: Thứ 2 - Thứ 7 (07:30 - 19:30)</span>
            </div>
          </div>
        </aside>

        <section className="login-card">
          <h1>Đăng nhập RoMan</h1>
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
                onClick={() =>
                  setNotice(
                    "Chức năng quên mật khẩu chưa hỗ trợ trong đồ án. Liên hệ quản trị viên để đặt lại mật khẩu.",
                  )
                }
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
    </div>
  );
}
