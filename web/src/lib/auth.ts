export interface LoginValidation {
  valid: boolean;
  email?: string;
  password?: string;
}

export interface BackendLoginPayload {
  cardCode: string;
  password: string;
}

export type RoleGroup = "quan-tri" | "nhan-su" | "nguoi-dung";

const HUIT_SUFFIX = "@huit.edu.vn";

export function validateLoginInput(
  email: string,
  password: string,
): LoginValidation {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { valid: false, email: "Vui lòng nhập email HUIT" };
  }
  if (!trimmedEmail.toLowerCase().endsWith(HUIT_SUFFIX)) {
    return { valid: false, email: "Email phải có đuôi @huit.edu.vn" };
  }
  if (!password) {
    return { valid: false, password: "Vui lòng nhập mật khẩu" };
  }
  return { valid: true };
}

/**
 * Backend LoginRequest hiện vẫn là { cardCode, password }
 * (HUIT-RoMan.Application.Modules.Identity.DTOs.AuthDTOs).
 * UI nhập email -> gửi nguyên email vào field cardCode,
 * backend tra cứu CardCode OR Email OR UserName.
 */
export function buildLoginPayload(
  email: string,
  password: string,
): BackendLoginPayload {
  return { cardCode: email.trim(), password };
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
