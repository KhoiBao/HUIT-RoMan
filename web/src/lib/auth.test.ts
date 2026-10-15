import { describe, expect, test } from "vitest";
import { isStaffRole, mapRoleToGroup, getHomePathForRole } from "./auth";

describe("auth helpers and role-based access control", () => {
  test("isStaffRole correctly identifies staff and admin roles", () => {
    // Permitted roles
    expect(isStaffRole("Admin")).toBe(true);
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("Employee")).toBe(true);
    expect(isStaffRole("employee")).toBe(true);
    expect(isStaffRole("quan-tri")).toBe(true);
    expect(isStaffRole("nhan-su")).toBe(true);
    expect(isStaffRole("Thủ thư")).toBe(true);
    expect(isStaffRole("Quản lý phòng")).toBe(true);
    expect(isStaffRole("Quản trị viên")).toBe(true);
    expect(isStaffRole("Nhân viên")).toBe(true);

    // Non-staff roles (must be blocked)
    expect(isStaffRole("Student")).toBe(false);
    expect(isStaffRole("student")).toBe(false);
    expect(isStaffRole("Sinh viên")).toBe(false);
    expect(isStaffRole("Lecturer")).toBe(false);
    expect(isStaffRole("Giảng viên")).toBe(false);
    expect(isStaffRole("Guest")).toBe(false);
    expect(isStaffRole("")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  test("mapRoleToGroup maps roles into correct role groups", () => {
    expect(mapRoleToGroup("Admin")).toBe("quan-tri");
    expect(mapRoleToGroup("Employee")).toBe("nhan-su");
    expect(mapRoleToGroup("Student")).toBe("nguoi-dung");
    expect(mapRoleToGroup("Lecturer")).toBe("nguoi-dung");
    expect(mapRoleToGroup(null)).toBe("nguoi-dung");
  });

  test("getHomePathForRole routes admin/staff to /admin or /staff", () => {
    expect(getHomePathForRole("Admin")).toBe("/admin");
    expect(getHomePathForRole("Employee")).toBe("/staff");
    expect(getHomePathForRole("Student")).toBe("/home");
    expect(getHomePathForRole("Lecturer")).toBe("/home");
  });
});
