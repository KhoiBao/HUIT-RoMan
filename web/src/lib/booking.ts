import { api } from "./api";
import type { Period } from "./schedule";

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

/**
 * Validate form nhập liệu đặt phòng
 */
export function validateBookingForm(
  form: BookingFormState,
  selectedRoomIds: number[]
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!form.activityName || form.activityName.trim().length < 3) {
    errors.activityName = "Tên hoạt động phải từ 3 ký tự trở lên.";
  }

  if (!form.purpose || form.purpose.trim().length < 3) {
    errors.purpose = "Vui lòng nhập mục đích sử dụng phòng.";
  }

  if (!form.guestCount || form.guestCount < 1) {
    errors.guestCount = "Số lượng người tham gia phải lớn hơn 0.";
  }

  if (!form.date) {
    errors.date = "Vui lòng chọn ngày sử dụng phòng.";
  } else {
    const todayStr = new Date().toISOString().split("T")[0];
    if (form.date < todayStr) {
      errors.date = "Không thể đặt phòng cho ngày trong quá khứ.";
    }
  }

  if (form.bookingMode === "period") {
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
  } else {
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
