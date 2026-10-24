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

  return Array.from(groups.values()).map((group) => ({
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

export async function cancelBookingApi(bookingId: number): Promise<boolean> {
  const res = await api.patch(`/api/Bookings/${bookingId}/cancel`);
  return Boolean(res.data?.success ?? true);
}
