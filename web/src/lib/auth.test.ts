import { describe, expect, test } from "vitest";
import {
  buildLoginPayload,
  getHomePathForRole,
  mapRoleToGroup,
  validateLoginInput,
} from "./auth";

describe("validateLoginInput", () => {
  test("rejects empty email", () => {
    const result = validateLoginInput("", "Huit@123");
    expect(result.email).toBe("Vui lòng nhập email HUIT");
  });

  test("rejects non-huit email", () => {
    const result = validateLoginInput("someone@gmail.com", "Huit@123");
    expect(result.email).toBe("Email phải có đuôi @huit.edu.vn");
  });

  test("accepts huit email case-insensitively", () => {
    const result = validateLoginInput("200123456@HUIT.EDU.VN", "Huit@123");
    expect(result.email).toBeUndefined();
  });

  test("rejects empty password", () => {
    const result = validateLoginInput("200123456@huit.edu.vn", "");
    expect(result.password).toBe("Vui lòng nhập mật khẩu");
  });

  test("accepts valid input", () => {
    const result = validateLoginInput("200123456@huit.edu.vn", "Huit@123");
    expect(result.valid).toBe(true);
  });
});

describe("buildLoginPayload", () => {
  test("maps email input to CardCode field (backend compat)", () => {
    const payload = buildLoginPayload(" 200123456@huit.edu.vn ", "Huit@123");
    expect(payload).toEqual({
      cardCode: "200123456@huit.edu.vn",
      password: "Huit@123",
    });
  });
});

describe("mapRoleToGroup", () => {
  test("maps backend roles to 3 display groups", () => {
    expect(mapRoleToGroup("Admin")).toBe("quan-tri");
    expect(mapRoleToGroup("Employee")).toBe("nhan-su");
    expect(mapRoleToGroup("Student")).toBe("nguoi-dung");
    expect(mapRoleToGroup("Lecturer")).toBe("nguoi-dung");
  });
});

describe("getHomePathForRole", () => {
  test("routes each group to its home", () => {
    expect(getHomePathForRole("Admin")).toBe("/admin");
    expect(getHomePathForRole("Employee")).toBe("/staff");
    expect(getHomePathForRole("Student")).toBe("/home");
    expect(getHomePathForRole("Lecturer")).toBe("/home");
  });
});
