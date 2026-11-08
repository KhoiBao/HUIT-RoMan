import { describe, expect, test } from "vitest";
import { vacancyHighlights, type VacancyReport } from "./reports";

const report = (slots: Array<[number, string, number]>): VacancyReport => ({
  fromDate: "2026-11-05",
  toDate: "2026-11-06",
  totalRooms: 2,
  daysCounted: 2,
  hourSlots: slots.map(([hour, label, rate]) => ({
    hour,
    label,
    avgBookedRooms: 0,
    avgVacancyRooms: 0,
    vacancyRate: rate,
  })),
});

describe("vacancyHighlights", () => {
  test("finds busiest and quietest hour slots", () => {
    const highlights = vacancyHighlights(
      report([
        [7, "07:00 – 08:00", 100],
        [9, "09:00 – 10:00", 25],
        [13, "13:00 – 14:00", 60],
        [20, "20:00 – 21:00", 100],
      ])
    );
    expect(highlights.busiest).toEqual({ hour: 9, label: "09:00 – 10:00", vacancyRate: 25 });
    expect(highlights.quietest).toEqual({ hour: 7, label: "07:00 – 08:00", vacancyRate: 100 });
  });

  test("returns nulls when there are no slots", () => {
    expect(vacancyHighlights(report([]))).toEqual({ busiest: null, quietest: null });
  });
});
