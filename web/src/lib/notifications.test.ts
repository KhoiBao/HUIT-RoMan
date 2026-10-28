import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./notifications";

describe("formatRelativeTime", () => {
  it("formats recent timestamp as 'Vừa xong'", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("Vừa xong");
  });

  it("formats 10 minutes ago properly", () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinAgo)).toBe("10 phút trước");
  });

  it("formats 2 hours ago properly", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("2 giờ trước");
  });

  it("handles empty input", () => {
    expect(formatRelativeTime("")).toBe("");
  });
});

