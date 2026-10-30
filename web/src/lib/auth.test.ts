import { describe, expect, test } from "vitest";
import {
  isStaffRole,
  mapRoleToGroup,
  getHomePathForRole,
  formatRole,
} from "./auth";

describe("auth helpers and role-based access control", () => {
  test("isStaffRole correctly identifies staff, manager, and admin roles", () => {
    // Permitted roles
    expect(isStaffRole("Admin")).toBe(true);
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("Manager")).toBe(true);
    expect(isStaffRole("manager")).toBe(true);
    expect(isStaffRole("Quản lý đơn vị")).toBe(true);
    expect(isStaffRole("Employee")).toBe(true);
    expect(isStaffRole("employee")).toBe(true);
    expect(isStaffRole("quan-tri")).toBe(true);
    expect(isStaffRole("quan-ly")).toBe(true);
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
    expect(mapRoleToGroup("admin")).toBe("quan-tri");
    expect(mapRoleToGroup("Manager")).toBe("quan-tri");
    expect(mapRoleToGroup("manager")).toBe("quan-tri");
    expect(mapRoleToGroup("Quản lý đơn vị")).toBe("quan-tri");
    expect(mapRoleToGroup("Quản trị viên")).toBe("quan-tri");
    expect(mapRoleToGroup("Employee")).toBe("nhan-su");
    expect(mapRoleToGroup("employee")).toBe("nhan-su");
    expect(mapRoleToGroup("Nhân viên")).toBe("nhan-su");
    expect(mapRoleToGroup("Student")).toBe("nguoi-dung");
    expect(mapRoleToGroup("Lecturer")).toBe("nguoi-dung");
    expect(mapRoleToGroup(null)).toBe("nguoi-dung");
  });

  test("getHomePathForRole routes admin/manager/staff to /admin or /staff", () => {
    expect(getHomePathForRole("Admin")).toBe("/admin");
    expect(getHomePathForRole("Manager")).toBe("/admin");
    expect(getHomePathForRole("Quản lý đơn vị")).toBe("/admin");
    expect(getHomePathForRole("Employee")).toBe("/staff");
    expect(getHomePathForRole("Student")).toBe("/home");
    expect(getHomePathForRole("Lecturer")).toBe("/home");
  });

  test("formatRole translates system roles into Vietnamese", () => {
    expect(formatRole("Admin")).toBe("Quản trị viên");
    expect(formatRole("admin")).toBe("Quản trị viên");
    expect(formatRole("Manager")).toBe("Quản lý đơn vị");
    expect(formatRole("manager")).toBe("Quản lý đơn vị");
    expect(formatRole("Employee")).toBe("Nhân viên");
    expect(formatRole("employee")).toBe("Nhân viên");
    expect(formatRole("Lecturer")).toBe("Giảng viên");
    expect(formatRole("lecturer")).toBe("Giảng viên");
    expect(formatRole("Student")).toBe("Sinh viên");
    expect(formatRole("student")).toBe("Sinh viên");
    expect(formatRole("Sinh viên")).toBe("Sinh viên");
    expect(formatRole(null)).toBe("Người dùng");
    expect(formatRole("")).toBe("Người dùng");
  });
});
