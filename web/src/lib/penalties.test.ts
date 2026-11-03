// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllPenalties,
  createPenalty,
  updatePenalty,
  deletePenalty,
  resetToDefaultPenalties,
  DEFAULT_PENALTIES,
} from "./penalties";

describe("penalties.ts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default penalties when localStorage is empty", () => {
    const list = getAllPenalties();
    expect(list.length).toBe(DEFAULT_PENALTIES.length);
    expect(list[0].code).toBe("HP01");
  });

  it("creates a new penalty and prepends it to the list", () => {
    const newPen = createPenalty({
      code: "HP99",
      name: "Tạm giữ thẻ sinh viên 3 ngày",
      severity: 2,
      defaultRestrictDays: 3,
      description: "Tạm giữ thẻ tại quầy trực ban",
    });

    expect(newPen.code).toBe("HP99");
    expect(newPen.name).toBe("Tạm giữ thẻ sinh viên 3 ngày");
    expect(newPen.category).toBe("Mức 2 - Vừa");

    const all = getAllPenalties();
    expect(all[0].code).toBe("HP99");
  });

  it("updates an existing penalty", () => {
    const updated = updatePenalty("HP01", {
      name: "Nhắc nhở nhẹ lần 1",
      defaultRestrictDays: 1,
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Nhắc nhở nhẹ lần 1");
    expect(updated?.defaultRestrictDays).toBe(1);

    const all = getAllPenalties();
    const found = all.find((p) => p.code === "HP01");
    expect(found?.name).toBe("Nhắc nhở nhẹ lần 1");
  });

  it("deletes a penalty", () => {
    const res = deletePenalty("HP02");
    expect(res).toBe(true);

    const all = getAllPenalties();
    expect(all.some((p) => p.code === "HP02")).toBe(false);
  });

  it("resets to default penalties", () => {
    createPenalty({
      code: "HP999",
      name: "Test custom",
      severity: 1,
      defaultRestrictDays: 0,
    });
    const reset = resetToDefaultPenalties();
    expect(reset.length).toBe(DEFAULT_PENALTIES.length);
    expect(reset.some((p) => p.code === "HP999")).toBe(false);
  });
});
