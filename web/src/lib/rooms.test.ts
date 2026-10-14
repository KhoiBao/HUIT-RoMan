import { describe, expect, test } from "vitest";
import {
  deriveRoomStats,
  getNextIndex,
  getPrevIndex,
} from "./rooms";

describe("deriveRoomStats", () => {
  test("counts live statuses from room list", () => {
    const stats = deriveRoomStats([
      { status: "Trống" },
      { status: "Trống" },
      { status: "Available" },
      { status: "Bảo trì" },
      { status: "Đang sử dụng" },
    ]);
    expect(stats).toEqual({
      trong: 3,
      daDat: 0,
      dangDung: 1,
      baoTri: 1,
      total: 5,
    });
  });

  test("empty list gives zeros", () => {
    expect(deriveRoomStats([])).toEqual({
      trong: 0,
      daDat: 0,
      dangDung: 0,
      baoTri: 0,
      total: 0,
    });
  });

  test("missing status counts as trống", () => {
    const stats = deriveRoomStats([{}, { status: null }]);
    expect(stats.trong).toBe(2);
    expect(stats.total).toBe(2);
  });
});

describe("slider index", () => {
  test("next wraps around", () => {
    expect(getNextIndex(2, 3)).toBe(0);
    expect(getNextIndex(0, 3)).toBe(1);
  });

  test("prev wraps around", () => {
    expect(getPrevIndex(0, 3)).toBe(2);
    expect(getPrevIndex(1, 3)).toBe(0);
  });
});
