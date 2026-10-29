import { api } from "./api";
import { toISODateString, type Period } from "./schedule";

export interface AvailableRoom {
  roomId: number;
  roomName: string;
  roomCode: string;
  building?: string;
  floor?: string;
  capacity: number;
  roomTypeId: number;
  roomTypeName: string;
  isBookingByPeriod: boolean;
}

export interface BookingDetailPayload {
  roomId: number;
  startAt: string;
  endAt: string;
  startPeriodId?: number;
  endPeriodId?: number;
  guestCount: number;
  purpose?: string;
}

export interface CreateBookingPayload {
  activityName: string;
  purpose: string;
  guestCount: number;
  note?: string;
  details: BookingDetailPayload[];
}

export interface BookingDetailItem {
  id: number;
  roomId: number;
  roomName?: string;
  roomCode?: string;
  startAt: string;
  endAt: string;
  startPeriodId?: number | null;
  startPeriodName?: string | null;
  endPeriodId?: number | null;
  endPeriodName?: string | null;
  guestCount: number;
  purpose?: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface CheckInWindow {
  /** Thời điểm bắt đầu đặt phòng T (UTC ISO) */
  startAt: string;
  /** T - 15 phút (UTC ISO) */
  opensAt: string;
  /** Hạn cuối nhận phòng = T (UTC ISO) */
  deadlineAt: string;
  /** NotOpen | Open | Expired */
  state: "NotOpen" | "Open" | "Expired";
  /** Thời điểm server tính trạng thái (UTC ISO) — dùng đồng bộ đếm ngược */
  serverTime: string;
}

export interface BookingResponse {
  id: number;
  activityName: string;
  purpose: string;
  guestCount: number;
  status: string;
  rejectionReason?: string;
  note?: string;
  requestedAt: string;
  createdAt: string;
  userId: number;
  userName?: string;
  userFullName?: string;
  /** Thời điểm check-in (UTC ISO). NULL = chưa nhận phòng */
  checkedInAt?: string | null;
  /** Mã lý do hủy: CHANGE_PLAN | NO_LONGER_NEEDED | OTHER | NO_SHOW. NULL = đơn cũ chưa có dữ liệu */
  cancelReason?: string | null;
  /** Nội dung chi tiết khi lý do hủy là OTHER */
  cancelReasonDetail?: string | null;
  /** Nguồn hủy: STUDENT | AUTO | STAFF. NULL = không ghi nhận */
  cancelSource?: string | null;
  /** Cửa sổ nhận phòng theo thời gian server (chỉ đơn đã duyệt, chưa check-in) */
  checkInWindow?: CheckInWindow | null;
  details: BookingDetailItem[];
}

export interface BookingFormState {
  activityName: string;
  purpose: string;
  guestCount: number;
  note: string;
  date: string; // YYYY-MM-DD
  bookingMode: "period" | "time"; // theo tiết hay theo giờ
  startPeriodId?: number;
  endPeriodId?: number;
  startTime?: string; // "08:00"
  endTime?: string;   // "10:30"
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface BookingValidationOptions {
  role?: string | null;
  now?: Date;
}

export interface AvailableRoomGroup {
  roomTypeId: number;
  roomTypeName: string;
  rooms: AvailableRoom[];
}

export interface RoomFloorGroup {
  floor: string;
  rooms: AvailableRoom[];
}

export interface RoomBuildingGroup {
  building: string;
  rooms: AvailableRoom[];
  floors: RoomFloorGroup[];
}

/** Nhóm phòng theo khu vực khi đặt theo khung giờ. */
export type AvailableRoomScope = "hall" | "library" | "all";

/** Khung giờ mượn phòng dành cho sinh viên tại Thư viện HUIT. */
export const STUDENT_OPEN_TIME = "07:00";
export const STUDENT_CLOSE_TIME = "20:00";
export const STUDENT_MAX_DURATION_MINUTES = 120;

const STUDENT_OPEN_MINUTES = 7 * 60;
const STUDENT_CLOSE_MINUTES = 20 * 60;

function normalizeText(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function isStudentRole(role?: string | null): boolean {
  const value = normalizeText(role);
  return value === "student" || value === "sinh viên" || value === "sinh vien";
}

export function isLecturerRole(role?: string | null): boolean {
  const value = normalizeText(role);
  return value === "lecturer" || value === "giảng viên" || value === "giang vien";
}

export interface PeriodGroup {
  roomTypeId: number;
  roomTypeName: string;
  periods: Period[];
}

/**
 * Gom tiết học theo loại phòng (lý thuyết / thực hành). Mỗi loại phòng có
 * bộ 16 tiết riêng nên không được trộn khi chọn tiết.
 */
export function groupPeriodsByRoomType(periods: Period[]): PeriodGroup[] {
  const groups = new Map<number, PeriodGroup>();
  for (const period of periods) {
    if (!period.roomTypeId) continue;
    const existing = groups.get(period.roomTypeId);
    if (existing) {
      existing.periods.push(period);
    } else {
      groups.set(period.roomTypeId, {
        roomTypeId: period.roomTypeId,
        roomTypeName: period.roomTypeName || "Lịch tiết",
        periods: [period],
      });
    }
  }
  return Array.from(groups.values()).map((group) => ({
    ...group,
    periods: [...group.periods].sort(
      (a, b) => a.startTime.localeCompare(b.startTime)
    ),
  }));
}

/**
 * Sinh viên chỉ được đặt phòng học nhóm và phòng thuyết trình của Thư viện.
 * Các loại phòng khác (hội thảo, hội trường, phòng học...) do đơn vị quản lý.
 */
export function isStudentBookableRoomType(
  roomTypeName?: string | null
): boolean {
  const value = normalizeText(roomTypeName);
  return value.includes("nhóm") || value.includes("nhom") ||
    value.includes("thuyết trình") || value.includes("thuyet trinh");
}

/** Phòng hội thảo / hội trường — nhóm phòng đặt theo khung giờ. */
export function isHallRoomType(roomTypeName?: string | null): boolean {
  const value = normalizeText(roomTypeName);
  return value.includes("hội thảo") || value.includes("hoi thao") ||
    value.includes("hội trường") || value.includes("hoi truong");
}

/** Lọc danh sách phòng theo khu vực đặt (hội trường / thư viện / tất cả). */
export function filterAvailableRoomsByScope(
  rooms: AvailableRoom[],
  scope: AvailableRoomScope
): AvailableRoom[] {
  if (scope === "all") return rooms;
  if (scope === "hall") {
    return rooms.filter((room) => isHallRoomType(room.roomTypeName));
  }
  return rooms.filter((room) => isStudentBookableRoomType(room.roomTypeName));
}

function parseFloorNumber(floor: string): number | null {
  const value = Number.parseInt(floor, 10);
  return Number.isNaN(value) ? null : value;
}

function compareFloors(a: string, b: string): number {
  const numA = parseFloorNumber(a);
  const numB = parseFloorNumber(b);
  if (numA !== null && numB !== null) return numA - numB;
  if (numA !== null) return -1;
  if (numB !== null) return 1;
  return a.localeCompare(b, "vi");
}

/**
 * Gom phòng theo tòa → tầng để hiển thị dạng tab gọn (Tòa A/B, Tầng 2–5).
 * Sắp xếp tòa theo tên và tầng theo số để thứ tự ổn định.
 */
export function groupAvailableRoomsByBuilding(
  rooms: AvailableRoom[]
): RoomBuildingGroup[] {
  const buildings = new Map<string, Map<string, AvailableRoom[]>>();

  for (const room of rooms) {
    const building = (room.building || "Khác").trim() || "Khác";
    const floor = (room.floor || "—").trim() || "—";
    let floors = buildings.get(building);
    if (!floors) {
      floors = new Map<string, AvailableRoom[]>();
      buildings.set(building, floors);
    }
    const floorRooms = floors.get(floor);
    if (floorRooms) {
      floorRooms.push(room);
    } else {
      floors.set(floor, [room]);
    }
  }

  return Array.from(buildings.entries())
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([building, floors]) => {
      const floorGroups = Array.from(floors.entries())
        .sort(([a], [b]) => compareFloors(a, b))
        .map(([floor, floorRooms]) => ({
          floor,
          rooms: [...floorRooms].sort((a, b) =>
            a.roomCode.localeCompare(b.roomCode, "vi")
          ),
        }));
      const allRooms = floorGroups.flatMap((floor) => floor.rooms);
      return { building, rooms: allRooms, floors: floorGroups };
    });
}

function formatFloorSummary(floors: number[]): string | null {
  if (floors.length === 0) return null;
  if (floors.length === 1) return `Tầng ${floors[0]}`;
  const contiguous = floors.every(
    (floor, index) => index === 0 || floor === floors[index - 1] + 1
  );
  return contiguous
    ? `Tầng ${floors[0]}–${floors[floors.length - 1]}`
    : `Tầng ${floors.join(", ")}`;
}

/** Tóm tắt vị trí các phòng, ví dụ "Tòa A, B • Tầng 2–5" hoặc "Thư viện • Tầng 3". */
export function summarizeRoomLocations(rooms: AvailableRoom[]): string {
  if (rooms.length === 0) return "Thư viện HUIT";

  const buildingLabels: string[] = [];
  const floors = new Set<number>();
  const unknownFloors = new Set<string>();

  for (const room of rooms) {
    const rawBuilding = (room.building || "").trim();
    const buildingLabel =
      rawBuilding.toLowerCase() === "thư viện"
        ? "Thư viện"
        : `Tòa ${rawBuilding || "—"}`;
    if (!buildingLabels.includes(buildingLabel)) {
      buildingLabels.push(buildingLabel);
    }
    const rawFloor = (room.floor || "").trim();
    if (!rawFloor) continue;
    const floorNumber = parseFloorNumber(rawFloor);
    if (floorNumber === null) {
      unknownFloors.add(rawFloor);
    } else {
      floors.add(floorNumber);
    }
  }

  const sortedFloors = Array.from(floors).sort((a, b) => a - b);
  const floorLabel = formatFloorSummary(sortedFloors);
  const sortedBuildingLabels = [...buildingLabels].sort((a, b) =>
    a.localeCompare(b, "vi")
  );
  const allAreTowers = sortedBuildingLabels.every((label) =>
    label.startsWith("Tòa ")
  );
  const buildingLabel = allAreTowers
    ? `Tòa ${sortedBuildingLabels.map((label) => label.slice(4)).join(", ")}`
    : sortedBuildingLabels.join(", ");

  if (!floorLabel) {
    return unknownFloors.size > 0
      ? `${buildingLabel} • Tầng ${Array.from(unknownFloors).join(", ")}`
      : buildingLabel;
  }

  return `${buildingLabel} • ${floorLabel}`;
}

function parseClockMinutes(value?: string): number | null {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return parts[0] * 60 + parts[1];
}

function formatClock(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseLocalDate(value: string): Date | null {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Kiểm tra khung giờ đặt phòng của sinh viên:
 * 07:00–20:00, không Chủ Nhật, tối đa 2 giờ và không ở quá khứ.
 */
export function validateStudentBookingWindow(
  form: BookingFormState,
  now: Date = new Date()
): ValidationResult {
  const errors: Record<string, string> = {};

  if (form.bookingMode !== "time") {
    errors.bookingMode = "Sinh viên chỉ có thể đặt phòng theo khung giờ.";
  }

  const date = form.date ? parseLocalDate(form.date) : null;
  if (!form.date) {
    errors.date = "Vui lòng chọn ngày sử dụng phòng.";
  } else if (!date) {
    errors.date = "Ngày sử dụng phòng không hợp lệ.";
  } else {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (date < today) {
      errors.date = "Không thể đặt phòng cho ngày trong quá khứ.";
    } else if (date.getDay() === 0) {
      errors.date = "Thư viện không phục vụ mượn phòng vào Chủ Nhật.";
    }
  }

  const start = parseClockMinutes(form.startTime);
  const end = parseClockMinutes(form.endTime);

  if (!form.startTime) {
    errors.startTime = "Vui lòng chọn giờ bắt đầu.";
  } else if (start === null) {
    errors.startTime = "Giờ bắt đầu không hợp lệ.";
  } else if (start < STUDENT_OPEN_MINUTES) {
    errors.startTime = "Sinh viên chỉ có thể đặt phòng từ 07:00.";
  }

  if (!form.endTime) {
    errors.endTime = "Vui lòng chọn giờ kết thúc.";
  } else if (end === null) {
    errors.endTime = "Giờ kết thúc không hợp lệ.";
  } else if (end > STUDENT_CLOSE_MINUTES) {
    errors.endTime = "Sinh viên phải trả phòng trước 20:00.";
  }

  if (start !== null && end !== null) {
    if (end <= start) {
      errors.endTime = "Giờ kết thúc phải sau giờ bắt đầu.";
    } else if (end - start > STUDENT_MAX_DURATION_MINUTES) {
      errors.endTime = "Sinh viên chỉ được đặt tối đa 2 giờ mỗi lượt.";
    }
  }

  if (date && start !== null && isSameLocalDate(date, now)) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (start <= nowMinutes) {
      errors.startTime = "Không thể đặt thời gian đã qua trong ngày.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Gợi ý lượt đặt gần nhất còn hợp lệ cho sinh viên.
 * Bỏ qua Chủ Nhật, thời gian đã qua và các lượt kết thúc sau 20:00.
 */
export function getNextStudentBookingSlot(
  now: Date = new Date()
): { date: string; startTime: string; endTime: string } {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startMinutes = STUDENT_OPEN_MINUTES;

  if (day.getDay() !== 0) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes >= STUDENT_OPEN_MINUTES) {
      const candidate = Math.ceil((nowMinutes + 15) / 15) * 15;
      if (candidate + 60 <= STUDENT_CLOSE_MINUTES) {
        startMinutes = candidate;
      } else {
        day.setDate(day.getDate() + 1);
      }
    }
  } else {
    day.setDate(day.getDate() + 1);
  }

  while (day.getDay() === 0) {
    day.setDate(day.getDate() + 1);
  }

  return {
    date: toISODateString(day),
    startTime: formatClock(startMinutes),
    endTime: formatClock(startMinutes + 60),
  };
}

/**
 * Gom danh sách phòng trống theo loại phòng để hiển thị dạng accordion gọn.
 * Giữ nguyên thứ tự loại phòng mà API trả về (đã sắp theo tòa/tầng/mã phòng).
 */
export function groupAvailableRoomsByType(
  rooms: AvailableRoom[]
): AvailableRoomGroup[] {
  const groups = new Map<number, AvailableRoomGroup>();

  for (const room of rooms) {
    const existing = groups.get(room.roomTypeId);
    if (existing) {
      existing.rooms.push(room);
    } else {
      groups.set(room.roomTypeId, {
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        rooms: [room],
      });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => a.roomTypeName.localeCompare(b.roomTypeName, "vi"))
    .map((group) => ({
      ...group,
      rooms: [...group.rooms].sort((a, b) =>
        a.roomCode.localeCompare(b.roomCode, "vi")
      ),
    }));
}

/**
 * Validate form nhập liệu đặt phòng
 */
export function validateBookingForm(
  form: BookingFormState,
  selectedRoomIds: number[],
  options: BookingValidationOptions = {}
): ValidationResult {
  const errors: Record<string, string> = {};
  const student = isStudentRole(options.role);
  const now = options.now ?? new Date();

  if (!form.activityName || form.activityName.trim().length < 3) {
    errors.activityName = "Tên hoạt động phải từ 3 ký tự trở lên.";
  }

  if (!form.purpose || form.purpose.trim().length < 3) {
    errors.purpose = "Vui lòng nhập mục đích sử dụng phòng.";
  }

  if (!form.guestCount || form.guestCount < 1) {
    errors.guestCount = "Số lượng người tham gia phải lớn hơn 0.";
  }

  if (student) {
    const windowResult = validateStudentBookingWindow(form, now);
    Object.assign(errors, windowResult.errors);
  } else if (!form.date) {
    errors.date = "Vui lòng chọn ngày sử dụng phòng.";
  } else {
    const selectedDate = parseLocalDate(form.date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!selectedDate) {
      errors.date = "Ngày sử dụng phòng không hợp lệ.";
    } else if (selectedDate < today) {
      errors.date = "Không thể đặt phòng cho ngày trong quá khứ.";
    }
  }

  if (form.bookingMode === "period" && !student) {
    if (!form.startPeriodId) {
      errors.startPeriodId = "Vui lòng chọn tiết bắt đầu.";
    }
    if (!form.endPeriodId) {
      errors.endPeriodId = "Vui lòng chọn tiết kết thúc.";
    }
    if (
      form.startPeriodId &&
      form.endPeriodId &&
      form.startPeriodId > form.endPeriodId
    ) {
      errors.endPeriodId = "Tiết kết thúc phải bằng hoặc sau tiết bắt đầu.";
    }
  } else if (form.bookingMode === "time") {
    if (!form.startTime) {
      errors.startTime = "Vui lòng chọn giờ bắt đầu.";
    }
    if (!form.endTime) {
      errors.endTime = "Vui lòng chọn giờ kết thúc.";
    }
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      errors.endTime = "Giờ kết thúc phải sau giờ bắt đầu.";
    }
  }

  if (!selectedRoomIds || selectedRoomIds.length === 0) {
    errors.rooms = "Vui lòng chọn ít nhất một phòng cần đặt.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Xây dựng payload CreateBooking gửi lên API
 */
export function buildBookingPayload(
  form: BookingFormState,
  selectedRooms: AvailableRoom[],
  periods: Period[]
): CreateBookingPayload {
  const details: BookingDetailPayload[] = selectedRooms.map((room) => {
    let startIso: string;
    let endIso: string;

    if (room.isBookingByPeriod && form.startPeriodId && form.endPeriodId) {
      const sp = periods.find((p) => p.id === form.startPeriodId);
      const ep = periods.find((p) => p.id === form.endPeriodId);

      const spTime = sp?.startTime || "07:00:00";
      const epTime = ep?.endTime || "08:00:00";

      // Build local date time in Vietnam UTC+7
      const startLocal = new Date(`${form.date}T${spTime}`);
      const endLocal = new Date(`${form.date}T${epTime}`);

      startIso = startLocal.toISOString();
      endIso = endLocal.toISOString();

      return {
        roomId: room.roomId,
        startAt: startIso,
        endAt: endIso,
        startPeriodId: form.startPeriodId,
        endPeriodId: form.endPeriodId,
        guestCount: form.guestCount,
        purpose: form.purpose,
      };
    } else {
      const startTime = form.startTime?.includes(":")
        ? form.startTime.length === 5
          ? `${form.startTime}:00`
          : form.startTime
        : "08:00:00";
      const endTime = form.endTime?.includes(":")
        ? form.endTime.length === 5
          ? `${form.endTime}:00`
          : form.endTime
        : "10:00:00";

      const startLocal = new Date(`${form.date}T${startTime}`);
      const endLocal = new Date(`${form.date}T${endTime}`);

      startIso = startLocal.toISOString();
      endIso = endLocal.toISOString();

      return {
        roomId: room.roomId,
        startAt: startIso,
        endAt: endIso,
        guestCount: form.guestCount,
        purpose: form.purpose,
      };
    }
  });

  return {
    activityName: form.activityName.trim(),
    purpose: form.purpose.trim(),
    guestCount: Number(form.guestCount),
    note: form.note?.trim() || "",
    details,
  };
}

/**
 * Kiểm tra xem đơn đặt phòng có thể hủy được hay không
 */
export function canCancelBooking(status: string): boolean {
  const s = (status || "").trim().toLowerCase();
  return s !== "đã hủy" && s !== "từ chối" && s !== "cancelled" && s !== "rejected";
}

// ── QUY ĐỊNH NHẬN PHÒNG & HỦY ĐẶT PHÒNG (mirror backend BookingCheckInPolicy / BookingCancelPolicy) ──

/** Nhận phòng mở trước 15 phút so với giờ bắt đầu T */
export const CHECK_IN_WINDOW_MINUTES = 15;
/** Hủy trực tuyến muộn nhất 3 giờ trước giờ bắt đầu T (đúng hạn vẫn được hủy) */
export const CANCEL_LEAD_HOURS = 3;

export type CancelReasonCode = "CHANGE_PLAN" | "NO_LONGER_NEEDED" | "OTHER";

export interface CancelReasonOption {
  code: CancelReasonCode;
  label: string;
  needsDetail: boolean;
}

export const CANCEL_REASON_OPTIONS: CancelReasonOption[] = [
  { code: "CHANGE_PLAN", label: "Thay đổi kế hoạch", needsDetail: false },
  { code: "NO_LONGER_NEEDED", label: "Không còn nhu cầu sử dụng", needsDetail: false },
  { code: "OTHER", label: "Lý do khác", needsDetail: true },
];

export const CANCEL_REASON_NO_SHOW = "NO_SHOW";

export function getCancelReasonLabel(code?: string | null): string {
  const value = (code || "").trim().toUpperCase();
  if (value === CANCEL_REASON_NO_SHOW) return "Không nhận phòng đúng hạn (tự động hủy)";
  const option = CANCEL_REASON_OPTIONS.find((o) => o.code === value);
  return option ? option.label : (code || "");
}

export type CheckInWindowState = "not_open" | "open" | "expired";

export interface CheckInWindowStateInfo {
  state: CheckInWindowState;
  /** Số giây còn lại đến mốc kế tiếp (mở nhận phòng hoặc hết hạn) */
  remainingSeconds: number;
  /** Thông báo hiển thị theo quy định, ví dụ "Có thể nhận phòng sau 05:20" */
  message: string;
}

function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * Trạng thái cửa sổ nhận phòng tại thời điểm `now`:
 * - trước T - 15 phút → not_open ("Có thể nhận phòng sau MM:SS")
 * - [T - 15 phút, T)  → open ("Vui lòng nhận phòng trong MM:SS")
 * - từ T              → expired ("Đã quá hạn nhận phòng")
 */
export function evaluateCheckInWindow(
  startAtIso: string,
  now: Date = new Date()
): CheckInWindowStateInfo {
  const startAt = new Date(startAtIso).getTime();
  const opensAt = startAt - CHECK_IN_WINDOW_MINUTES * 60 * 1000;
  const nowMs = now.getTime();

  if (nowMs < opensAt) {
    const remaining = Math.ceil((opensAt - nowMs) / 1000);
    return {
      state: "not_open",
      remainingSeconds: remaining,
      message: `Có thể nhận phòng sau ${formatCountdown(remaining)}`,
    };
  }

  if (nowMs < startAt) {
    const remaining = Math.ceil((startAt - nowMs) / 1000);
    return {
      state: "open",
      remainingSeconds: remaining,
      message: `Vui lòng nhận phòng trong ${formatCountdown(remaining)}`,
    };
  }

  return {
    state: "expired",
    remainingSeconds: 0,
    message: "Đã quá hạn nhận phòng",
  };
}

/** Thời điểm bắt đầu đặt phòng T = StartAt sớm nhất của các chi tiết còn hiệu lực */
export function getBookingStartAt(booking: BookingResponse): Date | null {
  const active = (booking.details || [])
    .filter((d) => d.status !== "Từ chối" && d.status !== "Đã hủy")
    .map((d) => new Date(d.startAt).getTime())
    .filter((t) => Number.isFinite(t));

  if (active.length > 0) {
    return new Date(Math.min(...active));
  }

  const all = (booking.details || [])
    .map((d) => new Date(d.startAt).getTime())
    .filter((t) => Number.isFinite(t));
  if (all.length > 0) {
    return new Date(Math.min(...all));
  }

  const requested = new Date(booking.requestedAt).getTime();
  return Number.isFinite(requested) ? new Date(requested) : null;
}

/** Đơn đã được duyệt (kể cả duyệt một phần) — điều kiện cần cho nhận phòng và hủy trực tuyến */
export function isApprovedBookingStatus(status?: string | null): boolean {
  const s = (status || "").trim();
  return s === "Đã duyệt" || s === "Duyệt một phần";
}

/**
 * Điều kiện hủy trực tuyến phía client (backend tự kiểm tra lại toàn bộ):
 * đã duyệt, chưa bị hủy, chưa nhận phòng và now <= T - 3 giờ.
 */
export function canCancelBookingOnline(
  booking: BookingResponse,
  now: Date = new Date()
): { allowed: boolean; message?: string } {
  if (booking.checkedInAt) {
    return { allowed: false, message: "Đơn đã được nhận phòng, không thể hủy trực tuyến." };
  }
  if (!isApprovedBookingStatus(booking.status)) {
    return {
      allowed: false,
      message: "Chỉ đơn đã được duyệt mới có thể hủy trực tuyến.",
    };
  }
  if (booking.status === "Đã hủy") {
    return { allowed: false, message: "Đơn đã bị hủy trước đó." };
  }

  const startAt = getBookingStartAt(booking);
  if (!startAt) {
    return { allowed: false, message: "Không xác định được giờ bắt đầu của đơn." };
  }

  const deadline = startAt.getTime() - CANCEL_LEAD_HOURS * 60 * 60 * 1000;
  if (now.getTime() > deadline) {
    return {
      allowed: false,
      message: `Đã quá hạn hủy trực tuyến (hạn cuối ${new Date(deadline).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}). Vui lòng liên hệ quản lý thư viện.`,
    };
  }

  return { allowed: true };
}

/** Validate lựa chọn lý do hủy (bắt buộc chọn, OTHER phải có nội dung cụ thể) */
export function validateCancelReasonSelection(
  reasonCode: string,
  reasonDetail: string
): { isValid: boolean; error?: string } {
  const code = (reasonCode || "").trim().toUpperCase();
  const option = CANCEL_REASON_OPTIONS.find((o) => o.code === code);

  if (!option) {
    return { isValid: false, error: "Vui lòng chọn lý do hủy đặt phòng." };
  }

  if (option.needsDetail && !(reasonDetail || "").trim()) {
    return {
      isValid: false,
      error: "Vui lòng nhập nội dung giải thích cụ thể khi chọn 'Lý do khác'.",
    };
  }

  return { isValid: true };
}

export interface CancelSourceInfo {
  label: string;
  cssClass: string;
}

/** Nhãn nguồn hủy hiển thị cho sinh viên/quản trị viên */
export function describeCancelSource(
  booking: Pick<BookingResponse, "cancelSource" | "cancelReason">
): CancelSourceInfo {
  const source = (booking.cancelSource || "").trim().toUpperCase();
  if (source === "STUDENT") return { label: "Sinh viên tự hủy", cssClass: "cancel-student" };
  if (source === "AUTO" || booking.cancelReason?.trim().toUpperCase() === CANCEL_REASON_NO_SHOW) {
    return { label: "Tự động hủy (không nhận phòng)", cssClass: "cancel-auto" };
  }
  if (source === "STAFF") return { label: "Quản trị viên hủy", cssClass: "cancel-staff" };
  return { label: "Đã hủy", cssClass: "cancel-unknown" };
}

/** Nội dung hiển thị lý do hủy (an toàn với đơn cũ chưa có dữ liệu) */
export function describeCancelReason(
  booking: Pick<BookingResponse, "cancelReason" | "cancelReasonDetail">
): string {
  if (!booking.cancelReason || !booking.cancelReason.trim()) {
    return "Chưa có thông tin lý do hủy";
  }
  const label = getCancelReasonLabel(booking.cancelReason);
  const detail = (booking.cancelReasonDetail || "").trim();
  if ((booking.cancelReason || "").trim().toUpperCase() === CANCEL_REASON_NO_SHOW) {
    return "Quá 15 phút không nhận phòng, hệ thống tự động hủy";
  }
  if (!detail) return label;
  if (
    detail.toLowerCase().includes(label.toLowerCase()) ||
    label.toLowerCase().includes(detail.toLowerCase())
  ) {
    return detail;
  }
  return `${label}: ${detail}`;
}

/**
 * Ước lệch đồng hồ giữa server và trình duyệt (ms) dựa trên serverTime của API,
 * dùng để đếm ngược hiển thị bám sát thời gian server hơn.
 */
export function getServerClockOffsetMs(
  windows: Array<CheckInWindow | null | undefined>
): number {
  const first = windows.find((w) => w && w.serverTime);
  if (!first) return 0;
  const serverMs = new Date(first.serverTime as string).getTime();
  if (!Number.isFinite(serverMs)) return 0;
  return serverMs - Date.now();
}

/**
 * Hiển thị tóm tắt thời gian của chi tiết đơn đặt phòng
 */
export function formatDetailTimeRange(detail: BookingDetailItem): string {
  if (detail.startPeriodName && detail.endPeriodName) {
    return `${detail.startPeriodName} → ${detail.endPeriodName}`;
  }
  const s = new Date(detail.startAt);
  const e = new Date(detail.endAt);
  const sStr = s.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const eStr = e.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${sStr} - ${eStr}`;
}

// ── DATE RANGE FILTER HELPERS ────────────────────────────────────────────

export type BookingDatePreset = "today" | "last7" | "month";

export interface BookingDateRange {
  /** ISO date key yyyy-mm-dd */
  from: string;
  /** ISO date key yyyy-mm-dd */
  to: string;
}

/** Chuyển chuỗi dd/mm/yyyy (cho phép 1-2 chữ số ngày/tháng) sang ISO yyyy-mm-dd. */
export function parseDdMmYyyy(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Hiển thị ISO yyyy-mm-dd thành dd/mm/yyyy. */
export function formatDdMmYyyy(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

/** Khoảng ngày cho các nút chọn nhanh, tính theo ngày hôm nay (ISO key). */
export function getBookingDatePresetRange(
  preset: BookingDatePreset,
  todayKey: string
): BookingDateRange {
  const [year, month, day] = todayKey.split("-").map(Number);

  if (preset === "today") {
    return { from: todayKey, to: todayKey };
  }

  if (preset === "last7") {
    return {
      from: toISODateString(new Date(year, month - 1, day - 6)),
      to: todayKey,
    };
  }

  return {
    from: toISODateString(new Date(year, month - 1, 1)),
    to: toISODateString(new Date(year, month, 0)),
  };
}

/** Kiểm tra một ngày (ISO key) có nằm trong khoảng đã chọn hay không. */
export function isIsoDateInRange(
  dateKey: string,
  range: BookingDateRange
): boolean {
  if (!dateKey) return false;
  return dateKey >= range.from && dateKey <= range.to;
}

// ── API CALLS ─────────────────────────────────────────────────────────────

export interface QueryAvailableRoomsParams {
  date: string;
  startPeriodId?: number;
  endPeriodId?: number;
  startTime?: string;
  endTime?: string;
}

export async function fetchAvailableRoomsApi(
  params: QueryAvailableRoomsParams
): Promise<AvailableRoom[]> {
  const query = new URLSearchParams();
  query.set("date", params.date);

  if (params.startPeriodId && params.endPeriodId) {
    query.set("startPeriodId", String(params.startPeriodId));
    query.set("endPeriodId", String(params.endPeriodId));
  } else if (params.startTime && params.endTime) {
    query.set("startTime", params.startTime);
    query.set("endTime", params.endTime);
  }

  const res = await api.get(`/api/Rooms/available?${query.toString()}`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as AvailableRoom[]) : [];
}

export async function createBookingApi(
  payload: CreateBookingPayload
): Promise<BookingResponse> {
  const res = await api.post("/api/Bookings", payload);
  return (res.data?.data ?? res.data) as BookingResponse;
}

export async function fetchMyBookingsApi(): Promise<BookingResponse[]> {
  const res = await api.get("/api/Bookings/my");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as BookingResponse[]) : [];
}

export async function cancelBookingApi(
  bookingId: number,
  payload?: { reason?: string; reasonDetail?: string }
): Promise<boolean> {
  const res = await api.patch(`/api/Bookings/${bookingId}/cancel`, payload ?? {});
  return Boolean(res.data?.success ?? true);
}

/** Nhận phòng (check-in) đơn đã duyệt trong cửa sổ [T - 15 phút, T) */
export async function checkInBookingApi(bookingId: number): Promise<BookingResponse> {
  const res = await api.post(`/api/Bookings/${bookingId}/check-in`);
  return (res.data?.data ?? res.data) as BookingResponse;
}

export interface ApprovalHistoryItem {
  id: number;
  bookingId: number;
  status: number;
  statusName: string;
  comment: string;
  decidedAt: string;
  employeeId?: number;
  employeeName: string;
  employeeCode: string;
  employeePosition: string;
}

/** Lấy lịch sử phê duyệt / từ chối / hủy đơn đặt phòng */
export async function fetchApprovalHistoryApi(bookingId: number): Promise<ApprovalHistoryItem[]> {
  const res = await api.get(`/api/Bookings/${bookingId}/approval-history`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as ApprovalHistoryItem[]) : [];
}
