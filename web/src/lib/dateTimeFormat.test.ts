import { describe, it, expect } from "vitest";
import {
  formatTime24h,
  formatDateVN,
  formatDateTime24h,
  generate24hTimeOptions,
} from "./dateTimeFormat";

describe("dateTimeFormat utility", () => {
  it("formats time strictly in 24h format HH:mm without SA/CH", () => {
    // 08:05 in morning
    const morning = new Date(2026, 10, 2, 8, 5);
    expect(formatTime24h(morning)).toBe("08:05");

    // 14:30 in afternoon
    const afternoon = new Date(2026, 10, 2, 14, 30);
    expect(formatTime24h(afternoon)).toBe("14:30");

    // 21:45 in evening
    const evening = new Date(2026, 10, 2, 21, 45);
    expect(formatTime24h(evening)).toBe("21:45");

    // Null or invalid
    expect(formatTime24h(null)).toBe("");
    expect(formatTime24h("invalid")).toBe("");
  });

  it("formats Vietnamese date strictly DD/MM/YYYY", () => {
    const d = new Date(2026, 10, 2, 8, 5); // Month 10 is November (0-indexed)
    expect(formatDateVN(d)).toBe("02/11/2026");

    expect(formatDateVN(null)).toBe("");
    expect(formatDateVN("invalid")).toBe("");
  });

  it("formats combined datetime strictly 24h VN", () => {
    const d = new Date(2026, 10, 2, 14, 30);
    expect(formatDateTime24h(d)).toBe("14:30 02/11/2026");
    expect(formatDateTime24h(d, " - ")).toBe("14:30 - 02/11/2026");

    expect(formatDateTime24h(null)).toBe("");
  });

  it("generates 24h time options with custom step and bounds", () => {
    const options = generate24hTimeOptions("07:00", "08:00", 15);
    expect(options).toEqual(["07:00", "07:15", "07:30", "07:45", "08:00"]);

    const hourly = generate24hTimeOptions("12:00", "15:00", 60);
    expect(hourly).toEqual(["12:00", "13:00", "14:00", "15:00"]);
  });
});

