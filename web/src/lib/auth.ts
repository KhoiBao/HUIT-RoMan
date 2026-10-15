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
  if (role === "Admin") return "quan-tri";
  if (role === "Employee") return "nhan-su";
  return "nguoi-dung";
}

export function getHomePathForRole(role?: string | null): string {
  const group = mapRoleToGroup(role);
  if (group === "quan-tri") return "/admin";
  if (group === "nhan-su") return "/staff";
  return "/home";
}

