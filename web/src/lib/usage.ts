import { api } from "./api";

export interface UsageSessionItem {
  id: number;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  status: string; // "Chờ nhận phòng" | "Đang sử dụng" | "Hoàn thành" | "Đã hủy"
  confirmationCode: string;
  createdAt: string;

  userId: number;
  userName: string;
  userFullName: string;
  userEmail: string;
  userPhone?: string | null;
  userCardCode?: string | null;

  bookingDetailId: number;
  bookingId: number;
  activityName: string;
  purpose: string;
  guestCount: number;
  actualGuestCount?: number | null;

  roomId: number;
  roomName: string;
  roomCode: string;
  building: string;
  floor: string;
  roomStatus: string;

  startAt: string;
  endAt: string;
  startPeriodId?: number | null;
  startPeriodName?: string | null;
  endPeriodId?: number | null;
  endPeriodName?: string | null;

  staffNote?: string | null;
}

export interface UsageSummary {
  totalToday: number;
  inUseCount: number;
  pendingCheckInCount: number;
  completedCount: number;
  cancelledCount: number;
}

export interface CheckInPayload {
  usageSessionId?: number;
  bookingDetailId?: number;
  confirmationCode?: string;
  actualCheckIn?: string;
  actualGuestCount?: number;
  staffNote?: string;
}

export interface CheckOutPayload {
  usageSessionId?: number;
  bookingDetailId?: number;
  actualCheckOut?: string;
  roomCondition: "Trống" | "Bảo trì";
  staffNote?: string;
  devicesOk: boolean;
  cleaned: boolean;
  lightsOff: boolean;
}

export interface UsageFilterParams {
  status?: string;
  roomId?: number;
  date?: string;
  search?: string;
}

// ── API FUNCTIONS ─────────────────────────────────────────────────────────────

export async function fetchUsageSessions(
  params?: UsageFilterParams
): Promise<UsageSessionItem[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL") query.set("status", params.status);
  if (params?.roomId) query.set("roomId", String(params.roomId));
  if (params?.date) query.set("date", params.date);
  if (params?.search?.trim()) query.set("search", params.search.trim());

  const res = await api.get(`/api/UsageSessions?${query.toString()}`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as UsageSessionItem[]) : [];
}

export async function fetchActiveSessions(): Promise<UsageSessionItem[]> {
  const res = await api.get("/api/UsageSessions/active");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as UsageSessionItem[]) : [];
}

export async function fetchUsageSummary(): Promise<UsageSummary> {
  const res = await api.get("/api/UsageSessions/summary");
  const data = res.data?.data ?? res.data;
  return (
    data ?? {
      totalToday: 0,
      inUseCount: 0,
      pendingCheckInCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    }
  );
}

export async function fetchMyUsageSessions(): Promise<UsageSessionItem[]> {
  const res = await api.get("/api/UsageSessions/my");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as UsageSessionItem[]) : [];
}

export async function fetchSessionById(id: number): Promise<UsageSessionItem> {
  const res = await api.get(`/api/UsageSessions/${id}`);
  return (res.data?.data ?? res.data) as UsageSessionItem;
}

export async function fetchSessionByCode(code: string): Promise<UsageSessionItem> {
  const res = await api.get(`/api/UsageSessions/code/${encodeURIComponent(code)}`);
  return (res.data?.data ?? res.data) as UsageSessionItem;
}

export async function checkInSession(payload: CheckInPayload): Promise<UsageSessionItem> {
  const res = await api.post("/api/UsageSessions/check-in", payload);
  return (res.data?.data ?? res.data) as UsageSessionItem;
}

export async function checkOutSession(payload: CheckOutPayload): Promise<UsageSessionItem> {
  const res = await api.post("/api/UsageSessions/check-out", payload);
  return (res.data?.data ?? res.data) as UsageSessionItem;
}

export interface ExtendSessionPayload {
  usageSessionId: number;
  newEndAt?: string;
  newEndPeriodId?: number;
  staffNote?: string;
}

/** Gia hạn thời gian sử dụng phòng khi phiên đang "Đang sử dụng" (backend tự chặn trùng lịch tiếp theo). */
export async function extendSession(payload: ExtendSessionPayload): Promise<UsageSessionItem> {
  const { usageSessionId, ...body } = payload;
  const res = await api.post(`/api/UsageSessions/${usageSessionId}/extend`, body);
  return (res.data?.data ?? res.data) as UsageSessionItem;
}

export async function cancelNoShow(
  id: number,
  reason?: string
): Promise<boolean> {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  const res = await api.patch(`/api/UsageSessions/${id}/no-show${query}`);
  return Boolean(res.data?.success ?? true);
}

/**
 * Đánh giá điều kiện nhận phòng (check-in) theo quy định của hệ thống:
 * - Trạng thái phiên phải là "Chờ nhận phòng".
 * - Chỉ được nhận phòng từ 15 phút trước giờ bắt đầu (T - 15 phút) đến trước khi ca mượn kết thúc (EndAt).
 * - Trước T - 15 phút: Chưa đến giờ mở nhận phòng.
 * - Sau EndAt: Đã quá giờ kết thúc của ca mượn phòng.
 */
export interface CheckInStatusResult {
  allowed: boolean;
  reason?: string;
  isTooEarly?: boolean;
  isExpired?: boolean;
}

export function getCheckInStatus(session: Partial<UsageSessionItem>, now: Date = new Date()): CheckInStatusResult {
  if (session.status !== "Chờ nhận phòng") {
    return { allowed: false, reason: "Phiên không ở trạng thái chờ nhận phòng." };
  }
  if (!session.startAt || !session.endAt) {
    return { allowed: true };
  }
  const start = new Date(session.startAt).getTime();
  const end = new Date(session.endAt).getTime();
  if (isNaN(start) || isNaN(end)) {
    return { allowed: true };
  }
  const currentTime = now.getTime();
  const openTime = start - 15 * 60 * 1000; // 15 phút trước giờ bắt đầu

  if (currentTime < openTime) {
    return {
      allowed: false,
      isTooEarly: true,
      reason: "Chưa đến thời điểm nhận phòng theo quy định (chỉ được check-in trước giờ bắt đầu tối đa 15 phút).",
    };
  }

  if (currentTime > end) {
    return {
      allowed: false,
      isExpired: true,
      reason: "Đã quá thời gian ca mượn phòng kết thúc theo lịch, không thể nhận phòng.",
    };
  }

  return { allowed: true };
}
