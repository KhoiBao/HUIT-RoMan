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
}

export interface ResolveIncidentPayload {
  technicianNote?: string;
  repairCost?: number;
  resolvedBy?: string;
}

export interface IncidentStats {
  total: number;
  pending: number;
  inMaintenance: number;
  resolved: number;
  urgent: number;
}

const STORAGE_KEY = "huit_incident_reports";

export const DEFAULT_INCIDENTS: IncidentReportItem[] = [
  {
    id: "INC-20261102-001",
    code: "#SC-20261102-001",
    targetType: "Phòng",
    roomCode: "B202",
    roomName: "Phòng học nhóm B202 (Tầng 2 Nhà B)",
    equipmentName: "Máy chiếu Sony & Dây cáp tín hiệu HDMI",
    category: "Thiết bị hư hỏng",
    severity: "Khẩn cấp",
    description: "Máy chiếu không lên nguồn và dây cáp HDMI bị lỏng cổng truyền tín hiệu khi thủ thư kiểm tra nhận bàn giao trả phòng.",
    status: "Chờ tiếp nhận",
    reportedAt: "2026-11-02T11:45:00.000Z",
    reportedBy: "Thủ thư trực ca (Biên bản trả phòng)",
    createdAt: "2026-11-02T11:45:00.000Z",
    updatedAt: "2026-11-02T12:00:00.000Z",
  },
  {
    id: "INC-20261101-002",
    code: "#SC-20261101-002",
    targetType: "Phòng",
    roomCode: "A102",
    roomName: "Phòng chuyên đề A102 (Tầng 1 Nhà A)",
    equipmentName: "Điều hòa Daikin Inverter 2HP",
    category: "Điện / Chiếu sáng / Điều hòa",
    severity: "Trung bình",
    description: "Điều hòa phòng A102 nhỏ giọt nước xuống sàn và làm mát rất chậm sau 30 phút bật.",
    status: "Chờ tiếp nhận",
    reportedAt: "2026-11-01T14:20:00.000Z",
    reportedBy: "Nguyễn Văn An (200123456)",
    reporterPhone: "0912345678",
    createdAt: "2026-11-01T14:20:00.000Z",
    updatedAt: "2026-11-01T14:20:00.000Z",
  },
  {
    id: "INC-20261028-003",
    code: "#SC-20261028-003",
    targetType: "Thiết bị",
    roomCode: "TV01",
    roomName: "Phòng học nhóm TV01 (Thư viện)",
    equipmentName: "Bàn họp nhóm & Ghế xoay văn phòng",
    category: "Cơ sở vật chất / Bàn ghế",
    severity: "Nhẹ",
    description: "Chân ghế xoay bị lỏng bu-lông, phát tiếng kêu cọt kẹt khi ngồi và bánh xe bị kẹt rác.",
    status: "Đã khắc phục",
    reportedAt: "2026-10-28T09:15:00.000Z",
    reportedBy: "Lê Thị Bích (Thủ thư ca sáng)",
    assignedTechnician: "KTV. Trần Văn Đức",
    technicianNote: "Đã siết lại toàn bộ bu-lông, vệ sinh trục bánh xe và tra dầu bôi trơn chuyên dụng.",
    repairCost: 0,
    resolvedAt: "2026-10-29T10:00:00.000Z",
    resolvedBy: "KTV. Trần Văn Đức",
    createdAt: "2026-10-28T09:15:00.000Z",
    updatedAt: "2026-10-29T10:00:00.000Z",
  },
];

export function getAllIncidents(): IncidentReportItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) {
      const cloned = JSON.parse(JSON.stringify(DEFAULT_INCIDENTS));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloned));
      return cloned;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return [];
      }
      // Tự động đồng bộ sự cố B202 về "Chờ tiếp nhận" nếu browser đang lưu "Đang bảo trì"
      let hasUpdate = false;
      const normalized = parsed.map((item: IncidentReportItem) => {
        if (item.id === "INC-20261102-001" && item.roomCode === "B202" && item.status === "Đang bảo trì") {
          hasUpdate = true;
          return {
            ...item,
            status: "Chờ tiếp nhận" as IncidentStatus,
            assignedTechnician: undefined,
            technicianNote: undefined,
            repairCost: undefined,
          };
        }
        return item;
      });
      if (hasUpdate) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveIncidents(items: IncidentReportItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save incidents to localStorage:", e);
  }
}

export function getIncidentById(idOrCode: string): IncidentReportItem | undefined {
  const list = getAllIncidents();
  return list.find(
    (item) =>
      item.id.toLowerCase() === idOrCode.toLowerCase() ||
      item.code.toLowerCase() === idOrCode.toLowerCase()
  );
}

export function getIncidentsByRoom(roomCode: string): IncidentReportItem[] {
  const list = getAllIncidents();
  return list.filter(
    (item) => item.roomCode.toLowerCase() === roomCode.toLowerCase()
  );
}

export function createIncident(payload: CreateIncidentPayload): IncidentReportItem {
  const list = getAllIncidents();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = list.filter((item) => item.id.includes(dateStr)).length + 1;
  const seq = String(countToday).padStart(3, "0");
  const id = `INC-${dateStr}-${seq}`;
  const code = `#SC-${dateStr}-${seq}`;

  const now = new Date().toISOString();
  const newItem: IncidentReportItem = {
    id,
    code,
    targetType: payload.targetType || "Phòng",
    roomId: payload.roomId,
    roomCode: payload.roomCode.trim().toUpperCase(),
    roomName: payload.roomName || `Phòng ${payload.roomCode.trim().toUpperCase()}`,
    equipmentId: payload.equipmentId,
    equipmentName: payload.equipmentName,
    category: payload.category || "Thiết bị hư hỏng",
    severity: payload.severity || "Khẩn cấp",
    description: payload.description.trim(),
    status: payload.status || "Chờ tiếp nhận",
    reportedAt: now,
    reportedBy: payload.reportedBy || "Thủ thư trực ca",
    reporterPhone: payload.reporterPhone,
    sessionId: payload.sessionId,
    assignedTechnician: payload.assignedTechnician,
    technicianNote: payload.technicianNote,
    createdAt: now,
    updatedAt: now,
  };

  const updatedList = [newItem, ...list];
  saveIncidents(updatedList);
  return newItem;
}

export function updateIncident(
  id: string,
  updates: UpdateIncidentPayload
): IncidentReportItem | null {
  const list = getAllIncidents();
  const idx = list.findIndex((item) => item.id === id || item.code === id);
  if (idx === -1) return null;

  const current = list[idx];
  const now = new Date().toISOString();
  const updatedItem: IncidentReportItem = {
    ...current,
    ...updates,
    updatedAt: now,
  };

  if (updates.status === "Đã khắc phục" && !updatedItem.resolvedAt) {
    updatedItem.resolvedAt = now;
  }

  list[idx] = updatedItem;
  saveIncidents(list);
  return updatedItem;
}

export function resolveIncident(
  id: string,
  payload: ResolveIncidentPayload
): IncidentReportItem | null {
  return updateIncident(id, {
    status: "Đã khắc phục",
    technicianNote: payload.technicianNote,
    repairCost: payload.repairCost,
    resolvedBy: payload.resolvedBy || "Kỹ thuật viên Thư viện",
    resolvedAt: new Date().toISOString(),
  });
}

export function deleteIncident(id: string): boolean {
  const list = getAllIncidents();
  const filtered = list.filter((item) => item.id !== id && item.code !== id);
  if (filtered.length !== list.length) {
    saveIncidents(filtered);
    return true;
  }
  return false;
}

export function resetToDefaultIncidents(): IncidentReportItem[] {
  const cloned = JSON.parse(JSON.stringify(DEFAULT_INCIDENTS));
  saveIncidents(cloned);
  return cloned;
}

export function getIncidentStats(): IncidentStats {
  const list = getAllIncidents();
  return {
    total: list.length,
    pending: list.filter((i) => i.status === "Chờ tiếp nhận").length,
    inMaintenance: list.filter((i) => i.status === "Đang bảo trì").length,
    resolved: list.filter((i) => i.status === "Đã khắc phục").length,
    urgent: list.filter(
      (i) => i.severity === "Khẩn cấp" && i.status !== "Đã khắc phục" && i.status !== "Hủy bỏ"
    ).length,
  };
}

/**
 * Calls backend API to restore a room from "Bảo trì" back to "Trống" (Sẵn sàng hoạt động)
 */
export async function restoreRoomToAvailable(
  roomId?: number,
  roomCode?: string
): Promise<{ success: boolean; message: string }> {
  try {
    let targetRoomId = roomId;

    // If roomId is not provided, look up by roomCode
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

    // Call patch status API
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
