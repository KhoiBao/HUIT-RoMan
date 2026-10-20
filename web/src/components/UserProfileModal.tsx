import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import {
  MailIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BuildingIcon,
  AlertTriangleIcon,
  BanIcon,
  XIcon,
} from "./Icon";
import { checkMyEligibility, type UserEligibility } from "../lib/violations";


interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FullUserProfile {
  id: number;
  userName: string;
  cardCode: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  role?: string;
  departmentName?: string;
  createdAt?: string;
}

export default function UserProfileModal({
  isOpen,
  onClose,
}: UserProfileModalProps) {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [eligibility, setEligibility] = useState<UserEligibility | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Edit form fields
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");

  const [toastMsg, setToastMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadProfile() {
      setLoading(true);
      try {
        const [userRes, elig] = await Promise.all([
          api.get("/api/Users/me").catch(() => null),
          checkMyEligibility().catch(() => null),
        ]);

        const data = userRes?.data?.data ?? userRes?.data;
        if (isMounted && data) {
          setProfile(data);
          setPhoneInput(data.phoneNumber || "");
          setEmailInput(data.email || "");
        } else if (isMounted && user) {
          const fallbackData: FullUserProfile = {
            id: user.id,
            userName: user.cardCode,
            cardCode: user.cardCode,
            fullName: user.fullName || "Người dùng HUIT",
            email: `${user.cardCode.toLowerCase()}@huit.edu.vn`,
            phoneNumber: "0912 345 678",
            status: "Hoạt động",
            role: user.role || "Sinh viên",
            departmentName:
              user.role === "Admin"
                ? "Trường ĐH Công Thương TPHCM"
                : user.role === "Employee"
                ? "Trung tâm Thông tin - Thư viện"
                : "Khoa Công nghệ Thông tin",
            createdAt: "2024-09-05T08:00:00Z",
          };
          setProfile(fallbackData);
          setPhoneInput(fallbackData.phoneNumber || "");
          setEmailInput(fallbackData.email || "");
        }

        if (isMounted && elig) {
          setEligibility(elig);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setToastMsg(null);
    try {
      await api.put("/api/Users/me", {
        fullName: profile?.fullName,
        email: emailInput.trim(),
        phoneNumber: phoneInput.trim(),
        status: profile?.status,
      });


      setProfile((prev) =>
        prev
          ? {
              ...prev,
              email: emailInput.trim(),
              phoneNumber: phoneInput.trim(),
            }
          : null
      );
      setIsEditing(false);
      setToastMsg({
        text: "Cập nhật thông tin liên hệ thành công!",
        type: "success",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Không thể cập nhật thông tin lúc này.";
      setToastMsg({ text: msg, type: "error" });
    }
  };

  const displayName = profile?.fullName || user?.fullName || "Người dùng HUIT";
  const displayCode = profile?.cardCode || user?.cardCode || "2001230417";
  const displayRole = profile?.role || user?.role || "Sinh viên";
  const displayDept =
    profile?.departmentName ||
    (displayRole === "Admin"
      ? "Trường ĐH Công Thương TPHCM"
      : displayRole === "Employee"
      ? "Thư viện HUIT"
      : "Khoa Công nghệ Thông tin");

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-box user-profile-modal-box">
        {/* Header */}
        <div className="user-profile-header-banner">
          <div className="profile-banner-top">
            <span className="huit-library-tag">HUIT LIBRARY • TÀI KHOẢN ĐỊNH DANH</span>
            <button
              type="button"
              className="modal-close-btn text-white"
              onClick={onClose}
            >
              <XIcon size={16} />
            </button>
          </div>

          <div className="profile-user-summary">
            <div className="profile-big-avatar">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="profile-summary-text">
              <h2 className="profile-fullname">{displayName}</h2>
              <div className="profile-badge-row">
                <span className="profile-code-pill font-mono">{displayCode}</span>
                <span
                  className={`profile-role-pill role-${displayRole.toLowerCase()}`}
                >
                  <ShieldCheckIcon size={13} /> {displayRole}
                </span>
                <span className="profile-status-pill">
                  <span className="live-dot" />{" "}
                  {profile?.status === "Active"
                    ? "Hoạt động"
                    : profile?.status === "Suspended" || profile?.status === "Inactive"
                    ? "Đã khóa"
                    : profile?.status || "Hoạt động"}
                </span>
                {eligibility?.hasActiveRestriction && (
                  <span
                    className="profile-status-pill pill-danger"
                    style={{
                      background: "#fee2e2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 700,
                    }}
                  >
                    <BanIcon size={12} /> Cấm mượn phòng
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {toastMsg && (
          <div
            className={`auth-modal-alert ${
              toastMsg.type === "success" ? "alert-success" : "alert-error"
            }`}
            style={{ margin: "14px 20px 0" }}
          >
            {toastMsg.type === "success" ? (
              <CheckCircleIcon size={16} />
            ) : (
              <AlertTriangleIcon size={16} />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        <div className="user-profile-body">
          {loading ? (
            <div className="profile-loading-state">
              <span>Đang tải thông tin hồ sơ tài khoản...</span>
            </div>
          ) : (
            <>
              {/* Cảnh báo cấm mượn phòng nếu có */}
              {eligibility?.hasActiveRestriction && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    color: "#991b1b",
                    boxShadow: "0 1px 3px rgba(220, 38, 38, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: 700,
                      fontSize: "14px",
                      marginBottom: "6px",
                    }}
                  >
                    <AlertTriangleIcon size={18} />
                    <span>TÀI KHOẢN ĐANG BỊ HẠN CHẾ / CẤM MƯỢN PHÒNG</span>
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.45" }}>
                    <div>
                      <strong>Lý do:</strong>{" "}
                      {eligibility.reason || "Vi phạm quy chế sử dụng phòng thư viện."}
                    </div>
                    {eligibility.endAt && (
                      <div style={{ marginTop: "4px" }}>
                        <strong>Thời hạn áp dụng:</strong> Đến hết ngày{" "}
                        {new Date(eligibility.endAt).toLocaleDateString("vi-VN")}{" "}
                        {eligibility.remainingDays
                          ? `(còn ${eligibility.remainingDays} ngày)`
                          : ""}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Thông tin học thuật / Đơn vị */}
              <div className="profile-section-card">
                <h4 className="profile-card-title">
                  <BuildingIcon size={16} /> THÔNG TIN ĐƠN VỊ &amp; HỌC THUẬT
                </h4>
                <div className="profile-grid-rows">
                  <div className="profile-item-row">
                    <span className="item-label">Mã số định danh:</span>
                    <span className="item-value font-mono bold">{displayCode}</span>
                  </div>
                  <div className="profile-item-row">
                    <span className="item-label">Đơn vị quản lý / Khoa:</span>
                    <span className="item-value bold">{displayDept}</span>
                  </div>
                  <div className="profile-item-row">
                    <span className="item-label">Vai trò quyền hạn:</span>
                    <span className="item-value">{displayRole}</span>
                  </div>
                  <div className="profile-item-row">
                    <span className="item-label">Trạng thái hồ sơ:</span>
                    {eligibility?.hasActiveRestriction ||
                    eligibility?.isEligible === false ? (
                      <span
                        className="item-value bold"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#dc2626",
                        }}
                      >
                        <BanIcon size={14} /> Bị cấm mượn phòng{" "}
                        {eligibility.remainingDays
                          ? `(Còn ${eligibility.remainingDays} ngày)`
                          : ""}
                      </span>
                    ) : (
                      <span
                        className="item-value bold"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#16a34a",
                        }}
                      >
                        <CheckCircleIcon size={14} /> Đủ điều kiện đăng ký phòng
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ & chỉnh sửa */}
              <div className="profile-section-card">
                <div className="flex-between">
                  <h4 className="profile-card-title">
                    <MailIcon size={16} /> THÔNG TIN LIÊN LẠC
                  </h4>
                  {!isEditing && (
                    <button
                      type="button"
                      className="btn-link-edit"
                      onClick={() => setIsEditing(true)}
                    >
                      ✎ Chỉnh sửa liên hệ
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="profile-grid-rows">
                    <div className="profile-item-row">
                      <span className="item-label">Email trường HUIT:</span>
                      <span className="item-value color-blue font-mono">
                        {profile?.email || `${displayCode}@huit.edu.vn`}
                      </span>
                    </div>
                    <div className="profile-item-row">
                      <span className="item-label">Số điện thoại liên lạc:</span>
                      <span className="item-value font-mono">
                        {profile?.phoneNumber || "Chưa cập nhật"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="profile-edit-form">
                    <div className="form-field">
                      <label>Email liên lạc:</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Số điện thoại liên lạc:</label>
                      <input
                        type="tel"
                        required
                        placeholder="VD: 0912 345 678"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                      />
                    </div>
                    <div className="profile-edit-actions">
                      <button
                        type="button"
                        className="btn-modal-cancel"
                        onClick={() => setIsEditing(false)}
                      >
                        Hủy
                      </button>
                      <button type="submit" className="btn-modal-submit">
                        Lưu thay đổi
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer action */}
              <div className="user-profile-footer">
                <button
                  type="button"
                  className="btn-profile-logout"
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                >
                  Đăng xuất tài khoản
                </button>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={onClose}
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
