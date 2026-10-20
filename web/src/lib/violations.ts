import { api } from "./api";

// ── Models & Types ──────────────────────────────────────────────────────────

export interface ViolationTypeItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  severity: number;
  defaultPenalty?: string;
  recordCount: number;
}

export interface ViolationRecordItem {
  id: number;
  code: string;
  incidentTime: string;
  description: string;
  severity: number;
  severityText: string;
  penaltyApplied: string;
  status: string; // "Chờ xử lý" | "Đã xử lý" | "Đã nộp phạt" | "Hủy bỏ"
  userId: number;
  userName: string;
  userFullName: string;
  userCardCode: string;
  userEmail: string;
  userPhoneNumber?: string;
  departmentName?: string;
  usageSessionId?: number;
  roomId?: number;
  roomCode?: string;
  roomName?: string;
  violationTypeId: number;
  violationTypeCode: string;
  violationTypeName: string;
  isRestricted: boolean;
  restrictDays: number;
  restrictionEndAt?: string;
  createdAt: string;
}

export interface UserRestrictionItem {
  id: number;
  userId: number;
  userName: string;
  userFullName: string;
  userCardCode: string;
  userEmail: string;
  departmentName?: string;
  restrictionType: string;
  reason: string;
  startAt: string;
  endAt?: string;
  status: string; // "Hoạt động" | "Đã gỡ" | "Hết hạn"
  isActive: boolean;
  remainingDays?: number;
  createdAt: string;
}

export interface ViolationStats {
  totalRecords: number;
  pendingRecords: number;
  resolvedRecords: number;
  activeRestrictions: number;
  severeRecords: number;
}

export interface RecordViolationPayload {
  userId: number;
  violationTypeId: number;
  usageSessionId?: number;
  incidentTime?: string;
  description: string;
  severity?: number;
  penaltyApplied: string;
  restrictDays?: number;
  status?: string;
}

export interface UpdateViolationPayload {
  status?: string;
  penaltyApplied?: string;
  description?: string;
  severity?: number;
}

export interface GlobalSearchItemRoom {
  id: number;
  name: string;
  roomCode: string;
  building: string;
  floor: string;
  capacity: number;
  status: string;
  roomTypeName?: string;
}

export interface GlobalSearchItemUser {
  id: number;
  userName: string;
  fullName: string;
  cardCode: string;
  email: string;
  phoneNumber?: string;
  role: string;
  status: string;
  departmentName?: string;
  hasActiveRestriction: boolean;
}

export interface GlobalSearchItemBooking {
  id: number;
  activityName: string;
  purpose: string;
  status: string;
  borrowerName: string;
  borrowerCode: string;
  roomsSummary: string;
  requestedAt: string;
}

export interface GlobalSearchItemViolation {
  id: number;
  code: string;
  offenderName: string;
  offenderCode: string;
  violationTypeName: string;
  description: string;
  penaltyApplied: string;
  severity: number;
  status: string;
  incidentTime: string;
}

export interface GlobalSearchResult {
  query: string;
  rooms: GlobalSearchItemRoom[];
  users: GlobalSearchItemUser[];
  bookings: GlobalSearchItemBooking[];
  violations: GlobalSearchItemViolation[];
}

// ── API Helpers ─────────────────────────────────────────────────────────────

export async function fetchViolationTypes(): Promise<ViolationTypeItem[]> {
  const res = await api.get("/api/Violations/types");
  return res.data?.data || res.data || [];
}

export async function createViolationType(data: {
  code: string;
  name: string;
  description?: string;
  severity: number;
  defaultPenalty?: string;
}): Promise<ViolationTypeItem> {
  const res = await api.post("/api/Violations/types", data);
  return res.data?.data || res.data;
}

export async function updateViolationType(
  id: number,
  data: {
    name: string;
    description?: string;
    severity: number;
    defaultPenalty?: string;
  }
): Promise<ViolationTypeItem> {
  const res = await api.put(`/api/Violations/types/${id}`, data);
  return res.data?.data || res.data;
}

export async function deleteViolationType(id: number): Promise<boolean> {
  const res = await api.delete(`/api/Violations/types/${id}`);
  return res.data?.success ?? true;
}

export async function fetchViolations(params?: {
  search?: string;
  violationTypeId?: number;
  userId?: number;
  severity?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ViolationRecordItem[]> {
  const res = await api.get("/api/Violations", { params });
  return res.data?.data || res.data || [];
}

export async function fetchViolationById(id: number): Promise<ViolationRecordItem> {
  const res = await api.get(`/api/Violations/${id}`);
  return res.data?.data || res.data;
}

export async function recordViolation(
  data: RecordViolationPayload
): Promise<ViolationRecordItem> {
  const res = await api.post("/api/Violations", data);
  return res.data?.data || res.data;
}

export async function updateViolation(
  id: number,
  data: UpdateViolationPayload
): Promise<ViolationRecordItem> {
  const res = await api.put(`/api/Violations/${id}`, data);
  return res.data?.data || res.data;
}

export async function deleteViolation(id: number): Promise<boolean> {
  const res = await api.delete(`/api/Violations/${id}`);
  return res.data?.success ?? true;
}

export async function fetchRestrictions(params?: {
  status?: string;
  search?: string;
}): Promise<UserRestrictionItem[]> {
  const res = await api.get("/api/Violations/restrictions", { params });
  return res.data?.data || res.data || [];
}

export async function createRestriction(data: {
  userId: number;
  restrictionType?: string;
  reason: string;
  days: number;
}): Promise<UserRestrictionItem> {
  const res = await api.post("/api/Violations/restrictions", data);
  return res.data?.data || res.data;
}

export async function liftRestriction(
  id: number,
  reason?: string
): Promise<boolean> {
  const res = await api.patch(`/api/Violations/restrictions/${id}/lift`, { reason });
  return res.data?.success ?? true;
}

export interface UserEligibility {
  isEligible: boolean;
  message: string;
  hasActiveRestriction: boolean;
  restrictionType?: string;
  reason?: string;
  startAt?: string;
  endAt?: string;
  remainingDays?: number;
}

export async function checkMyEligibility(): Promise<UserEligibility> {
  const res = await api.get("/api/Violations/my-eligibility");
  return (
    res.data?.data || {
      isEligible: true,
      message: "",
      hasActiveRestriction: false,
    }
  );
}

export async function checkUserEligibility(
  userId: number
): Promise<UserEligibility> {
  const res = await api.get(`/api/Violations/user-eligibility/${userId}`);
  return (
    res.data?.data || {
      isEligible: true,
      message: "",
      hasActiveRestriction: false,
    }
  );
}

export async function fetchViolationStats(): Promise<ViolationStats> {
  const res = await api.get("/api/Violations/stats");
  return (
    res.data?.data || {
      totalRecords: 0,
      pendingRecords: 0,
      resolvedRecords: 0,
      activeRestrictions: 0,
      severeRecords: 0,
    }
  );
}

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const res = await api.get("/api/Violations/global-search", {
    params: { query },
  });
  return (
    res.data?.data || {
      query,
      rooms: [],
      users: [],
      bookings: [],
      violations: [],
    }
  );
}
