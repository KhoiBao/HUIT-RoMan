import { describe, expect, test } from "vitest";
import { processSteps, roomRules } from "./homeContent";

describe("homeContent", () => {
  test("has 4 process steps in order", () => {
    expect(processSteps.map((step) => step.no)).toEqual([
      "01",
      "02",
      "03",
      "04",
    ]);
  });

  test("check-in step is highlighted red", () => {
    expect(processSteps[2].tone).toBe("red");
  });

  test("room rules are non-empty", () => {
    expect(roomRules.length).toBeGreaterThan(0);
    expect(roomRules.every((rule) => rule.trim().length > 0)).toBe(true);
  });
});
