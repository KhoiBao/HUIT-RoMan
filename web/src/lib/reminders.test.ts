// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addReminder,
  getRemindersForSession,
  clearRemindersForSession,
  MAX_REMINDERS_BEFORE_VIOLATION,
} from "./reminders";
import * as violationsApi from "./violations";
import { api } from "./api";

vi.mock("./api", () => ({
  api: {
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock("./violations", () => ({
  fetchViolationTypes: vi.fn().mockResolvedValue([
    { id: 1, code: "VT02", name: "Gây ồn ào mất trật tự", severity: 2 },
  ]),
  recordViolation: vi.fn().mockResolvedValue({
    id: 99,
    code: "VP-20261102-001",
    description: "Tái phạm nội quy quá 3 lần",
    severity: 2,
    penaltyApplied: "Cấm mượn phòng 3 ngày",
  }),
}));

describe("Cơ chế nhắc nhở vi phạm (Rule of 3 Warnings)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const baseParams = {
    sessionId: 101,
    userId: 2001,
    userFullName: "Nguyễn Văn An",
    userCardCode: "200123456",
    roomId: 5,
    roomCode: "TV01",
    roomName: "Phòng học nhóm TV01",
    remindedByStaff: "Thủ thư 01",
  };

  it("Lần 1: Nhắc nhở cảnh báo ban đầu, chưa bị lập biên bản", async () => {
    const res = await addReminder({
      ...baseParams,
      reason: "Gây ồn ào, làm mất trật tự ảnh hưởng xung quanh",
    });

    expect(res.warningLevel).toBe(1);
    expect(res.isEscalated).toBe(false);
    expect(res.violationRecord).toBeUndefined();
    expect(api.post).toHaveBeenCalledWith(
      "/api/Notifications",
      expect.objectContaining({
        userId: 2001,
        title: expect.stringContaining("LẦN 1/3"),
      })
    );
    expect(violationsApi.recordViolation).not.toHaveBeenCalled();
  });

  it("Lần 2: Nhắc nhở mức 2/3, chưa bị lập biên bản", async () => {
    await addReminder({ ...baseParams, reason: "Gây ồn ào lần 1" });
    const res = await addReminder({
      ...baseParams,
      reason: "Mang đồ ăn vào phòng lần 2",
    });

    expect(res.warningLevel).toBe(2);
    expect(res.isEscalated).toBe(false);
    expect(res.violationRecord).toBeUndefined();
    expect(violationsApi.recordViolation).not.toHaveBeenCalled();
  });

  it("Lần 3: Nhắc nhở mức tối đa 3/3, cảnh báo nghiêm khắc", async () => {
    await addReminder({ ...baseParams, reason: "Lần 1" });
    await addReminder({ ...baseParams, reason: "Lần 2" });
    const res = await addReminder({
      ...baseParams,
      reason: "Lần 3 - Tiếp tục làm mất trật tự",
    });

    expect(res.warningLevel).toBe(MAX_REMINDERS_BEFORE_VIOLATION);
    expect(res.isEscalated).toBe(false);
    expect(res.violationRecord).toBeUndefined();
    expect(violationsApi.recordViolation).not.toHaveBeenCalled();
  });

  it("Quá 3 lần (Lần 4): TỰ ĐỘNG LẬP BIÊN BẢN VI PHẠM và ban hành lệnh cấm mượn", async () => {
    await addReminder({ ...baseParams, reason: "Lần 1" });
    await addReminder({ ...baseParams, reason: "Lần 2" });
    await addReminder({ ...baseParams, reason: "Lần 3" });

    // Lần 4 (Quá 3 lần)
    const res = await addReminder({
      ...baseParams,
      reason: "Lần 4 - Tái phạm dù đã cảnh báo 3 lần",
      note: "Cán bộ đã trực tiếp kiểm tra và ghi nhận",
    });

    expect(res.warningLevel).toBe(4);
    expect(res.isEscalated).toBe(true);
    expect(res.violationRecord).toBeDefined();
    expect(res.violationRecord?.code).toBe("VP-20261102-001");

    // Phải gọi recordViolation với mức độ 2 và cấm mượn 3 ngày
    expect(violationsApi.recordViolation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2001,
        usageSessionId: 101,
        severity: 2,
        restrictDays: 3,
        description: expect.stringContaining("TÁI PHẠM NỘI QUY - VƯỢT QUÁ 3 LẦN NHẮC NHỞ"),
      })
    );

    // Phải gửi thông báo kỷ luật chính thức cho sinh viên
    expect(api.post).toHaveBeenCalledWith(
      "/api/Notifications",
      expect.objectContaining({
        userId: 2001,
        title: expect.stringContaining("BIÊN BẢN VI PHẠM KỶ LUẬT"),
      })
    );

    // Kiểm tra danh sách lưu trữ
    const sessionReminders = getRemindersForSession(101);
    expect(sessionReminders).toHaveLength(4);
    expect(sessionReminders[0].escalatedToViolation).toBe(true);
    expect(sessionReminders[0].violationCode).toBe("VP-20261102-001");
  });

  it("Clear reminders: Xóa lịch sử khi phiên kết thúc hoặc reset", async () => {
    await addReminder({ ...baseParams, reason: "Lần 1" });
    expect(getRemindersForSession(101)).toHaveLength(1);

    clearRemindersForSession(101);
    expect(getRemindersForSession(101)).toHaveLength(0);
  });
});
