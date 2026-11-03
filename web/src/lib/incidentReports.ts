import { api } from "./api";

/** Trạng thái phiếu báo cáo sự cố / hư hỏng thiết bị. */
export type IncidentReportStatus = "Mới" | "Đang xử lý" | "Đã xử lý";

export interface IncidentReportItem {
  id: number;
  roomId: number;
  roomName: string;
  roomCode: string;
  bookingDetailId?: number | null;
  title: string;
  description: string;
  status: IncidentReportStatus;
  staffNote: string;
  reportedByUserId: number;
  reportedByName?: string;
  reportedByCode?: string | null;
  reportedAt: string;
  resolvedByUserId?: number | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
}

export interface CreateIncidentReportPayload {
  roomId: number;
  /** Gắn với lần sử dụng phòng cụ thể (nếu có). */
  bookingDetailId?: number | null;
  title: string;
  description: string;
}

/** Người dùng bào sự cố / hư hỏng thiết bị cho nhân viên phụ trách. */
export async function createIncidentReportApi(
  payload: CreateIncidentReportPayload
): Promise<IncidentReportItem> {
  const res = await api.post("/api/IncidentReports", payload);
  return (res.data?.data ?? res.data) as IncidentReportItem;
}

/** Danh sách báo cáo sự cố của người dùng hiện tại. */
export async function fetchMyIncidentReportsApi(): Promise<IncidentReportItem[]> {
  const res = await api.get("/api/IncidentReports/my");
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? (data as IncidentReportItem[]) : [];
}

export function getIncidentStatusLabel(status: string): string {
  if (status === "Đang xử lý") return "Đang xử lý";
  if (status === "Đã xử lý") return "Đã xử lý";
  return "Mới";
}

/** Các lựa chọn "hiện tượng gặp phải" khi báo sự cố (dùng làm Title của phiếu). */
export const INCIDENT_TITLE_OPTIONS: string[] = [
  "Máy chiếu / màn hình không hoạt động",
  "Thiết bị điện, ổ cắm, đèn hư hỏng",
  "Bàn ghế hư hỏng",
  "Mất hoặc thiếu vật dụng trong phòng",
  "Sự cố khác",
];

