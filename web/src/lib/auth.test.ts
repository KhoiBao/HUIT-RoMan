// @vitest-environment jsdom
import { describe, expect, test, beforeEach } from "vitest";
import {
  buildLoginPayload,
  getHomePathForRole,
  mapRoleToGroup,
  saveSession,
  validateLoginInput,
} from "./auth";

describe("validateLoginInput", () => {
  test("rejects empty identifier", () => {
    const result = validateLoginInput("", "Huit@123");
    expect(result.identifier).toBe(
      "Vui lòng nhập MSSV/Mã CBVC hoặc email HUIT",
    );
  });

  test("accepts MSSV digits", () => {
    const result = validateLoginInput("2001230417", "Huit@123");
    expect(result.valid).toBe(true);
  });

  test("accepts staff code", () => {
    const result = validateLoginInput("TV001", "Huit@123");
    expect(result.valid).toBe(true);
  });

  test("rejects identifier with @ but non-huit domain", () => {
    const result = validateLoginInput("someone@gmail.com", "Huit@123");
    expect(result.identifier).toBe("Email phải có đuôi @huit.edu.vn");
  });

  test("accepts huit email case-insensitively", () => {
    const result = validateLoginInput("200123456@HUIT.EDU.VN", "Huit@123");
    expect(result.valid).toBe(true);
  });

  test("rejects too-short code", () => {
    const result = validateLoginInput("ab", "Huit@123");
    expect(result.identifier).toBe("Mã số không hợp lệ");
  });

  test("rejects empty password", () => {
    const result = validateLoginInput("200123456@huit.edu.vn", "");
    expect(result.password).toBe("Vui lòng nhập mật khẩu");
  });
});

describe("buildLoginPayload", () => {
  test("trims identifier into CardCode field (backend compat)", () => {
    expect(buildLoginPayload("  TV001 ", "Huit@123")).toEqual({
      cardCode: "TV001",
      password: "Huit@123",
    });
    expect(
      buildLoginPayload("200123456@huit.edu.vn", "Huit@123"),
    ).toEqual({
      cardCode: "200123456@huit.edu.vn",
      password: "Huit@123",
    });
  });
});

describe("saveSession", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("remember=true persists to localStorage", () => {
    saveSession("tok", '{"id":1}', true);
    expect(localStorage.getItem("huit-roman-token")).toBe("tok");
    expect(sessionStorage.getItem("huit-roman-token")).toBeNull();
  });

  test("remember=false persists to sessionStorage", () => {
    saveSession("tok", '{"id":1}', false);
    expect(sessionStorage.getItem("huit-roman-token")).toBe("tok");
    expect(localStorage.getItem("huit-roman-token")).toBeNull();
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
