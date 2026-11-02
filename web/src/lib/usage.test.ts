import { describe, it, expect } from "vitest";
import { getCheckInStatus } from "./usage";

describe("getCheckInStatus - Kiểm tra quy định nhận phòng (Check-in)", () => {
  const baseSession = {
    id: 10,
    status: "Chờ nhận phòng",
    startAt: "2026-11-03T08:00:00Z",
    endAt: "2026-11-03T10:00:00Z",
  };

  it("Không cho phép check-in nếu trạng thái không phải 'Chờ nhận phòng'", () => {
    const res = getCheckInStatus({ ...baseSession, status: "Hoàn thành" });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("không ở trạng thái chờ nhận phòng");
  });

  it("Chặn check-in quá sớm trước 15 phút (trước T - 15 phút)", () => {
    // 8:00 start -> mở lúc 7:45. Lúc 7:40 là trước 20 phút -> bị chặn
    const now = new Date("2026-11-03T07:40:00Z");
    const res = getCheckInStatus(baseSession, now);
    expect(res.allowed).toBe(false);
    expect(res.isTooEarly).toBe(true);
    expect(res.reason).toContain("Chưa đến thời điểm nhận phòng");
  });

  it("Chặn check-in vào ngày hôm trước (như ảnh người dùng báo cáo lúc 22:26 ngày 02/11 cho lịch 07:00 ngày 03/11)", () => {
    const sessionTomorrow = {
      id: 11,
      status: "Chờ nhận phòng",
      startAt: "2026-11-03T07:00:00Z",
      endAt: "2026-11-03T08:00:00Z",
    };
    const nowPreviousNight = new Date("2026-11-02T22:26:00Z");
    const res = getCheckInStatus(sessionTomorrow, nowPreviousNight);
    expect(res.allowed).toBe(false);
    expect(res.isTooEarly).toBe(true);
  });

  it("Cho phép check-in đúng lúc T - 15 phút", () => {
    const now = new Date("2026-11-03T07:45:00Z");
    const res = getCheckInStatus(baseSession, now);
    expect(res.allowed).toBe(true);
  });

  it("Cho phép check-in trong suốt thời gian diễn ra ca mượn", () => {
    const now = new Date("2026-11-03T08:30:00Z");
    const res = getCheckInStatus(baseSession, now);
    expect(res.allowed).toBe(true);
  });

  it("Chặn check-in khi ca mượn đã kết thúc (sau endAt)", () => {
    const now = new Date("2026-11-03T10:05:00Z");
    const res = getCheckInStatus(baseSession, now);
    expect(res.allowed).toBe(false);
    expect(res.isExpired).toBe(true);
    expect(res.reason).toContain("kết thúc");
  });
});

