import { describe, expect, test } from "vitest";
import { processSteps, roomTypeCards } from "./homeContent";

describe("homeContent", () => {
  test("has 2 ready room types and 2 coming soon", () => {
    expect(roomTypeCards.filter((c) => c.status === "ready")).toHaveLength(2);
    expect(roomTypeCards.filter((c) => c.status === "soon")).toHaveLength(2);
  });

  test("has 4 process steps in order", () => {
    expect(processSteps.map((s) => s.no)).toEqual(["01", "02", "03", "04"]);
  });

  test("check-in step is highlighted red", () => {
    expect(processSteps[2].tone).toBe("red");
  });
});
