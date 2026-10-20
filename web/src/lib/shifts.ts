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
