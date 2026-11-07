import { api } from "./api";

export type IncidentTargetType = "Phòng" | "Thiết bị";

export type IncidentCategory =
  | "Thiết bị hư hỏng"
  | "Điện / Chiếu sáng / Điều hòa"
  | "Cơ sở vật chất / Bàn ghế"
  | "Vệ sinh sâu"
  | "Khác";

export type IncidentSeverity = "Khẩn cấp" | "Trung bình" | "Nhẹ";

export type IncidentStatus =
  | "Chờ tiếp nhận"
  | "Đang bảo trì"
  | "Đã khắc phục"
  | "Hủy bỏ";

export interface IncidentReportItem {
  id: string;
  code: string;
  targetType: IncidentTargetType;
  roomId?: number;
  roomCode: string;
  roomName?: string;
  equipmentId?: number;
  equipmentName?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  reportedAt: string;
  reportedBy: string;
  reporterPhone?: string;
  sessionId?: number;
  assignedTechnician?: string;
  technicianNote?: string;
  repairCost?: number;
  resolvedAt?: string;
  resolvedBy?: string;
  staffNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentPayload {
  targetType?: IncidentTargetType;
  roomId?: number;
  roomCode: string;
  roomName?: string;
  equipmentId?: number;
  equipmentName?: string;
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  description: string;
  status?: IncidentStatus;
  reportedBy?: string;
  reporterPhone?: string;
  sessionId?: number;
  assignedTechnician?: string;
  technicianNote?: string;
  setRoomMaintenance?: boolean;
}

export interface UpdateIncidentPayload {
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  description?: string;
  status?: IncidentStatus;
  equipmentName?: string;
  assignedTechnician?: string;
  technicianNote?: string;
  repairCost?: number;
  resolvedAt?: string;
  resolvedBy?: string;
  staffNote?: string;
  restoreRoomToAvailable?: boolean;
}

export interface ResolveIncidentPayload {
  technicianNote?: string;
  repairCost?: number;
  resolvedBy?: string;
  restoreRoomToAvailable?: boolean;
}

export interface IncidentStats {
  total: number;
  pending: number;
  inMaintenance: number;
  resolved: number;
  urgent: number;
}

export interface IncidentFilters {
  status?: string;
  category?: string;
  severity?: string;
  roomCode?: string;
  keyword?: string;
}

function parseNumericId(id: string | number): number {
  if (typeof id === "number") return id;
  const parsed = parseInt(id, 10);
  if (!isNaN(parsed) && String(parsed) === id) return parsed;
  const match = id.match(/\d+$/);
  if (match) return parseInt(match[0], 10);
  return 0;
}

export function mapDtoToIncidentItem(dto: any): IncidentReportItem {
  return {
    id: String(dto.id ?? ""),
    code: dto.code || `#SC-${dto.id}`,
    targetType: (dto.targetType as IncidentTargetType) || "Phòng",
    roomId: dto.roomId ?? undefined,
    roomCode: dto.roomCode || "",
    roomName: dto.roomName || (dto.roomCode ? `Phòng ${dto.roomCode}` : ""),
    equipmentId: dto.equipmentId ?? undefined,
    equipmentName: dto.equipmentName || undefined,
    category: (dto.category as IncidentCategory) || "Thiết bị hư hỏng",
    severity: (dto.severity as IncidentSeverity) || "Khẩn cấp",
    description: dto.description || dto.title || "",
    status: (dto.status as IncidentStatus) || "Chờ tiếp nhận",
    reportedAt: dto.reportedAt || dto.createdAt || new Date().toISOString(),
    reportedBy: dto.reportedByName || dto.reportedBy || "Thủ thư trực ca",
    reporterPhone: dto.reporterPhone || undefined,
    sessionId: dto.sessionId || dto.bookingDetailId || undefined,
    assignedTechnician: dto.assignedTechnician || undefined,
    technicianNote: dto.technicianNote || undefined,
    repairCost:
      dto.repairCost !== null && dto.repairCost !== undefined
        ? Number(dto.repairCost)
        : undefined,
    resolvedAt: dto.resolvedAt || undefined,
    resolvedBy: dto.resolvedByName || undefined,
    staffNote: dto.staffNote || undefined,
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || dto.createdAt || new Date().toISOString(),
  };
}

/**
 * Lấy danh sách báo cáo sự cố & lịch sử bảo trì từ database PostgreSQL.
 */
export async function fetchIncidents(
  filters?: IncidentFilters
): Promise<IncidentReportItem[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.status && filters.status !== "ALL") params.status = filters.status;
    if (filters?.category && filters.category !== "ALL") params.category = filters.category;
    if (filters?.severity && filters.severity !== "ALL") params.severity = filters.severity;
    if (filters?.roomCode && filters.roomCode !== "ALL") params.roomCode = filters.roomCode;
    if (filters?.keyword && filters.keyword.trim()) params.keyword = filters.keyword.trim();

    const res = await api.get("/api/IncidentReports", { params });
    const rawList = res.data?.data || res.data || [];
    if (!Array.isArray(rawList)) return [];
    return rawList.map(mapDtoToIncidentItem);
  } catch (error) {
    console.error("fetchIncidents error:", error);
    return [];
  }
}

/**
 * Tương thích ngược: lấy danh sách toàn bộ sự cố từ database PostgreSQL
 */
export async function getAllIncidents(
  filters?: IncidentFilters
): Promise<IncidentReportItem[]> {
  return fetchIncidents(filters);
}

/**
 * Thống kê các chỉ số KPI sự cố từ database PostgreSQL
 */
export async function fetchIncidentStats(): Promise<IncidentStats> {
  try {
    const res = await api.get("/api/IncidentReports/stats");
    const data = res.data?.data || res.data || {};
    return {
      total: Number(data.total ?? 0),
      pending: Number(data.pending ?? 0),
      inMaintenance: Number(data.inMaintenance ?? 0),
      resolved: Number(data.resolved ?? 0),
      urgent: Number(data.urgent ?? 0),
    };
  } catch (error) {
    console.error("fetchIncidentStats error:", error);
    return { total: 0, pending: 0, inMaintenance: 0, resolved: 0, urgent: 0 };
  }
}

/**
 * Tương thích ngược: thống kê sự cố từ database
 */
export async function getIncidentStats(): Promise<IncidentStats> {
  return fetchIncidentStats();
}

/**
 * Lấy chi tiết một phiếu sự cố theo ID
 */
export async function fetchIncidentById(
  id: string | number
): Promise<IncidentReportItem | null> {
  try {
    const numericId = parseNumericId(id);
    const res = await api.get(`/api/IncidentReports/${numericId}`);
    const data = res.data?.data || res.data;
    if (!data) return null;
    return mapDtoToIncidentItem(data);
  } catch (error) {
    console.error(`fetchIncidentById(${id}) error:`, error);
    return null;
  }
}

export async function getIncidentById(
  id: string | number
): Promise<IncidentReportItem | null> {
  return fetchIncidentById(id);
}

/**
 * Lấy danh sách sự cố theo mã phòng
 */
export async function getIncidentsByRoom(
  roomCode: string
): Promise<IncidentReportItem[]> {
  return fetchIncidents({ roomCode });
}

/**
 * Tạo mới phiếu báo sự cố vào database PostgreSQL
 */
export async function createIncident(
  payload: CreateIncidentPayload
): Promise<IncidentReportItem> {
  const body = {
    targetType: payload.targetType || "Phòng",
    roomId: payload.roomId,
    roomCode: payload.roomCode.trim().toUpperCase(),
    bookingDetailId: payload.sessionId,
    equipmentId: payload.equipmentId,
    equipmentName: payload.equipmentName,
    title: payload.description.trim().slice(0, 100),
    category: payload.category || "Thiết bị hư hỏng",
    severity: payload.severity || "Khẩn cấp",
    description: payload.description.trim(),
    status: payload.status || "Chờ tiếp nhận",
    reportedBy: payload.reportedBy || "Thủ thư trực ca",
    reporterPhone: payload.reporterPhone,
    assignedTechnician: payload.assignedTechnician,
    technicianNote: payload.technicianNote,
    setRoomMaintenance: payload.setRoomMaintenance ?? true,
  };

  const res = await api.post("/api/IncidentReports", body);
  const data = res.data?.data || res.data;
  return mapDtoToIncidentItem(data);
}

/**
 * Cập nhật thông tin phiếu sự cố trên database PostgreSQL
 */
export async function updateIncident(
  id: string | number,
  updates: UpdateIncidentPayload
): Promise<IncidentReportItem | null> {
  const numericId = parseNumericId(id);
  const body = {
    category: updates.category,
    severity: updates.severity,
    description: updates.description,
    status: updates.status,
    equipmentName: updates.equipmentName,
    assignedTechnician: updates.assignedTechnician,
    technicianNote: updates.technicianNote,
    repairCost: updates.repairCost,
    resolvedBy: updates.resolvedBy,
    staffNote: updates.staffNote,
    restoreRoomToAvailable: updates.restoreRoomToAvailable,
  };

  const res = await api.put(`/api/IncidentReports/${numericId}`, body);
  const data = res.data?.data || res.data;
  if (!data) return null;
  return mapDtoToIncidentItem(data);
}

/**
 * Giải quyết và hoàn tất sự cố trên database PostgreSQL
 */
export async function resolveIncident(
  id: string | number,
  payload: ResolveIncidentPayload
): Promise<IncidentReportItem | null> {
  const numericId = parseNumericId(id);
  const body = {
    technicianNote: payload.technicianNote,
    repairCost: payload.repairCost,
    resolvedBy: payload.resolvedBy || "Kỹ thuật viên Thư viện",
    restoreRoomToAvailable: payload.restoreRoomToAvailable ?? true,
  };

  const res = await api.post(`/api/IncidentReports/${numericId}/resolve`, body);
  const data = res.data?.data || res.data;
  if (!data) return null;
  return mapDtoToIncidentItem(data);
}

/**
 * Xóa phiếu sự cố khỏi database PostgreSQL (soft delete)
 */
export async function deleteIncident(id: string | number): Promise<boolean> {
  try {
    const numericId = parseNumericId(id);
    const res = await api.delete(`/api/IncidentReports/${numericId}`);
    return res.status === 200 || res.status === 204;
  } catch (error) {
    console.error(`deleteIncident(${id}) error:`, error);
    return false;
  }
}

/**
 * Khôi phục phòng từ "Bảo trì" về "Trống" (Sẵn sàng phục vụ)
 */
export async function restoreRoomToAvailable(
  roomId?: number,
  roomCode?: string
): Promise<{ success: boolean; message: string }> {
  try {
    let targetRoomId = roomId;

    if (!targetRoomId && roomCode) {
      try {
        const res = await api.get(`/api/Rooms?keyword=${encodeURIComponent(roomCode)}`);
        const rooms = res.data?.data || res.data || [];
        const match = Array.isArray(rooms)
          ? rooms.find((r: any) => r.roomCode?.toLowerCase() === roomCode.toLowerCase())
          : null;
        if (match?.id) {
          targetRoomId = match.id;
        }
      } catch {
        // Fallback ignore error
      }
    }

    if (!targetRoomId) {
      return {
        success: false,
        message: `Không tìm thấy ID phòng tương ứng cho mã ${roomCode || "N/A"}.`,
      };
    }

    await api.patch(`/api/Rooms/${targetRoomId}/status`, {
      status: "Trống",
      reason: "Đã hoàn tất bảo trì / khắc phục sự cố kỹ thuật.",
    });

    return {
      success: true,
      message: `Đã mở lại phòng ${roomCode || targetRoomId} sang trạng thái Sẵn sàng phục vụ!`,
    };
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.message ||
      "Không thể cập nhật trạng thái phòng qua máy chủ, vui lòng thử lại.";
    return {
      success: false,
      message: errorMsg,
    };
  }
}
