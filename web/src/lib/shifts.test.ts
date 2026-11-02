import { describe, it, expect } from "vitest";
import {
  getLocalDateString,
  getTodayDateString,
  getTomorrowDateString,
  isShiftDateValid,
  isTimeRangeOverlapping,
  findOverlappingShift,
  getMondayOfWeek,
  get7DaysOfWeek,
  normalizeShiftDateString,
  type ShiftItem,
} from "./shifts";

describe("shifts date validation (BR: Chỉ phân ca trực sau ngày hiện tại)", () => {
  it("computes local date string correctly", () => {
    const fixedDate = new Date(2026, 10, 15); // Month is 0-indexed: 10 = Nov
    expect(getLocalDateString(fixedDate)).toBe("2026-11-15");
  });

  it("computes tomorrow date string as exactly 1 day after today", () => {
    const fixedNow = new Date(2026, 10, 15);
    expect(getTodayDateString(fixedNow)).toBe("2026-11-15");
    expect(getTomorrowDateString(fixedNow)).toBe("2026-11-16");
  });

  it("handles month boundary when computing tomorrow", () => {
    const endOfMonth = new Date(2026, 9, 31); // 2026-10-31
    expect(getTomorrowDateString(endOfMonth)).toBe("2026-11-01");
  });

  it("rejects shift dates on today or in the past", () => {
    const fixedNow = new Date(2026, 10, 15); // 2026-11-15
    expect(isShiftDateValid("2026-11-14", fixedNow)).toBe(false); // Yesterday
    expect(isShiftDateValid("2026-11-15", fixedNow)).toBe(false); // Today
    expect(isShiftDateValid("2026-10-01", fixedNow)).toBe(false); // Past month
    expect(isShiftDateValid("invalid-date", fixedNow)).toBe(false);
    expect(isShiftDateValid("", fixedNow)).toBe(false);
  });

  it("accepts shift dates strictly after today (from tomorrow onwards)", () => {
    const fixedNow = new Date(2026, 10, 15); // 2026-11-15
    expect(isShiftDateValid("2026-11-16", fixedNow)).toBe(true); // Tomorrow
    expect(isShiftDateValid("2026-11-20", fixedNow)).toBe(true); // Next week
    expect(isShiftDateValid("2026-12-01", fixedNow)).toBe(true); // Next month
  });
});

describe("shifts overlap validation (BR: Không trùng lịch trực)", () => {
  it("detects overlapping time ranges correctly", () => {
    // Overlapping ranges
    expect(isTimeRangeOverlapping("07:00", "11:30", "07:00", "11:30")).toBe(true);
    expect(isTimeRangeOverlapping("07:00", "11:30", "08:00", "10:00")).toBe(true);
    expect(isTimeRangeOverlapping("08:00", "10:00", "07:00", "11:30")).toBe(true);
    expect(isTimeRangeOverlapping("07:00", "11:30", "11:00", "13:00")).toBe(true);
    expect(isTimeRangeOverlapping("06:00", "08:00", "07:00", "11:30")).toBe(true);

    // Adjacent / touching ranges (NOT overlapping)
    expect(isTimeRangeOverlapping("07:00", "11:30", "11:30", "15:00")).toBe(false);
    expect(isTimeRangeOverlapping("11:30", "15:00", "07:00", "11:30")).toBe(false);

    // Completely separate ranges
    expect(isTimeRangeOverlapping("07:00", "11:30", "13:00", "17:00")).toBe(false);
  });

  it("finds overlapping shift on the same date", () => {
    const sampleShifts: ShiftItem[] = [
      {
        id: 1,
        name: "Ca Sáng",
        date: "2026-11-16T00:00:00Z",
        dateString: "2026-11-16",
        startTime: "07:00:00",
        endTime: "11:30:00",
        timeRange: "07:00 - 11:30",
        status: "Lên lịch",
        employees: [],
        createdAt: "2026-11-01T00:00:00Z",
      },
      {
        id: 2,
        name: "Ca Chiều",
        date: "2026-11-16T00:00:00Z",
        dateString: "2026-11-16",
        startTime: "12:30:00",
        endTime: "17:00:00",
        timeRange: "12:30 - 17:00",
        status: "Lên lịch",
        employees: [],
        createdAt: "2026-11-01T00:00:00Z",
      },
      {
        id: 3,
        name: "Ca Sáng Ngày Khác",
        date: "2026-11-17T00:00:00Z",
        dateString: "2026-11-17",
        startTime: "07:00:00",
        endTime: "11:30:00",
        timeRange: "07:00 - 11:30",
        status: "Lên lịch",
        employees: [],
        createdAt: "2026-11-01T00:00:00Z",
      },
    ];

    // Same date, overlapping time (08:00 - 10:00 on 2026-11-16)
    const match1 = findOverlappingShift("2026-11-16", "08:00", "10:00", sampleShifts);
    expect(match1).toBeDefined();
    expect(match1?.id).toBe(1);

    // Same date, adjacent non-overlapping time (11:30 - 12:30 on 2026-11-16)
    const match2 = findOverlappingShift("2026-11-16", "11:30", "12:30", sampleShifts);
    expect(match2).toBeUndefined();

    // Overlapping time but on different date (07:00 - 11:30 on 2026-11-18)
    const match3 = findOverlappingShift("2026-11-18", "07:00", "11:30", sampleShifts);
    expect(match3).toBeUndefined();

    // When updating shift 1 itself, ignore self (excludeShiftId: 1)
    const matchSelf = findOverlappingShift("2026-11-16", "07:00", "11:30", sampleShifts, 1);
    expect(matchSelf).toBeUndefined();
  });
});

describe("week calculation & date normalization", () => {
  it("getMondayOfWeek computes Monday correctly for any day of the week", () => {
    // 2026-11-02 is Monday
    const monday = new Date(2026, 10, 2);
    expect(getLocalDateString(getMondayOfWeek(monday))).toBe("2026-11-02");

    // 2026-11-04 is Wednesday
    const wednesday = new Date(2026, 10, 4);
    expect(getLocalDateString(getMondayOfWeek(wednesday))).toBe("2026-11-02");

    // 2026-11-08 is Sunday (should roll back to Monday 2026-11-02)
    const sunday = new Date(2026, 10, 8);
    expect(getLocalDateString(getMondayOfWeek(sunday))).toBe("2026-11-02");
  });

  it("get7DaysOfWeek generates exact 7 days from Monday to Sunday", () => {
    const monday = new Date(2026, 10, 2);
    const days = get7DaysOfWeek(monday);
    expect(days).toHaveLength(7);
    expect(getLocalDateString(days[0])).toBe("2026-11-02"); // Thứ 2
    expect(getLocalDateString(days[1])).toBe("2026-11-03"); // Thứ 3
    expect(getLocalDateString(days[2])).toBe("2026-11-04"); // Thứ 4
    expect(getLocalDateString(days[3])).toBe("2026-11-05"); // Thứ 5
    expect(getLocalDateString(days[4])).toBe("2026-11-06"); // Thứ 6
    expect(getLocalDateString(days[5])).toBe("2026-11-07"); // Thứ 7
    expect(getLocalDateString(days[6])).toBe("2026-11-08"); // Chủ nhật
  });

  it("normalizeShiftDateString normalizes ISO, short date, or Date objects", () => {
    expect(normalizeShiftDateString("2026-11-04T00:00:00Z")).toBe("2026-11-04");
    expect(normalizeShiftDateString("2026-11-04")).toBe("2026-11-04");
    expect(normalizeShiftDateString(new Date(2026, 10, 4))).toBe("2026-11-04");
    expect(normalizeShiftDateString(null)).toBe("");
    expect(normalizeShiftDateString(undefined)).toBe("");
  });
});
