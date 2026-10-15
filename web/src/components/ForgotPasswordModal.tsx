import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import {
  IdCardIcon,
  LockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
} from "./Icon";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (identifier: string) => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState<string>("");
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [otpToken, setOtpToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Bước 1: Yêu cầu gửi mã OTP
  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!identifier.trim()) {
      setErrorMsg("Vui lòng nhập MSSV, Mã CBVC hoặc Email HUIT.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/Auth/forgot-password", {
        identifier: identifier.trim(),
      });
      const data = res.data;
      setMaskedEmail(data.email || identifier);
      if (data.resetToken) {
        setOtpToken(data.resetToken); // Hỗ trợ trải nghiệm test nhanh
      }
      setSuccessMsg(
        data.message ||
          `Mã xác thực đã được gửi về hòm thư trường ${data.email || ""}`
      );
      setStep(2);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu mới
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!otpToken.trim()) {
      setErrorMsg("Vui lòng nhập mã OTP xác thực.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/Auth/reset-password", {
        identifier: identifier.trim(),
        resetToken: otpToken.trim(),
        newPassword: newPassword,
      });

      setSuccessMsg(
        res.data?.message || "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay."
      );
      setTimeout(() => {
        onSuccess(identifier.trim());
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setIdentifier("");
    setMaskedEmail("");
    setOtpToken("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-box modal-box-sm">
        <div className="modal-header">
          <div className="flex-col">
            <h3 className="modal-title">Khôi phục mật khẩu tài khoản</h3>
            <span className="modal-sub-huit">Hệ thống Cổng Thư viện HUIT</span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="modal-form">
            <p className="forgot-guide-text">
              Nhập <strong>MSSV / Mã Cán bộ viên chức</strong> hoặc <strong>Email trường</strong> đã đăng ký để nhận mã xác thực đặt lại mật khẩu.
            </p>

            <div className="form-field">
              <label>MSSV / Mã CBVC / Email HUIT:</label>
              <div className="search-input-wrap">
                <span className="search-icon-inside">
                  <IdCardIcon size={18} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="VD: 200123456 hoặc admin"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="auth-modal-alert alert-error">
                <AlertTriangleIcon size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleClose}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn-modal-submit"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Tiếp tục & Gửi OTP"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="modal-form">
            {successMsg && (
              <div className="auth-modal-alert alert-success">
                <CheckCircleIcon size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <p className="forgot-guide-text">
              Hệ thống đã tạo mã OTP gửi đến <strong>{maskedEmail}</strong>. Nhập mã và mật khẩu mới bên dưới:
            </p>

            <div className="form-field">
              <div className="flex-between">
                <label>Mã OTP xác thực (6 chữ số):</label>
                {otpToken && (
                  <span className="pill-otp-demo" title="Mã OTP tạo tự động">
                    Mã OTP: <strong>{otpToken}</strong>
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Nhập 6 chữ số OTP"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                style={{
                  letterSpacing: "4px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              />
            </div>

            <div className="form-field">
              <label>Mật khẩu mới:</label>
              <div className="search-input-wrap">
                <span className="search-icon-inside">
                  <LockIcon size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: "absolute", right: "10px" }}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label>Xác nhận mật khẩu mới:</label>
              <div className="search-input-wrap">
                <span className="search-icon-inside">
                  <LockIcon size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="auth-modal-alert alert-error">
                <AlertTriangleIcon size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setStep(1)}
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="btn-modal-submit"
                disabled={loading}
              >
                {loading ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
