import { TOKEN_KEY, USER_KEY } from "./api";

export interface LoginValidation {
  valid: boolean;
  identifier?: string;
  password?: string;
}

export interface BackendLoginPayload {
  cardCode: string;
  password: string;
}

export type RoleGroup = "quan-tri" | "nhan-su" | "nguoi-dung";

const HUIT_SUFFIX = "@huit.edu.vn";

export function validateLoginInput(
  identifier: string,
  password: string,
): LoginValidation {
  const id = identifier.trim();
  if (!id) {
    return {
      valid: false,
      identifier: "Vui lòng nhập MSSV/Mã CBVC hoặc email HUIT",
    };
  }
  if (id.includes("@")) {
    if (!id.toLowerCase().endsWith(HUIT_SUFFIX)) {
      return { valid: false, identifier: "Email phải có đuôi @huit.edu.vn" };
    }
  } else if (!/^[A-Za-z0-9]{3,50}$/.test(id)) {
    return { valid: false, identifier: "Mã số không hợp lệ" };
  }
  if (!password) {
    return { valid: false, password: "Vui lòng nhập mật khẩu" };
  }
  return { valid: true };
}

/**
 * Backend LoginRequest hiện vẫn là { cardCode, password }
 * (HUIT-RoMan.Application.Modules.Identity.DTOs.AuthDTOs).
 * UI nhập MSSV/Mã CBVC/email -> gửi nguyên vào field cardCode,
 * backend tra cứu CardCode OR Email OR UserName.
 */
export function buildLoginPayload(
  identifier: string,
  password: string,
): BackendLoginPayload {
  return { cardCode: identifier.trim(), password };
}

/** Ghi nhớ đăng nhập: true -> localStorage, false -> sessionStorage. */
export function saveSession(
  token: string,
  userJson: string | null,
  remember: boolean,
): void {
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  primary.setItem(TOKEN_KEY, token);
  secondary.removeItem(TOKEN_KEY);
  if (userJson === null) {
    primary.removeItem(USER_KEY);
    secondary.removeItem(USER_KEY);
  } else {
    primary.setItem(USER_KEY, userJson);
    secondary.removeItem(USER_KEY);
  }
}

const LOGOUT_MARKER_KEY = "roman.explicit-logout";

/** Đánh dấu người dùng chủ động đăng xuất để không khôi phục trang cũ. */
export function markExplicitLogout(): void {
  sessionStorage.setItem(LOGOUT_MARKER_KEY, "1");
}

/** Xoá đánh dấu sau khi tài khoản mới đăng nhập thành công. */
export function clearExplicitLogout(): void {
  sessionStorage.removeItem(LOGOUT_MARKER_KEY);
}

export function isExplicitLogoutPending(): boolean {
  return sessionStorage.getItem(LOGOUT_MARKER_KEY) === "1";
}

export function isStaffRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "employee" ||
    normalized === "quan-tri" ||
    normalized === "nhan-su" ||
    normalized === "thủ thư" ||
    normalized === "quản lý phòng" ||
    normalized === "quản trị viên" ||
    normalized === "nhân viên"
  );
}

export function mapRoleToGroup(role?: string | null): RoleGroup {
  if (!role) return "nguoi-dung";
  const normalized = role.trim().toLowerCase();
  if (
    normalized === "admin" ||
    normalized === "quan-tri" ||
    normalized === "quản trị viên"
  ) {
    return "quan-tri";
  }
  if (
    normalized === "employee" ||
    normalized === "nhan-su" ||
    normalized === "nhân viên" ||
    normalized === "thủ thư" ||
    normalized === "quản lý phòng"
  ) {
    return "nhan-su";
  }
  return "nguoi-dung";
}

export function getHomePathForRole(role?: string | null): string {
  const group = mapRoleToGroup(role);
  if (group === "quan-tri") return "/admin";
  if (group === "nhan-su") return "/staff";
  return "/home";
}

/**
 * Chuyển đổi mã role hệ thống sang tiếng Việt thân thiện và đồng bộ toàn bộ ứng dụng.
 */
export function formatRole(role?: string | null): string {
  if (!role) return "Người dùng";
  const normalized = role.trim().toLowerCase();
  if (
    normalized === "admin" ||
    normalized === "quan-tri" ||
    normalized === "quản trị viên"
  ) {
    return "Quản trị viên";
  }
  if (
    normalized === "employee" ||
    normalized === "nhan-su" ||
    normalized === "nhân viên" ||
    normalized === "thủ thư" ||
    normalized === "quản lý phòng"
  ) {
    return "Nhân viên";
  }
  if (normalized === "lecturer" || normalized === "giảng viên") {
    return "Giảng viên";
  }
  if (normalized === "student" || normalized === "sinh viên") {
    return "Sinh viên";
  }
  if (normalized === "user" || normalized === "người dùng") {
    return "Người dùng";
  }
  return role;
}

