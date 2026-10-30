import { api } from "./api";

export interface WorkingHourDay {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Chủ Nhật",
  1: "Thứ Hai",
  2: "Thứ Ba",
  3: "Thứ Tư",
  4: "Thứ Năm",
  5: "Thứ Sáu",
  6: "Thứ Bảy",
};

/** Thứ Hai → Chủ Nhật. */
export const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export async function fetchLibraryWorkingHours(): Promise<WorkingHourDay[]> {
  const res = await api.get("/api/WorkingHours/library");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as WorkingHourDay[]) : [];
}

export async function updateLibraryWorkingHours(
  days: WorkingHourDay[]
): Promise<void> {
  await api.put("/api/WorkingHours/library", { days });
}

export function formatDayHours(day: WorkingHourDay): string {
  return day.isClosed ? "Nghỉ" : `${day.openTime} – ${day.closeTime}`;
}
