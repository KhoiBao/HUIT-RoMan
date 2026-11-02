import { api } from "./api";

export interface AssignedEmployee {
  id: number;
  code: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  position: string;
  departmentName?: string;
}

export interface ShiftItem {
  id: number;
  date: string;
  dateString: string;
  name: string;
  startTime: string; // "07:00:00"
  endTime: string;   // "11:30:00"
  timeRange: string; // "07:00 - 11:30"
  status: string;    // "Lên lịch" | "Đang trực" | "Hoàn thành" | "Hủy"
  employees: AssignedEmployee[];
  shiftLogsCount?: number;
  createdAt: string;
}

export interface ShiftLogItem {
  id: number;
  logTime: string;
  content: string;
  type: number; // 1: Bàn giao ca trực, 2: Sự cố phát sinh, 3: Kiểm tra an ninh & vệ sinh
  typeText: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  employeePosition?: string;
}

export interface ShiftStats {
  totalShifts: number;
  scheduledShifts: number;
  inProgressShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  totalAssignedEmployees: number;
  totalLogs: number;
}

export interface CreateShiftPayload {
  date: string;
  name: string;
  startTime: string;
  endTime: string;
  status?: string;
  employeeIds: number[];
}

export interface UpdateShiftPayload {
  date: string;
  name: string;
  startTime: string;
  endTime: string;
  status: string;
  employeeIds: number[];
}

export interface CreateShiftLogPayload {
  content: string;
  type: number;
  employeeId?: number;
}

export async function fetchShifts(params?: {
  fromDate?: string;
  toDate?: string;
  status?: string;
  employeeId?: number;
  departmentId?: number;
  search?: string;
}): Promise<ShiftItem[]> {
  const res = await api.get("/api/Shifts", { params });
  return res.data?.data || res.data || [];
}

export async function fetchShiftById(id: number): Promise<ShiftItem> {
  const res = await api.get(`/api/Shifts/${id}`);
  return res.data?.data || res.data;
}

export async function createShift(payload: CreateShiftPayload): Promise<ShiftItem> {
  const res = await api.post("/api/Shifts", payload);
  return res.data?.data || res.data;
}

export async function updateShift(id: number, payload: UpdateShiftPayload): Promise<ShiftItem> {
  const res = await api.put(`/api/Shifts/${id}`, payload);
  return res.data?.data || res.data;
}

export async function deleteShift(id: number): Promise<boolean> {
  const res = await api.delete(`/api/Shifts/${id}`);
  return res.data?.success ?? true;
}

export async function updateShiftStatus(id: number, status: string): Promise<ShiftItem> {
  const res = await api.patch(`/api/Shifts/${id}/status`, { status });
  return res.data?.data || res.data;
}

export async function assignShiftEmployees(id: number, employeeIds: number[]): Promise<ShiftItem> {
  const res = await api.post(`/api/Shifts/${id}/assign`, { employeeIds });
  return res.data?.data || res.data;
}

export async function fetchShiftLogs(params?: {
  employeeId?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<ShiftLogItem[]> {
  const res = await api.get("/api/Shifts/logs", { params });
  return res.data?.data || res.data || [];
}

export async function createShiftLog(payload: CreateShiftLogPayload): Promise<ShiftLogItem> {
  const res = await api.post("/api/Shifts/logs", payload);
  return res.data?.data || res.data;
}

export async function fetchMyShifts(params?: {
  fromDate?: string;
  toDate?: string;
}): Promise<ShiftItem[]> {
  const res = await api.get("/api/Shifts/my-shifts", { params });
  return res.data?.data || res.data || [];
}

export async function fetchShiftStats(): Promise<ShiftStats> {
  const res = await api.get("/api/Shifts/stats");
  return (
    res.data?.data || {
      totalShifts: 0,
      scheduledShifts: 0,
      inProgressShifts: 0,
      completedShifts: 0,
      cancelledShifts: 0,
      totalAssignedEmployees: 0,
      totalLogs: 0,
    }
  );
}

// ─────────────────────────────────────────────────────────────────
// Shift Date Validation Helpers (BR: Chỉ phân ca trực sau ngày hiện tại)
// ─────────────────────────────────────────────────────────────────

/**
 * Lấy chuỗi YYYY-MM-DD theo giờ địa phương (local time)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Lấy ngày hôm nay dạng YYYY-MM-DD theo giờ địa phương
 */
export function getTodayDateString(now: Date = new Date()): string {
  return getLocalDateString(now);
}

/**
 * Lấy ngày mai dạng YYYY-MM-DD theo giờ địa phương (ngày bắt đầu được phép phân ca trực)
 */
export function getTomorrowDateString(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDateString(tomorrow);
}

/**
 * Kiểm tra ngày phân ca trực có hợp lệ không:
 * Nghiệp vụ HUIT yêu cầu chỉ được phân ca trực cho các ngày sau ngày hiện tại (strictly > today).
 */
export function isShiftDateValid(dateStr: string, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  const dayKey = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return false;
  const todayStr = getTodayDateString(now);
  return dayKey > todayStr;
}

/**
 * Lấy ngày Thứ Hai của tuần chứa date (theo giờ địa phương 00:00:00)
 */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + distanceToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Lấy danh sách 7 ngày từ Thứ Hai đến Chủ Nhật của tuần bắt đầu từ monday
 */
export function get7DaysOfWeek(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

/**
 * Trích xuất chuỗi YYYY-MM-DD an toàn từ Date, ISO string hoặc dateString
 */
export function normalizeShiftDateString(val?: string | Date | null): string {
  if (!val) return "";
  if (typeof val === "string") {
    if (val.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.slice(0, 10);
    }
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) {
      return getLocalDateString(parsed);
    }
    return "";
  }
  return getLocalDateString(val);
}

/**
 * Kiểm tra 2 khoảng thời gian có bị trùng lặp (giao nhau) không.
 * Điều kiện trùng: startA < endB && endA > startB
 */
export function isTimeRangeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  const normAStart = startA.slice(0, 5);
  const normAEnd = endA.slice(0, 5);
  const normBStart = startB.slice(0, 5);
  const normBEnd = endB.slice(0, 5);
  return normAStart < normBEnd && normAEnd > normBStart;
}

/**
 * Tìm ca trực bị trùng khung giờ trên cùng một ngày (nếu có).
 * Bỏ qua các ca đã Hủy ("Hủy") và ca đang chỉnh sửa (excludeShiftId).
 */
export function findOverlappingShift(
  targetDate: string,
  targetStartTime: string,
  targetEndTime: string,
  shifts: ShiftItem[],
  excludeShiftId?: number
): ShiftItem | undefined {
  if (!targetDate || !targetStartTime || !targetEndTime || !Array.isArray(shifts)) return undefined;
  const targetDay = targetDate.slice(0, 10);
  return shifts.find((s) => {
    if (excludeShiftId && s.id === excludeShiftId) return false;
    if (s.status === "Hủy") return false;
    const shiftDay = (s.dateString || s.date || "").slice(0, 10);
    if (shiftDay !== targetDay) return false;
    return isTimeRangeOverlapping(targetStartTime, targetEndTime, s.startTime, s.endTime);
  });
}
